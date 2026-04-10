import "../../lib/server-only-guard.ts";
import { requireServerEnv } from "../../env/server.ts";
import { HIGH_VALUE_ORDER_THRESHOLD } from "../../lib/constants.ts";
import { supabaseAdminFetch } from "../../lib/supabase/server.ts";

const HIGH_VALUE_TELEGRAM_NOTIFICATION_TYPE = "telegram_high_value_order";
const NOTIFICATION_CLAIM_TIMEOUT_MS = 5 * 60 * 1000;
const NOTIFICATION_LOG_SELECT =
  "id,order_id,notification_type,notification_key,status,sent_at,error_message,created_at,updated_at";
const DELIVERY_UNKNOWN_RETRY_REASON =
  "A previous Telegram delivery may already have succeeded, so automatic retry is blocked until manual review.";
const STALE_SENDING_REASON = `Notification claim expired after ${Math.floor(
  NOTIFICATION_CLAIM_TIMEOUT_MS / 60_000
)} minutes. ${DELIVERY_UNKNOWN_RETRY_REASON}`;

type QualifyingOrderRow = Readonly<{
  id: string;
  external_id: string;
  order_number: string | null;
  status: string;
  total_amount: number | string;
  currency: string | null;
  city: string | null;
  customer_first_name: string | null;
  customer_last_name: string | null;
  created_at_source: string | null;
  synced_at: string;
}>;

type NotificationLogStatus = "pending" | "sending" | "sent" | "failed" | "delivery_unknown";

type NotificationLogRow = Readonly<{
  id: string;
  order_id: string;
  notification_type: string;
  notification_key: string;
  status: NotificationLogStatus;
  sent_at: string | null;
  error_message: string | null;
  created_at: string;
  updated_at: string;
}>;

type TelegramSendResponse = Readonly<{
  ok: boolean;
  description?: string;
  error_code?: number;
  result?: {
    message_id: number;
  };
}>;

export type HighValueAlertRecord = Readonly<{
  externalId: string;
  orderId: string;
  notificationKey: string;
  totalAmount: number;
  action:
    | "sent"
    | "retried_failed"
    | "skipped_sent"
    | "skipped_sending"
    | "skipped_delivery_unknown";
  notificationStatus: NotificationLogStatus;
  telegramMessageId: number | null;
  reason: string | null;
}>;

export type SendHighValueTelegramAlertsResult = Readonly<{
  threshold: number;
  qualifyingOrders: number;
  sentCount: number;
  retriedFailedCount: number;
  skippedSentCount: number;
  skippedSendingCount: number;
  skippedDeliveryUnknownCount: number;
  records: HighValueAlertRecord[];
}>;

function coerceMoney(value: number | string, label: string): number {
  const parsed = Number(value);

  if (!Number.isFinite(parsed) || parsed < 0) {
    throw new Error(`${label} must be a non-negative number.`);
  }

  return Math.round(parsed * 100) / 100;
}

function maskCustomerName(firstName: string | null, lastName: string | null): string {
  const firstInitial = firstName?.trim().charAt(0).toUpperCase();
  const lastInitial = lastName?.trim().charAt(0).toUpperCase();
  const parts = [firstInitial, lastInitial].filter(Boolean);

  return parts.length > 0 ? parts.map((part) => `${part}.`).join(" ") : "n/a";
}

function formatMoney(amount: number, currency: string | null): string {
  const normalizedCurrency = currency?.trim().toUpperCase();

  if (normalizedCurrency && normalizedCurrency.length === 3) {
    try {
      return new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: normalizedCurrency,
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
      }).format(amount);
    } catch {
      return `${amount.toFixed(2)} ${normalizedCurrency}`;
    }
  }

  return amount.toFixed(2);
}

function buildNotificationKey(externalId: string): string {
  return `${HIGH_VALUE_TELEGRAM_NOTIFICATION_TYPE}:${externalId}`;
}

function formatAlertMessage(order: QualifyingOrderRow, threshold: number): string {
  const totalAmount = coerceMoney(order.total_amount, `Supabase order ${order.external_id} total_amount`);

  return [
    "GBEMPIRE high-value order alert",
    `Order: ${order.external_id}`,
    `Amount: ${formatMoney(totalAmount, order.currency)}`,
    `Threshold: >= ${threshold.toFixed(2)}`,
    `Status: ${order.status}`,
    `Customer: ${maskCustomerName(order.customer_first_name, order.customer_last_name)}`,
    `City: ${order.city ?? "n/a"}`,
    `Created at source: ${order.created_at_source ?? "n/a"}`
  ].join("\n");
}

async function listQualifyingOrders(threshold: number): Promise<QualifyingOrderRow[]> {
  return supabaseAdminFetch<QualifyingOrderRow[]>("orders", {
    query: {
      select:
        "id,external_id,order_number,status,total_amount,currency,city,customer_first_name,customer_last_name,created_at_source,synced_at",
      total_amount: `gte.${threshold}`,
      order: "total_amount.desc"
    }
  });
}

async function listNotificationLog(): Promise<NotificationLogRow[]> {
  return supabaseAdminFetch<NotificationLogRow[]>("notification_log", {
    query: {
      select: NOTIFICATION_LOG_SELECT,
      notification_type: `eq.${HIGH_VALUE_TELEGRAM_NOTIFICATION_TYPE}`,
      order: "created_at.asc"
    }
  });
}

async function getNotificationByKey(notificationKey: string): Promise<NotificationLogRow | null> {
  const rows = await supabaseAdminFetch<NotificationLogRow[]>("notification_log", {
    query: {
      select: NOTIFICATION_LOG_SELECT,
      notification_key: `eq.${notificationKey}`,
      limit: 1
    }
  });

  return rows[0] ?? null;
}

async function insertSendingNotification(
  orderId: string,
  notificationKey: string
): Promise<NotificationLogRow | null> {
  const updatedAt = new Date().toISOString();
  const rows = await supabaseAdminFetch<NotificationLogRow[]>("notification_log", {
    method: "POST",
    query: {
      on_conflict: "notification_key",
      select: NOTIFICATION_LOG_SELECT
    },
    headers: {
      Prefer: "resolution=ignore-duplicates,return=representation"
    },
    body: [
      {
        order_id: orderId,
        notification_type: HIGH_VALUE_TELEGRAM_NOTIFICATION_TYPE,
        notification_key: notificationKey,
        status: "sending",
        updated_at: updatedAt
      }
    ]
  });

  return rows[0] ?? null;
}

async function transitionNotificationLog(
  id: string,
  fromStatuses: NotificationLogStatus[],
  patch: Readonly<{
    status?: NotificationLogStatus;
    sent_at?: string | null;
    error_message?: string | null;
    updated_at?: string;
  }>
): Promise<NotificationLogRow | null> {
  const rows = await supabaseAdminFetch<NotificationLogRow[]>("notification_log", {
    method: "PATCH",
    query: {
      id: `eq.${id}`,
      status:
        fromStatuses.length === 1 ? `eq.${fromStatuses[0]}` : `in.(${fromStatuses.join(",")})`,
      select: NOTIFICATION_LOG_SELECT
    },
    headers: {
      Prefer: "return=representation"
    },
    body: patch
  });

  return rows[0] ?? null;
}

async function sendTelegramMessage(text: string): Promise<number> {
  const env = requireServerEnv(["telegramBotToken", "telegramChatId"]);
  const response = await fetch(`https://api.telegram.org/bot${env.telegramBotToken}/sendMessage`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      chat_id: env.telegramChatId,
      text,
      disable_web_page_preview: true
    }),
    cache: "no-store"
  });

  const payload = (await response.json()) as TelegramSendResponse;

  if (!response.ok || !payload.ok || !payload.result?.message_id) {
    throw new Error(
      `Telegram sendMessage failed: ${payload.error_code ?? response.status} ${payload.description ?? response.statusText}`
    );
  }

  return payload.result.message_id;
}

function trimErrorMessage(message: string): string {
  return message.length <= 500 ? message : `${message.slice(0, 497)}...`;
}

function isClaimExpired(updatedAt: string): boolean {
  const updatedAtMs = Date.parse(updatedAt);

  if (!Number.isFinite(updatedAtMs)) {
    return true;
  }

  return Date.now() - updatedAtMs >= NOTIFICATION_CLAIM_TIMEOUT_MS;
}

function buildSkipRecord(
  order: QualifyingOrderRow,
  notificationKey: string,
  totalAmount: number,
  action: Extract<
    HighValueAlertRecord["action"],
    "skipped_sent" | "skipped_sending" | "skipped_delivery_unknown"
  >,
  notificationStatus: NotificationLogStatus,
  reason: string
): HighValueAlertRecord {
  return {
    externalId: order.external_id,
    orderId: order.id,
    notificationKey,
    totalAmount,
    action,
    notificationStatus,
    telegramMessageId: null,
    reason
  };
}

export async function sendHighValueTelegramAlerts(
  threshold = HIGH_VALUE_ORDER_THRESHOLD
): Promise<SendHighValueTelegramAlertsResult> {
  const qualifyingOrders = await listQualifyingOrders(threshold);
  const notificationsByKey = new Map(
    (await listNotificationLog()).map((row) => [row.notification_key, row])
  );
  const records: HighValueAlertRecord[] = [];
  let sentCount = 0;
  let retriedFailedCount = 0;
  let skippedSentCount = 0;
  let skippedSendingCount = 0;
  let skippedDeliveryUnknownCount = 0;

  for (const order of qualifyingOrders) {
    const notificationKey = buildNotificationKey(order.external_id);
    const totalAmount = coerceMoney(
      order.total_amount,
      `Supabase order ${order.external_id} total_amount`
    );
    let notification = notificationsByKey.get(notificationKey) ?? null;
    let action: HighValueAlertRecord["action"] | null = null;
    let ownsSendingClaim = false;

    if (notification?.status === "sent") {
      skippedSentCount += 1;
      records.push(
        buildSkipRecord(
          order,
          notificationKey,
          totalAmount,
          "skipped_sent",
          "sent",
          "Notification already marked as sent."
        )
      );
      continue;
    }

    if (notification?.status === "delivery_unknown") {
      skippedDeliveryUnknownCount += 1;
      records.push(
        buildSkipRecord(
          order,
          notificationKey,
          totalAmount,
          "skipped_delivery_unknown",
          "delivery_unknown",
          notification.error_message ?? DELIVERY_UNKNOWN_RETRY_REASON
        )
      );
      continue;
    }

    if (!notification) {
      const insertedNotification = await insertSendingNotification(order.id, notificationKey);

      if (insertedNotification) {
        notification = insertedNotification;
        notificationsByKey.set(notificationKey, insertedNotification);
        action = "sent";
        ownsSendingClaim = true;
      } else {
        notification = await getNotificationByKey(notificationKey);

        if (!notification) {
          throw new Error(
            `Notification log insert for ${notificationKey} did not return a row and no existing row could be found.`
          );
        }

        notificationsByKey.set(notificationKey, notification);

        if (notification.status === "sent") {
          skippedSentCount += 1;
          records.push(
            buildSkipRecord(
              order,
              notificationKey,
              totalAmount,
              "skipped_sent",
              "sent",
              "Notification already marked as sent."
            )
          );
          continue;
        }

        if (notification.status === "delivery_unknown") {
          skippedDeliveryUnknownCount += 1;
          records.push(
            buildSkipRecord(
              order,
              notificationKey,
              totalAmount,
              "skipped_delivery_unknown",
              "delivery_unknown",
              notification.error_message ?? DELIVERY_UNKNOWN_RETRY_REASON
            )
          );
          continue;
        }
      }
    }

    if (!notification) {
      throw new Error(`Missing notification log row for ${notificationKey}.`);
    }

    if (notification.status === "sending" && !ownsSendingClaim) {
      if (isClaimExpired(notification.updated_at)) {
        const deliveryUnknown = await transitionNotificationLog(notification.id, ["sending"], {
          status: "delivery_unknown",
          error_message: trimErrorMessage(STALE_SENDING_REASON),
          updated_at: new Date().toISOString()
        });

        notification = deliveryUnknown ?? (await getNotificationByKey(notificationKey)) ?? notification;
        notificationsByKey.set(notificationKey, notification);
        skippedDeliveryUnknownCount += 1;
        records.push(
          buildSkipRecord(
            order,
            notificationKey,
            totalAmount,
            "skipped_delivery_unknown",
            notification.status,
            notification.error_message ?? STALE_SENDING_REASON
          )
        );
      } else {
        skippedSendingCount += 1;
        records.push(
          buildSkipRecord(
            order,
            notificationKey,
            totalAmount,
            "skipped_sending",
            "sending",
            "Notification is already being processed by another run."
          )
        );
      }
      continue;
    }

    if (notification.status === "pending" || notification.status === "failed") {
      const previousStatus = notification.status;
      const claimedNotification = await transitionNotificationLog(
        notification.id,
        [previousStatus],
        {
          status: "sending",
          sent_at: null,
          error_message: null,
          updated_at: new Date().toISOString()
        }
      );

      if (!claimedNotification) {
        notification = await getNotificationByKey(notificationKey);

        if (!notification) {
          throw new Error(`Notification log claim for ${notificationKey} was lost unexpectedly.`);
        }

        notificationsByKey.set(notificationKey, notification);

        if (notification.status === "sent") {
          skippedSentCount += 1;
          records.push(
            buildSkipRecord(
              order,
              notificationKey,
              totalAmount,
              "skipped_sent",
              "sent",
              "Notification already marked as sent."
            )
          );
          continue;
        }

        if (notification.status === "delivery_unknown") {
          skippedDeliveryUnknownCount += 1;
          records.push(
            buildSkipRecord(
              order,
              notificationKey,
              totalAmount,
              "skipped_delivery_unknown",
              "delivery_unknown",
              notification.error_message ?? DELIVERY_UNKNOWN_RETRY_REASON
            )
          );
          continue;
        }

        if (notification.status === "sending") {
          skippedSendingCount += 1;
          records.push(
            buildSkipRecord(
              order,
              notificationKey,
              totalAmount,
              "skipped_sending",
              "sending",
              "Notification is already being processed by another run."
            )
          );
          continue;
        }
      } else {
        notification = claimedNotification;
        notificationsByKey.set(notificationKey, notification);
        ownsSendingClaim = true;

        if (action !== "sent" && previousStatus === "failed" && notification.status === "sending") {
          action = "retried_failed";
        }
      }
    }

    if (notification.status !== "sending") {
      throw new Error(`Notification ${notificationKey} is in unsupported status ${notification.status}.`);
    }

    let telegramMessageId: number;

    try {
      telegramMessageId = await sendTelegramMessage(formatAlertMessage(order, threshold));
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);

      const failedNotification = await transitionNotificationLog(notification.id, ["sending"], {
        status: "failed",
        sent_at: null,
        error_message: trimErrorMessage(message),
        updated_at: new Date().toISOString()
      });

      if (failedNotification) {
        notificationsByKey.set(notificationKey, failedNotification);
      }

      throw error;
    }

    const sentAt = new Date().toISOString();

    try {
      const sentNotification = await transitionNotificationLog(notification.id, ["sending"], {
        status: "sent",
        sent_at: sentAt,
        error_message: null,
        updated_at: sentAt
      });

      if (!sentNotification) {
        throw new Error("The notification row could not be transitioned from sending to sent.");
      }

      notificationsByKey.set(notificationKey, sentNotification);

      if (action === "retried_failed") {
        retriedFailedCount += 1;
      } else {
        sentCount += 1;
        action = "sent";
      }

      records.push({
        externalId: order.external_id,
        orderId: order.id,
        notificationKey,
        totalAmount,
        action,
        notificationStatus: "sent",
        telegramMessageId,
        reason: null
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      const deliveryUnknownMessage = trimErrorMessage(
        `Telegram may already have accepted this alert, but notification_log could not be marked sent. ${DELIVERY_UNKNOWN_RETRY_REASON} Root error: ${message}`
      );
      const deliveryUnknownNotification = await transitionNotificationLog(notification.id, ["sending"], {
        status: "delivery_unknown",
        error_message: deliveryUnknownMessage,
        updated_at: new Date().toISOString()
      });

      if (deliveryUnknownNotification) {
        notificationsByKey.set(notificationKey, deliveryUnknownNotification);
      }

      throw new Error(
        `Telegram may already have delivered ${notificationKey}, but notification_log could not be finalized. Manual review required. Root error: ${message}`
      );
    }
  }

  return {
    threshold,
    qualifyingOrders: qualifyingOrders.length,
    sentCount,
    retriedFailedCount,
    skippedSentCount,
    skippedSendingCount,
    skippedDeliveryUnknownCount,
    records
  };
}
