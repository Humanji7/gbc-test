import { supabaseAdminFetch } from "@/lib/supabase/server";
import {
  buildDashboardSnapshot,
  type DashboardAttentionItem,
  type DashboardNotificationCounts,
  type DashboardNotificationEvent,
  type DashboardOperationsSnapshot,
  type DashboardOrderRow,
  type DashboardSnapshot
} from "./dashboard-snapshot";

const RETAILCRM_SUPABASE_SYNC_NAME = "retailcrm_to_supabase_orders";
const RECENT_NOTIFICATION_EVENTS_LIMIT = 5;

type SyncStateDashboardRow = Readonly<{
  sync_name: string;
  last_cursor: string | null;
  last_synced_at_source: string | null;
  last_success_at: string | null;
  last_error_at: string | null;
  last_error_message: string | null;
}>;

type NotificationLogDashboardStatus = "sending" | "sent" | "failed" | "delivery_unknown";

type NotificationLogDashboardRow = Readonly<{
  order_id: string;
  status: NotificationLogDashboardStatus;
  error_message: string | null;
  updated_at: string;
  sent_at: string | null;
}>;

type NotificationOrderLookupRow = Readonly<{
  id: string;
  external_id: string;
  order_number: string | null;
  status: string;
  total_amount: number | string;
  currency: string | null;
}>;

function buildSupabaseInFilter(values: string[]): string {
  return `in.(${values.map((value) => `"${value.replaceAll("\\", "\\\\").replaceAll('"', '\\"')}"`).join(",")})`;
}

function toAmount(value: number | string): number {
  if (typeof value === "number") {
    return value;
  }

  const parsed = Number(value);

  return Number.isFinite(parsed) ? parsed : 0;
}

function compareIsoMoments(left: string | null, right: string | null): number {
  if (!left && !right) {
    return 0;
  }

  if (!left) {
    return 1;
  }

  if (!right) {
    return -1;
  }

  return right.localeCompare(left);
}

function getLatestAlertActivity(
  notifications: NotificationLogDashboardRow[]
): string | null {
  const timestamps = notifications
    .map((notification) => notification.sent_at ?? notification.updated_at)
    .filter((value): value is string => Boolean(value));

  return timestamps.sort((left, right) => right.localeCompare(left))[0] ?? null;
}

function buildNotificationCounts(
  notifications: NotificationLogDashboardRow[]
): DashboardNotificationCounts {
  return notifications.reduce<DashboardNotificationCounts>(
    (counts, notification) => {
      if (notification.status === "sending") {
        return {
          ...counts,
          sending: counts.sending + 1
        };
      }

      if (notification.status === "sent") {
        return {
          ...counts,
          sent: counts.sent + 1
        };
      }

      if (notification.status === "failed") {
        return {
          ...counts,
          failed: counts.failed + 1
        };
      }

      return {
        ...counts,
        deliveryUnknown: counts.deliveryUnknown + 1
      };
    },
    {
      sending: 0,
      sent: 0,
      failed: 0,
      deliveryUnknown: 0
    }
  );
}

function buildAttentionItems(
  syncState: SyncStateDashboardRow | null,
  notificationCounts: DashboardNotificationCounts
): DashboardAttentionItem[] {
  const items: DashboardAttentionItem[] = [];

  if (!syncState?.last_success_at) {
    items.push({
      severity: "critical",
      title: "Последний успешный sync не подтверждён",
      detail: "На дашборде нет подтверждённой отметки о полном успешном прогоне синхронизации.",
      action: "Проверить sync runner и прогнать безопасную сверку источника с Supabase."
    });
  }

  if (syncState?.last_error_at && compareIsoMoments(syncState.last_error_at, syncState.last_success_at) < 0) {
    items.push({
      severity: "critical",
      title: "В sync_state зафиксирована более свежая ошибка, чем успех",
      detail: syncState.last_error_message ?? "Последний sync завершился ошибкой без подробного сообщения.",
      action: "Разобрать последний сбой синка до следующего business run."
    });
  }

  if (syncState?.last_cursor) {
    items.push({
      severity: "warning",
      title: "Есть незавершённый sync",
      detail: `В sync_state остался активный cursor: ${syncState.last_cursor}.`,
      action: "Проверить, был ли run прерван, и выполнить безопасный rerun."
    });
  }

  if (notificationCounts.deliveryUnknown > 0) {
    items.push({
      severity: "critical",
      title: "Есть Telegram-алерты со статусом delivery_unknown",
      detail: `Таких записей сейчас: ${notificationCounts.deliveryUnknown}. Автоматический retry остановлен специально, чтобы не дублировать сообщения.`,
      action: "Провести ручную проверку доставки и только потом принимать решение о повторной отправке."
    });
  }

  if (notificationCounts.failed > 0) {
    items.push({
      severity: "warning",
      title: "Есть алерты со статусом failed",
      detail: `Таких записей сейчас: ${notificationCounts.failed}. Они готовы к аккуратному повторному прогону.`,
      action: "Проверить причину fail и затем запускать повторную отправку."
    });
  }

  if (notificationCounts.sending > 0) {
    items.push({
      severity: "warning",
      title: "Есть алерты в обработке",
      detail: `Со статусом sending сейчас: ${notificationCounts.sending}. Это может быть нормой во время активного run.`,
      action: "Если статус завис надолго, проверить claim timeout и историю run."
    });
  }

  if (items.length === 0) {
    items.push({
      severity: "ok",
      title: "Явных операционных тревог не найдено",
      detail: "Последний доступный срез не показывает незавершённый sync или проблемные alert-статусы.",
      action: "Можно использовать dashboard как спокойный ежедневный контрольный срез."
    });
  }

  return items;
}

function resolveSyncStatus(
  attentionItems: DashboardAttentionItem[]
): Pick<DashboardOperationsSnapshot, "syncStatus" | "syncStatusLabel"> {
  if (attentionItems.some((item) => item.severity === "critical")) {
    return {
      syncStatus: "critical",
      syncStatusLabel: "Требует ручной проверки"
    };
  }

  if (attentionItems.some((item) => item.severity === "warning")) {
    return {
      syncStatus: "warning",
      syncStatusLabel: "Есть сигналы внимания"
    };
  }

  return {
    syncStatus: "healthy",
    syncStatusLabel: "Срез выглядит стабильным"
  };
}

function buildRecentNotificationEvents(
  notifications: NotificationLogDashboardRow[],
  ordersById: Map<string, NotificationOrderLookupRow>,
  fallbackCurrency: string
): DashboardNotificationEvent[] {
  return notifications
    .slice()
    .sort((left, right) =>
      (right.sent_at ?? right.updated_at).localeCompare(left.sent_at ?? left.updated_at)
    )
    .slice(0, RECENT_NOTIFICATION_EVENTS_LIMIT)
    .map((notification) => {
      const order = ordersById.get(notification.order_id);

      return {
        orderExternalId: order?.external_id ?? notification.order_id,
        orderNumber: order?.order_number?.trim() || order?.external_id || notification.order_id,
        orderStatus: order?.status ?? "unknown",
        totalAmount: order ? toAmount(order.total_amount) : 0,
        currency: order?.currency?.trim() || fallbackCurrency,
        notificationStatus: notification.status,
        updatedAt: notification.sent_at ?? notification.updated_at,
        reason: notification.error_message
      };
    });
}

async function getSyncStateSnapshot(): Promise<SyncStateDashboardRow | null> {
  const rows = await supabaseAdminFetch<SyncStateDashboardRow[]>("sync_state", {
    query: {
      select:
        "sync_name,last_cursor,last_synced_at_source,last_success_at,last_error_at,last_error_message",
      sync_name: `eq.${RETAILCRM_SUPABASE_SYNC_NAME}`,
      limit: 1
    }
  });

  return rows[0] ?? null;
}

async function getNotificationRows(): Promise<NotificationLogDashboardRow[]> {
  return supabaseAdminFetch<NotificationLogDashboardRow[]>("notification_log", {
    query: {
      select: "order_id,status,error_message,updated_at,sent_at",
      notification_type: "eq.telegram_high_value_order",
      order: "updated_at.desc"
    }
  });
}

async function getOrdersByIds(
  orderIds: string[]
): Promise<Map<string, NotificationOrderLookupRow>> {
  if (orderIds.length === 0) {
    return new Map<string, NotificationOrderLookupRow>();
  }

  const rows = await supabaseAdminFetch<NotificationOrderLookupRow[]>("orders", {
    query: {
      select: "id,external_id,order_number,status,total_amount,currency",
      id: buildSupabaseInFilter(orderIds)
    }
  });

  return new Map(rows.map((row) => [row.id, row]));
}

async function buildOperationsSnapshot(currency: string): Promise<DashboardOperationsSnapshot> {
  const [syncState, notifications] = await Promise.all([
    getSyncStateSnapshot(),
    getNotificationRows()
  ]);
  const notificationCounts = buildNotificationCounts(notifications);
  const attentionItems = buildAttentionItems(syncState, notificationCounts);
  const syncStatus = resolveSyncStatus(attentionItems);
  const ordersById = await getOrdersByIds([...new Set(notifications.map((row) => row.order_id))]);

  return {
    ...syncStatus,
    lastSuccessfulSyncAt: syncState?.last_success_at ?? null,
    lastSyncedAtSource: syncState?.last_synced_at_source ?? null,
    activeCursor: syncState?.last_cursor ?? null,
    latestAlertActivity: getLatestAlertActivity(notifications),
    notificationCounts,
    attentionItems,
    recentNotificationEvents: buildRecentNotificationEvents(notifications, ordersById, currency)
  };
}

export async function getDashboardSnapshot(): Promise<DashboardSnapshot> {
  const orders = await supabaseAdminFetch<DashboardOrderRow[]>("orders", {
    query: {
      select:
        "external_id,order_number,status,utm_source,city,total_amount,currency,created_at_source,updated_at_source,synced_at",
      order: "updated_at_source.desc.nullslast,created_at_source.desc.nullslast"
    }
  });
  const baseSnapshot = buildDashboardSnapshot(orders);
  const operations = await buildOperationsSnapshot(baseSnapshot.currency);

  return {
    ...baseSnapshot,
    operations
  };
}

export async function getOperationsSnapshot(): Promise<DashboardOperationsSnapshot> {
  const dashboard = await getDashboardSnapshot();

  return dashboard.operations;
}
