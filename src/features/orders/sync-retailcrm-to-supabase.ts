import "../../lib/server-only-guard.ts";
import {
  buildMockRetailCrmItemExternalId,
  buildMockRetailCrmOrderExternalId,
  loadValidatedMockOrders,
  type MockOrderSource
} from "./mock-order-contract.ts";
import {
  listRetailCrmOrdersByExternalIds,
  type RetailCrmOrder,
  type RetailCrmOrderItem
} from "./retailcrm-client.ts";
import {
  coerceSourceTimestamp,
  deleteOrderItems,
  fetchExistingOrderItemsByOrderId,
  getSyncState,
  normalizeMoney,
  type SupabaseOrderItemRow,
  updateOrderItem,
  upsertOrderItems,
  upsertOrders,
  upsertSyncState
} from "./sync-retailcrm-store.ts";

const RETAILCRM_SUPABASE_SYNC_NAME = "retailcrm_to_supabase_orders";
const DEFAULT_BATCH_SIZE = 100;

type SyncBatchRecord = {
  sourceOrderId: string;
  externalId: string;
  retailCrmId: number;
  supabaseOrderId: string;
  orderAction: "inserted" | "updated";
  insertedItems: number;
  updatedItems: number;
  deletedItems: number;
  sourceUpdatedAt: string | null;
};

export type RetailCrmSupabaseSyncRecord = SyncBatchRecord;

export type RetailCrmSupabaseSyncResult = {
  syncName: string;
  sourceFilePath: string;
  totalOrders: number;
  processedCount: number;
  resumedFromCursor: string | null;
  insertedOrders: number;
  updatedOrders: number;
  insertedItems: number;
  updatedItems: number;
  deletedItems: number;
  lastSyncedAtSource: string | null;
  records: RetailCrmSupabaseSyncRecord[];
};

type SyncOptions = Readonly<{
  sourceFilePath: string;
  batchSize?: number;
}>;

type FixtureOrder = {
  sourceOrderId: string;
  externalId: string;
  expectedExternalItemIds: string[];
};

function buildStableFixtureList(mockOrders: MockOrderSource[]): FixtureOrder[] {
  return mockOrders
    .map((order) => {
      const externalId = buildMockRetailCrmOrderExternalId(order.sourceOrderId);

      return {
        sourceOrderId: order.sourceOrderId,
        externalId,
        expectedExternalItemIds: order.items.map((item) =>
          buildMockRetailCrmItemExternalId(externalId, item.sourceItemId)
        )
      };
    })
    .sort((left, right) => left.externalId.localeCompare(right.externalId));
}

function resolveResumeIndex(externalIds: string[], lastCursor: string | null): number {
  if (!lastCursor) {
    return 0;
  }

  const cursorIndex = externalIds.indexOf(lastCursor);

  if (cursorIndex < 0 || cursorIndex >= externalIds.length - 1) {
    return 0;
  }

  return cursorIndex + 1;
}

function maxSourceTimestamp(current: string | null, candidate: string | null): string | null {
  if (!candidate) {
    return current;
  }

  if (!current || candidate > current) {
    return candidate;
  }

  return current;
}

function normalizeQuantity(value: number | undefined, context: string): number {
  if (!Number.isFinite(value) || value === undefined || value <= 0) {
    throw new Error(`${context} must be a positive number.`);
  }

  if (!Number.isInteger(value)) {
    throw new Error(`${context} must be an integer to fit the current Supabase schema.`);
  }

  return value;
}

function resolveRetailCrmOrderItemExternalId(
  orderExternalId: string,
  item: RetailCrmOrderItem
): string {
  if (item.externalId) {
    return item.externalId;
  }

  const defaultExternalId =
    item.externalIds?.find((externalId) => externalId.code === "default")?.value;

  if (defaultExternalId) {
    return defaultExternalId;
  }

  const singleExternalId =
    item.externalIds && item.externalIds.length === 1 ? item.externalIds[0]?.value : undefined;

  if (singleExternalId) {
    return singleExternalId;
  }

  throw new Error(
    `RetailCRM order ${orderExternalId} item ${item.id} is missing a stable external identifier.`
  );
}

function requireRetailCrmOrderItems(order: RetailCrmOrder): RetailCrmOrderItem[] {
  if (!Array.isArray(order.items)) {
    throw new Error(
      `RetailCRM order ${order.externalId} did not include an item payload, so the sync cannot safely reconcile order_items.`
    );
  }

  return order.items;
}

function assertStableExternalItemContract(
  fixtureOrder: FixtureOrder,
  activeExternalItemIds: Set<string>
): void {
  const expectedExternalItemIds = new Set(fixtureOrder.expectedExternalItemIds);
  const unexpectedExternalItemIds = Array.from(activeExternalItemIds).filter(
    (externalItemId) => !expectedExternalItemIds.has(externalItemId)
  );
  const missingExternalItemIds = fixtureOrder.expectedExternalItemIds.filter(
    (externalItemId) => !activeExternalItemIds.has(externalItemId)
  );

  if (unexpectedExternalItemIds.length === 0 && missingExternalItemIds.length === 0) {
    return;
  }

  throw new Error(
    `RetailCRM order ${fixtureOrder.externalId} line items drifted from the Milestone 3 stable external ID contract. Missing: ${missingExternalItemIds.join(", ") || "none"}. Unexpected: ${unexpectedExternalItemIds.join(", ") || "none"}.`
  );
}

function resolveRetailCrmItemProductName(
  orderExternalId: string,
  item: RetailCrmOrderItem
): string {
  const productName = item.productName ?? item.offer?.displayName ?? item.offer?.name;

  if (!productName) {
    throw new Error(`RetailCRM order ${orderExternalId} item ${item.id} is missing productName.`);
  }

  return productName;
}

function getBatchSize(options: SyncOptions): number {
  return options.batchSize ?? DEFAULT_BATCH_SIZE;
}

function countOrderActions(
  records: SyncBatchRecord[],
  action: SyncBatchRecord["orderAction"]
): number {
  return records.filter((record) => record.orderAction === action).length;
}

function sumRecordField(
  records: SyncBatchRecord[],
  key: "insertedItems" | "updatedItems" | "deletedItems"
): number {
  return records.reduce((sum, record) => sum + record[key], 0);
}

async function syncOrderItemsForOrder(
  fixtureOrder: FixtureOrder,
  order: RetailCrmOrder,
  supabaseOrderId: string,
  existingItemsByExternalId: Map<string, SupabaseOrderItemRow>,
  nowIso: string
): Promise<Pick<SyncBatchRecord, "insertedItems" | "updatedItems" | "deletedItems">> {
  const sourceItems = requireRetailCrmOrderItems(order);
  const activeExternalItemIds = new Set<string>();
  const itemsToInsert: Array<Record<string, unknown>> = [];
  const itemUpdates: Array<Promise<void>> = [];
  let updatedItems = 0;

  for (const item of sourceItems) {
    const externalItemId = resolveRetailCrmOrderItemExternalId(order.externalId, item);

    if (activeExternalItemIds.has(externalItemId)) {
      throw new Error(
        `RetailCRM order ${order.externalId} returned duplicate line item external IDs: ${externalItemId}.`
      );
    }

    if (!fixtureOrder.expectedExternalItemIds.includes(externalItemId)) {
      throw new Error(
        `RetailCRM order ${order.externalId} returned unexpected line item external ID ${externalItemId}; the sync only accepts the Milestone 3 stable fixture contract.`
      );
    }

    const quantity = normalizeQuantity(
      item.quantity,
      `RetailCRM order ${order.externalId} item ${externalItemId} quantity`
    );
    const unitPrice = normalizeMoney(
      item.initialPrice ?? 0,
      `RetailCRM order ${order.externalId} item ${externalItemId} initialPrice`
    );
    const itemBody = {
      order_id: supabaseOrderId,
      external_item_id: externalItemId,
      sku: item.offer?.externalId ?? null,
      product_name: resolveRetailCrmItemProductName(order.externalId, item),
      quantity,
      unit_price: unitPrice,
      line_total: normalizeMoney(
        quantity * unitPrice,
        `RetailCRM order ${order.externalId} item ${externalItemId} lineTotal`
      ),
      updated_at: nowIso
    };

    activeExternalItemIds.add(externalItemId);

    const existingItem = existingItemsByExternalId.get(externalItemId);

    if (!existingItem) {
      itemsToInsert.push(itemBody);
      continue;
    }

    updatedItems += 1;
    itemUpdates.push(updateOrderItem(existingItem.id, itemBody));
  }

  assertStableExternalItemContract(fixtureOrder, activeExternalItemIds);

  await upsertOrderItems(itemsToInsert);
  await Promise.all(itemUpdates);

  const staleItemIds = Array.from(existingItemsByExternalId.values())
    .filter((item) => !activeExternalItemIds.has(item.external_item_id!))
    .map((item) => item.id);

  await deleteOrderItems(staleItemIds);

  return {
    insertedItems: itemsToInsert.length,
    updatedItems,
    deletedItems: staleItemIds.length
  };
}

async function syncBatch(
  batch: FixtureOrder[]
): Promise<{
  records: SyncBatchRecord[];
  lastSyncedAtSource: string | null;
}> {
  const crmOrdersByExternalId = await listRetailCrmOrdersByExternalIds(
    batch.map((order) => order.externalId)
  );
  const missingExternalIds = batch.filter((order) => !crmOrdersByExternalId.has(order.externalId));

  if (missingExternalIds.length > 0) {
    throw new Error(
      `RetailCRM is missing expected imported orders for externalIds: ${missingExternalIds
        .map((order) => order.externalId)
        .join(", ")}`
    );
  }

  const retailCrmOrders = batch.map((order) => crmOrdersByExternalId.get(order.externalId)!);
  const nowIso = new Date().toISOString();
  const { existingOrdersByExternalId, syncedOrdersByExternalId } = await upsertOrders(
    retailCrmOrders,
    nowIso
  );
  const syncedOrderIds = Array.from(syncedOrdersByExternalId.values()).map((row) => row.id);
  const existingItemsByOrderId = await fetchExistingOrderItemsByOrderId(syncedOrderIds);
  const records: SyncBatchRecord[] = [];
  let lastSyncedAtSource: string | null = null;

  for (const fixtureOrder of batch) {
    const retailCrmOrder = crmOrdersByExternalId.get(fixtureOrder.externalId)!;
    const syncedOrder = syncedOrdersByExternalId.get(fixtureOrder.externalId);

    if (!syncedOrder) {
      throw new Error(`Supabase upsert did not return order ${fixtureOrder.externalId}.`);
    }

    const itemSyncResult = await syncOrderItemsForOrder(
      fixtureOrder,
      retailCrmOrder,
      syncedOrder.id,
      existingItemsByOrderId.get(syncedOrder.id) ?? new Map<string, SupabaseOrderItemRow>(),
      nowIso
    );
    const sourceUpdatedAt =
      coerceSourceTimestamp(retailCrmOrder.statusUpdatedAt) ??
      coerceSourceTimestamp(retailCrmOrder.createdAt);

    lastSyncedAtSource = maxSourceTimestamp(lastSyncedAtSource, sourceUpdatedAt);
    records.push({
      sourceOrderId: fixtureOrder.sourceOrderId,
      externalId: fixtureOrder.externalId,
      retailCrmId: retailCrmOrder.id,
      supabaseOrderId: syncedOrder.id,
      orderAction: existingOrdersByExternalId.has(fixtureOrder.externalId) ? "updated" : "inserted",
      insertedItems: itemSyncResult.insertedItems,
      updatedItems: itemSyncResult.updatedItems,
      deletedItems: itemSyncResult.deletedItems,
      sourceUpdatedAt
    });
  }

  return {
    records,
    lastSyncedAtSource
  };
}

function buildSyncResult(
  options: SyncOptions,
  records: SyncBatchRecord[],
  totalOrders: number,
  resumedFromCursor: string | null,
  lastSyncedAtSource: string | null
): RetailCrmSupabaseSyncResult {
  return {
    syncName: RETAILCRM_SUPABASE_SYNC_NAME,
    sourceFilePath: options.sourceFilePath,
    totalOrders,
    processedCount: records.length,
    resumedFromCursor,
    insertedOrders: countOrderActions(records, "inserted"),
    updatedOrders: countOrderActions(records, "updated"),
    insertedItems: sumRecordField(records, "insertedItems"),
    updatedItems: sumRecordField(records, "updatedItems"),
    deletedItems: sumRecordField(records, "deletedItems"),
    lastSyncedAtSource,
    records
  };
}

export async function syncRetailCrmOrdersToSupabase(
  options: SyncOptions
): Promise<RetailCrmSupabaseSyncResult> {
  const fixtureOrders = buildStableFixtureList(
    await loadValidatedMockOrders(options.sourceFilePath)
  );
  const batchSize = getBatchSize(options);
  const stateBeforeRun = await getSyncState(RETAILCRM_SUPABASE_SYNC_NAME);
  const resumeIndex = resolveResumeIndex(
    fixtureOrders.map((order) => order.externalId),
    stateBeforeRun?.last_cursor ?? null
  );
  const records: SyncBatchRecord[] = [];
  let lastSyncedAtSource = stateBeforeRun?.last_synced_at_source ?? null;
  let lastCursor = stateBeforeRun?.last_cursor ?? null;

  try {
    for (let index = resumeIndex; index < fixtureOrders.length; index += batchSize) {
      const batch = fixtureOrders.slice(index, index + batchSize);
      const batchResult = await syncBatch(batch);

      records.push(...batchResult.records);
      lastSyncedAtSource = maxSourceTimestamp(lastSyncedAtSource, batchResult.lastSyncedAtSource);
      lastCursor = index + batch.length < fixtureOrders.length ? batch[batch.length - 1].externalId : null;

      await upsertSyncState(RETAILCRM_SUPABASE_SYNC_NAME, {
        lastCursor,
        lastSyncedAtSource,
        lastSuccessAt: lastCursor ? stateBeforeRun?.last_success_at ?? null : new Date().toISOString(),
        lastErrorAt: null,
        lastErrorMessage: null
      });
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);

    await upsertSyncState(RETAILCRM_SUPABASE_SYNC_NAME, {
      lastCursor,
      lastSyncedAtSource,
      lastSuccessAt: stateBeforeRun?.last_success_at ?? null,
      lastErrorAt: new Date().toISOString(),
      lastErrorMessage: message
    });

    throw error;
  }

  return buildSyncResult(
    options,
    records,
    fixtureOrders.length,
    stateBeforeRun?.last_cursor ?? null,
    lastSyncedAtSource
  );
}
