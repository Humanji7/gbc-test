import { HIGH_VALUE_ORDER_THRESHOLD } from "@/lib/constants";
import { DASHBOARD_RECENT_ORDERS_LIMIT } from "./dashboard-contract";

const DEFAULT_CURRENCY = "RUB";
const UNKNOWN_SOURCE_LABEL = "Неизвестный источник";
const UNKNOWN_CITY_LABEL = "Неизвестный город";

export type DashboardOrderRow = Readonly<{
  external_id: string;
  order_number: string | null;
  status: string;
  utm_source: string | null;
  city: string | null;
  total_amount: number | string;
  currency: string | null;
  created_at_source: string | null;
  updated_at_source: string | null;
  synced_at: string;
}>;

export type DashboardBreakdownItem = Readonly<{
  label: string;
  orderCount: number;
  totalAmount: number;
  sharePercent: number;
}>;

export type DashboardRecentOrder = Readonly<{
  externalId: string;
  orderNumber: string;
  status: string;
  source: string;
  city: string;
  totalAmount: number;
  currency: string;
  orderMoment: string;
}>;

export type DashboardAttentionItem = Readonly<{
  severity: "ok" | "warning" | "critical";
  title: string;
  detail: string;
  action: string;
}>;

export type DashboardNotificationCounts = Readonly<{
  sending: number;
  sent: number;
  failed: number;
  deliveryUnknown: number;
}>;

export type DashboardNotificationEvent = Readonly<{
  orderExternalId: string;
  orderNumber: string;
  orderStatus: string;
  totalAmount: number;
  currency: string;
  notificationStatus: "sending" | "sent" | "failed" | "delivery_unknown";
  updatedAt: string;
  reason: string | null;
}>;

export type DashboardOperationsSnapshot = Readonly<{
  syncStatus: "healthy" | "warning" | "critical";
  syncStatusLabel: string;
  lastSuccessfulSyncAt: string | null;
  lastSyncedAtSource: string | null;
  activeCursor: string | null;
  latestAlertActivity: string | null;
  notificationCounts: DashboardNotificationCounts;
  attentionItems: DashboardAttentionItem[];
  recentNotificationEvents: DashboardNotificationEvent[];
}>;

export type DashboardSnapshot = Readonly<{
  generatedAt: string;
  currency: string;
  totalOrders: number;
  totalRevenue: number;
  averageOrderValue: number;
  highValueOrders: number;
  latestOrderMoment: string | null;
  sourceBreakdown: DashboardBreakdownItem[];
  cityBreakdown: DashboardBreakdownItem[];
  recentOrders: DashboardRecentOrder[];
  operations: DashboardOperationsSnapshot;
}>;

type BreakdownBucket = {
  label: string;
  orderCount: number;
  totalAmount: number;
};

function toAmount(value: number | string): number {
  if (typeof value === "number") {
    return value;
  }

  const parsed = Number(value);

  return Number.isFinite(parsed) ? parsed : 0;
}

function normalizeBucketLabel(value: string | null, fallback: string): string {
  const normalized = value?.trim();

  return normalized && normalized.length > 0 ? normalized : fallback;
}

function getOrderMoment(order: DashboardOrderRow): string {
  return order.updated_at_source ?? order.created_at_source ?? order.synced_at;
}

function buildBreakdown(
  orders: DashboardOrderRow[],
  selectLabel: (order: DashboardOrderRow) => string
): DashboardBreakdownItem[] {
  const buckets = new Map<string, BreakdownBucket>();

  for (const order of orders) {
    const label = selectLabel(order);
    const amount = toAmount(order.total_amount);
    const currentBucket = buckets.get(label) ?? { label, orderCount: 0, totalAmount: 0 };

    currentBucket.orderCount += 1;
    currentBucket.totalAmount += amount;
    buckets.set(label, currentBucket);
  }

  const totalOrders = orders.length || 1;

  return [...buckets.values()]
    .map((bucket) => ({
      label: bucket.label,
      orderCount: bucket.orderCount,
      totalAmount: Number(bucket.totalAmount.toFixed(2)),
      sharePercent: Number(((bucket.orderCount / totalOrders) * 100).toFixed(1))
    }))
    .sort((left, right) => {
      if (right.orderCount !== left.orderCount) {
        return right.orderCount - left.orderCount;
      }

      if (right.totalAmount !== left.totalAmount) {
        return right.totalAmount - left.totalAmount;
      }

      return left.label.localeCompare(right.label);
    });
}

function resolveCurrency(orders: DashboardOrderRow[]): string {
  return orders.find((order) => order.currency?.trim())?.currency?.trim() ?? DEFAULT_CURRENCY;
}

export function buildDashboardSnapshot(orders: DashboardOrderRow[]): DashboardSnapshot {
  const totalOrders = orders.length;
  const totalRevenue = Number(
    orders.reduce((sum, order) => sum + toAmount(order.total_amount), 0).toFixed(2)
  );
  const averageOrderValue =
    totalOrders > 0 ? Number((totalRevenue / totalOrders).toFixed(2)) : 0;
  const highValueOrders = orders.filter(
    (order) => toAmount(order.total_amount) >= HIGH_VALUE_ORDER_THRESHOLD
  ).length;
  const latestOrderMoment = orders[0] ? getOrderMoment(orders[0]) : null;
  const currency = resolveCurrency(orders);

  return {
    generatedAt: new Date().toISOString(),
    currency,
    totalOrders,
    totalRevenue,
    averageOrderValue,
    highValueOrders,
    latestOrderMoment,
    sourceBreakdown: buildBreakdown(orders, (order) =>
      normalizeBucketLabel(order.utm_source, UNKNOWN_SOURCE_LABEL)
    ),
    cityBreakdown: buildBreakdown(orders, (order) =>
      normalizeBucketLabel(order.city, UNKNOWN_CITY_LABEL)
    ),
    recentOrders: orders.slice(0, DASHBOARD_RECENT_ORDERS_LIMIT).map((order) => ({
      externalId: order.external_id,
      orderNumber: order.order_number?.trim() || order.external_id,
      status: order.status,
      source: normalizeBucketLabel(order.utm_source, UNKNOWN_SOURCE_LABEL),
      city: normalizeBucketLabel(order.city, UNKNOWN_CITY_LABEL),
      totalAmount: toAmount(order.total_amount),
      currency: order.currency?.trim() || currency,
      orderMoment: getOrderMoment(order)
    })),
    operations: {
      syncStatus: "warning",
      syncStatusLabel: "Операционный статус не загружен",
      lastSuccessfulSyncAt: null,
      lastSyncedAtSource: null,
      activeCursor: null,
      latestAlertActivity: null,
      notificationCounts: {
        sending: 0,
        sent: 0,
        failed: 0,
        deliveryUnknown: 0
      },
      attentionItems: [],
      recentNotificationEvents: []
    }
  };
}
