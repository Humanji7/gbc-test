import "../../lib/server-only-guard.ts";
import { supabaseAdminFetch } from "../../lib/supabase/server.ts";
import { type RetailCrmOrder } from "./retailcrm-client.ts";

export type SyncStateRow = {
  sync_name: string;
  last_cursor: string | null;
  last_synced_at_source: string | null;
  last_success_at: string | null;
  last_error_at: string | null;
  last_error_message: string | null;
};

export type SupabaseOrderRow = {
  id: string;
  external_id: string;
};

export type SupabaseOrderItemRow = {
  id: string;
  order_id: string;
  external_item_id: string | null;
};

type UpsertSyncStateInput = Readonly<{
  lastCursor: string | null;
  lastSyncedAtSource: string | null;
  lastSuccessAt?: string | null;
  lastErrorAt?: string | null;
  lastErrorMessage?: string | null;
}>;

function buildSupabaseInFilter(values: string[]): string {
  return `in.(${values.map((value) => `"${value.replaceAll("\\", "\\\\").replaceAll('"', '\\"')}"`).join(",")})`;
}

export function coerceSourceTimestamp(value: string | undefined): string | null {
  if (!value) {
    return null;
  }

  return value.trim().length > 0 ? value : null;
}

export function normalizeMoney(value: number | undefined, context: string): number {
  if (value === undefined || !Number.isFinite(value)) {
    throw new Error(`${context} must be a finite number.`);
  }

  return Number(value.toFixed(2));
}

function resolveRetailCrmOrderStatus(order: RetailCrmOrder): string {
  if (!order.status) {
    throw new Error(`RetailCRM order ${order.externalId} is missing required status.`);
  }

  return order.status;
}

function resolveUtmSource(source: RetailCrmOrder["source"]): string | null {
  return source?.source ?? source?.code ?? null;
}

export async function getSyncState(syncName: string): Promise<SyncStateRow | null> {
  const rows = await supabaseAdminFetch<SyncStateRow[]>("sync_state", {
    query: {
      select:
        "sync_name,last_cursor,last_synced_at_source,last_success_at,last_error_at,last_error_message",
      sync_name: `eq.${syncName}`,
      limit: 1
    }
  });

  return rows[0] ?? null;
}

export async function upsertSyncState(
  syncName: string,
  state: UpsertSyncStateInput
): Promise<void> {
  await supabaseAdminFetch("sync_state", {
    method: "POST",
    query: {
      on_conflict: "sync_name"
    },
    headers: {
      Prefer: "resolution=merge-duplicates"
    },
    body: [
      {
        sync_name: syncName,
        last_cursor: state.lastCursor,
        last_synced_at_source: state.lastSyncedAtSource,
        last_success_at: state.lastSuccessAt ?? null,
        last_error_at: state.lastErrorAt ?? null,
        last_error_message: state.lastErrorMessage ?? null,
        updated_at: new Date().toISOString()
      }
    ]
  });
}

async function fetchExistingOrdersByExternalId(
  externalIds: string[]
): Promise<Map<string, SupabaseOrderRow>> {
  if (externalIds.length === 0) {
    return new Map<string, SupabaseOrderRow>();
  }

  const rows = await supabaseAdminFetch<SupabaseOrderRow[]>("orders", {
    query: {
      select: "id,external_id",
      external_id: buildSupabaseInFilter(externalIds)
    }
  });

  return new Map(rows.map((row) => [row.external_id, row]));
}

export async function upsertOrders(
  orders: RetailCrmOrder[],
  nowIso: string
): Promise<{
  existingOrdersByExternalId: Map<string, SupabaseOrderRow>;
  syncedOrdersByExternalId: Map<string, SupabaseOrderRow>;
}> {
  const existingOrdersByExternalId = await fetchExistingOrdersByExternalId(
    orders.map((order) => order.externalId)
  );

  const rows = await supabaseAdminFetch<SupabaseOrderRow[]>("orders", {
    method: "POST",
    query: {
      on_conflict: "external_id",
      select: "id,external_id"
    },
    headers: {
      Prefer: "resolution=merge-duplicates,return=representation"
    },
    body: orders.map((order) => ({
      external_id: order.externalId,
      order_number: order.number ?? null,
      status: resolveRetailCrmOrderStatus(order),
      order_type: order.orderType ?? null,
      order_method: order.orderMethod ?? null,
      customer_first_name: order.firstName ?? null,
      customer_last_name: order.lastName ?? null,
      customer_phone: order.phone ?? null,
      customer_email: order.email ?? null,
      city: order.delivery?.address?.city ?? null,
      delivery_address: order.delivery?.address?.text ?? null,
      utm_source: resolveUtmSource(order.source),
      total_amount: normalizeMoney(order.totalSumm ?? 0, `RetailCRM order ${order.externalId} totalSumm`),
      currency: order.currency ?? null,
      created_at_source: coerceSourceTimestamp(order.createdAt),
      updated_at_source: coerceSourceTimestamp(order.statusUpdatedAt) ?? coerceSourceTimestamp(order.createdAt),
      synced_at: nowIso,
      updated_at: nowIso
    }))
  });

  return {
    existingOrdersByExternalId,
    syncedOrdersByExternalId: new Map(rows.map((row) => [row.external_id, row]))
  };
}

export async function fetchExistingOrderItemsByOrderId(
  orderIds: string[]
): Promise<Map<string, Map<string, SupabaseOrderItemRow>>> {
  if (orderIds.length === 0) {
    return new Map<string, Map<string, SupabaseOrderItemRow>>();
  }

  const rows = await supabaseAdminFetch<SupabaseOrderItemRow[]>("order_items", {
    query: {
      select: "id,order_id,external_item_id",
      order_id: buildSupabaseInFilter(orderIds)
    }
  });

  const itemsByOrderId = new Map<string, Map<string, SupabaseOrderItemRow>>();

  for (const row of rows) {
    if (!row.external_item_id) {
      throw new Error(
        `Supabase order_items row ${row.id} is missing external_item_id, so the sync cannot safely reconcile line items.`
      );
    }

    const itemsForOrder = itemsByOrderId.get(row.order_id) ?? new Map<string, SupabaseOrderItemRow>();

    if (itemsForOrder.has(row.external_item_id)) {
      throw new Error(
        `Supabase already contains duplicate order_items rows for external_item_id ${row.external_item_id}.`
      );
    }

    itemsForOrder.set(row.external_item_id, row);
    itemsByOrderId.set(row.order_id, itemsForOrder);
  }

  return itemsByOrderId;
}

export async function upsertOrderItems(items: Array<Record<string, unknown>>): Promise<void> {
  if (items.length === 0) {
    return;
  }

  await supabaseAdminFetch("order_items", {
    method: "POST",
    query: {
      on_conflict: "external_item_id"
    },
    headers: {
      Prefer: "resolution=merge-duplicates"
    },
    body: items
  });
}

export async function updateOrderItem(id: string, body: Record<string, unknown>): Promise<void> {
  await supabaseAdminFetch("order_items", {
    method: "PATCH",
    query: {
      id: `eq.${id}`
    },
    body
  });
}

export async function deleteOrderItems(ids: string[]): Promise<void> {
  if (ids.length === 0) {
    return;
  }

  await supabaseAdminFetch("order_items", {
    method: "DELETE",
    query: {
      id: buildSupabaseInFilter(ids)
    }
  });
}
