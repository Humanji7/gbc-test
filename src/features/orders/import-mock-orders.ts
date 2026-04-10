import "../../lib/server-only-guard.ts";
import {
  buildMockRetailCrmItemExternalId,
  buildMockRetailCrmOrderExternalId,
  loadValidatedMockOrders,
  type MockOrderSource
} from "./mock-order-contract.ts";
import {
  createRetailCrmOrder,
  listRetailCrmOrdersByExternalIds,
  resolveDefaultRetailCrmOrderMethod,
  resolveDefaultRetailCrmOrderType,
  resolveDefaultRetailCrmSiteCode,
  updateRetailCrmOrderByExternalId,
  type RetailCrmCreateOrderPayload,
  type RetailCrmEditOrderPayload,
  type RetailCrmOrder
} from "./retailcrm-client.ts";

type PreparedMockOrder = {
  sourceOrderId: string;
  site: string;
  externalId: string;
  orderNumber: string;
  desiredCity?: string;
  desiredUtmSource?: string;
  payload: RetailCrmCreateOrderPayload;
};

type RetailCrmDefaults = Readonly<{
  defaultSite?: string;
  defaultOrderType?: string;
  defaultOrderMethod?: string;
}>;

export type MockImportRecord = {
  sourceOrderId: string;
  site: string;
  externalId: string;
  action: "created" | "skipped_existing" | "updated_existing" | "dry_run";
  retailCrmId?: number;
  retailCrmNumber?: string;
  matchedByExternalId: boolean;
};

export type MockImportResult = {
  sourceFilePath: string;
  totalOrders: number;
  createdCount: number;
  skippedCount: number;
  updatedExistingCount: number;
  dryRun: boolean;
  records: MockImportRecord[];
};

type ImportOptions = Readonly<{
  sourceFilePath: string;
  dryRun?: boolean;
}>;

function normalizeOptionalString(value: string | undefined | null): string | undefined {
  const normalized = value?.trim();

  return normalized && normalized.length > 0 ? normalized : undefined;
}

async function resolveRetailCrmDefaults(
  mockOrders: MockOrderSource[]
): Promise<RetailCrmDefaults> {
  const needsDefaultSite = mockOrders.some((order) => !order.site);
  const defaultSite = needsDefaultSite ? await resolveDefaultRetailCrmSiteCode() : undefined;

  if (needsDefaultSite && !defaultSite) {
    throw new Error(
      "Some mock orders are missing `site`, and no single default RetailCRM site could be resolved."
    );
  }

  let defaultOrderType: string | undefined;
  let defaultOrderMethod: string | undefined;

  try {
    defaultOrderType = await resolveDefaultRetailCrmOrderType();
  } catch {
    defaultOrderType = undefined;
  }

  try {
    defaultOrderMethod = await resolveDefaultRetailCrmOrderMethod();
  } catch {
    defaultOrderMethod = undefined;
  }

  return {
    defaultSite,
    defaultOrderType,
    defaultOrderMethod
  };
}

function prepareMockOrder(
  order: MockOrderSource,
  defaults: RetailCrmDefaults
): PreparedMockOrder {
  const site = order.site ?? defaults.defaultSite!;
  const externalId = buildMockRetailCrmOrderExternalId(order.sourceOrderId);
  const orderNumber = order.orderNumber ?? `MOCK-${order.sourceOrderId}`;
  const desiredCity = normalizeOptionalString(order.customer.city);
  const desiredUtmSource = normalizeOptionalString(order.utmSource);

  return {
    sourceOrderId: order.sourceOrderId,
    site,
    externalId,
    orderNumber,
    desiredCity,
    desiredUtmSource,
    payload: {
      externalId,
      number: orderNumber,
      createdAt: order.createdAt,
      countryIso: order.countryIso,
      firstName: order.customer.firstName,
      lastName: order.customer.lastName,
      phone: order.customer.phone,
      email: order.customer.email,
      customerComment: order.customerComment,
      orderType: order.orderType ?? defaults.defaultOrderType,
      orderMethod: order.orderMethod ?? defaults.defaultOrderMethod,
      delivery: {
        address: {
          text: order.deliveryAddress,
          city: desiredCity
        }
      },
      source: desiredUtmSource
        ? {
            source: desiredUtmSource
          }
        : undefined,
      items: order.items.map((item) => ({
        externalId: buildMockRetailCrmItemExternalId(externalId, item.sourceItemId),
        productName: item.productName,
        quantity: item.quantity,
        initialPrice: item.unitPrice
      }))
    }
  };
}

function assertUniquePreparedExternalIds(preparedOrders: PreparedMockOrder[]): void {
  const externalIds = new Set<string>();

  for (const order of preparedOrders) {
    if (externalIds.has(order.externalId)) {
      throw new Error(`Duplicate stable externalId generated: ${order.externalId}`);
    }

    externalIds.add(order.externalId);
  }
}

async function resolvePreparedMockOrders(mockOrders: MockOrderSource[]): Promise<PreparedMockOrder[]> {
  const defaults = await resolveRetailCrmDefaults(mockOrders);
  const preparedOrders = mockOrders.map((order) => prepareMockOrder(order, defaults));

  assertUniquePreparedExternalIds(preparedOrders);

  return preparedOrders;
}

function buildExistingOrderPatch(
  order: PreparedMockOrder,
  existingOrder: RetailCrmOrder
): RetailCrmEditOrderPayload | null {
  const desiredCity = normalizeOptionalString(order.desiredCity);
  const actualCity = normalizeOptionalString(existingOrder.delivery?.address?.city);
  const desiredUtmSource = normalizeOptionalString(order.desiredUtmSource);
  const actualUtmSource = normalizeOptionalString(
    existingOrder.source?.source ?? existingOrder.source?.code
  );
  const patch: {
    delivery?: {
      address?: {
        text?: string;
        city?: string;
      };
    };
    source?: {
      source?: string;
      code?: string;
    };
  } = {};

  if (desiredCity && desiredCity !== actualCity) {
    patch.delivery = {
      address: {
        text: order.payload.delivery?.address.text,
        city: desiredCity
      }
    };
  }

  if (desiredUtmSource && desiredUtmSource !== actualUtmSource) {
    patch.source = {
      source: desiredUtmSource
    };
  }

  return Object.keys(patch).length > 0 ? patch : null;
}

async function recoverExistingOrderByExternalId(externalId: string) {
  return (await listRetailCrmOrdersByExternalIds([externalId])).get(externalId);
}

async function verifyImportedRecords(records: MockImportRecord[]): Promise<void> {
  const verifiedOrders = await listRetailCrmOrdersByExternalIds(
    records.map((record) => record.externalId)
  );

  for (const record of records) {
    const verifiedOrder = verifiedOrders.get(record.externalId);

    record.matchedByExternalId = Boolean(verifiedOrder);

    if (verifiedOrder) {
      record.retailCrmId = verifiedOrder.id;
      record.retailCrmNumber = verifiedOrder.number;
    }
  }

  const unmatchedRecords = records.filter(
    (record) => !record.matchedByExternalId && record.action !== "dry_run"
  );

  if (unmatchedRecords.length > 0) {
    throw new Error(
      `Stable-id verification failed for ${unmatchedRecords.length} imported orders: ${unmatchedRecords
        .map((record) => record.externalId)
        .join(", ")}`
    );
  }
}

function buildImportResult(
  sourceFilePath: string,
  records: MockImportRecord[],
  dryRun: boolean
): MockImportResult {
  return {
    sourceFilePath,
    totalOrders: records.length,
    createdCount: records.filter((record) => record.action === "created").length,
    skippedCount: records.filter((record) => record.action === "skipped_existing").length,
    updatedExistingCount: records.filter((record) => record.action === "updated_existing").length,
    dryRun,
    records
  };
}

export async function importMockOrders(options: ImportOptions): Promise<MockImportResult> {
  const mockOrders = await loadValidatedMockOrders(options.sourceFilePath);
  const preparedOrders = await resolvePreparedMockOrders(mockOrders);
  const existingOrders = await listRetailCrmOrdersByExternalIds(
    preparedOrders.map((order) => order.externalId)
  );
  const records: MockImportRecord[] = [];

  for (const order of preparedOrders) {
    const existingOrder = existingOrders.get(order.externalId);

    if (existingOrder) {
      const patch = buildExistingOrderPatch(order, existingOrder);

      if (patch && !options.dryRun) {
        await updateRetailCrmOrderByExternalId(order.site, order.externalId, patch);
      }

      records.push({
        sourceOrderId: order.sourceOrderId,
        site: order.site,
        externalId: order.externalId,
        action: patch && !options.dryRun ? "updated_existing" : "skipped_existing",
        retailCrmId: existingOrder.id,
        retailCrmNumber: existingOrder.number,
        matchedByExternalId: true
      });
      continue;
    }

    if (options.dryRun) {
      records.push({
        sourceOrderId: order.sourceOrderId,
        site: order.site,
        externalId: order.externalId,
        action: "dry_run",
        matchedByExternalId: false
      });
      continue;
    }

    try {
      const retailCrmId = await createRetailCrmOrder(order.site, order.payload);

      records.push({
        sourceOrderId: order.sourceOrderId,
        site: order.site,
        externalId: order.externalId,
        action: "created",
        retailCrmId,
        retailCrmNumber: order.orderNumber,
        matchedByExternalId: false
      });
    } catch (error) {
      const recoveredOrder = await recoverExistingOrderByExternalId(order.externalId);

      if (!recoveredOrder) {
        throw error;
      }

      records.push({
        sourceOrderId: order.sourceOrderId,
        site: order.site,
        externalId: order.externalId,
        action: "skipped_existing",
        retailCrmId: recoveredOrder.id,
        retailCrmNumber: recoveredOrder.number,
        matchedByExternalId: true
      });
    }
  }

  await verifyImportedRecords(records);

  return buildImportResult(options.sourceFilePath, records, Boolean(options.dryRun));
}
