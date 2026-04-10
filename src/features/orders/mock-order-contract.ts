import "../../lib/server-only-guard.ts";
import { readFile } from "node:fs/promises";

export type MockOrderSource = {
  sourceOrderId: string;
  site?: string;
  orderNumber?: string;
  createdAt: string;
  countryIso: string;
  utmSource?: string;
  customer: {
    firstName: string;
    lastName: string;
    phone: string;
    email?: string;
    city?: string;
  };
  deliveryAddress: string;
  customerComment?: string;
  orderMethod?: string;
  orderType?: string;
  items: Array<{
    sourceItemId: string;
    productName: string;
    sku?: string;
    quantity: number;
    unitPrice: number;
  }>;
};

export function buildMockRetailCrmOrderExternalId(sourceOrderId: string): string {
  return `mock-retailcrm:${sourceOrderId}`;
}

export function buildMockRetailCrmItemExternalId(
  orderExternalId: string,
  sourceItemId: string
): string {
  return `${orderExternalId}:item:${sourceItemId}`;
}

export async function loadMockOrders(sourceFilePath: string): Promise<MockOrderSource[]> {
  const fileContents = await readFile(sourceFilePath, "utf8");
  const parsed = JSON.parse(fileContents) as unknown;

  if (!Array.isArray(parsed)) {
    throw new Error(`Expected ${sourceFilePath} to contain a JSON array of mock orders.`);
  }

  return parsed as MockOrderSource[];
}

export async function loadValidatedMockOrders(sourceFilePath: string): Promise<MockOrderSource[]> {
  const orders = await loadMockOrders(sourceFilePath);

  validateMockOrders(orders);

  return orders;
}

export function validateMockOrders(orders: MockOrderSource[]): void {
  if (orders.length === 0) {
    throw new Error("mock_orders.json does not contain any orders to import.");
  }

  const sourceIds = new Set<string>();

  for (const order of orders) {
    if (!order.sourceOrderId) {
      throw new Error("Each mock order must include a non-empty sourceOrderId.");
    }

    if (sourceIds.has(order.sourceOrderId)) {
      throw new Error(`Duplicate sourceOrderId found in mock_orders.json: ${order.sourceOrderId}`);
    }

    sourceIds.add(order.sourceOrderId);

    if (!order.customer?.firstName || !order.customer?.lastName || !order.customer?.phone) {
      throw new Error(`Mock order ${order.sourceOrderId} is missing required customer fields.`);
    }

    if (!order.deliveryAddress) {
      throw new Error(`Mock order ${order.sourceOrderId} is missing deliveryAddress.`);
    }

    if (order.utmSource !== undefined && order.utmSource.trim().length === 0) {
      throw new Error(`Mock order ${order.sourceOrderId} has an empty utmSource.`);
    }

    if (!Array.isArray(order.items) || order.items.length === 0) {
      throw new Error(`Mock order ${order.sourceOrderId} must include at least one item.`);
    }

    const itemIds = new Set<string>();

    for (const item of order.items) {
      if (!item.sourceItemId) {
        throw new Error(`Mock order ${order.sourceOrderId} has an item without sourceItemId.`);
      }

      if (itemIds.has(item.sourceItemId)) {
        throw new Error(
          `Mock order ${order.sourceOrderId} contains duplicate sourceItemId ${item.sourceItemId}.`
        );
      }

      itemIds.add(item.sourceItemId);

      if (!item.productName) {
        throw new Error(
          `Mock order ${order.sourceOrderId} item ${item.sourceItemId} is missing productName.`
        );
      }

      if (!Number.isFinite(item.quantity) || item.quantity <= 0) {
        throw new Error(
          `Mock order ${order.sourceOrderId} item ${item.sourceItemId} must have quantity > 0.`
        );
      }

      if (!Number.isFinite(item.unitPrice) || item.unitPrice < 0) {
        throw new Error(
          `Mock order ${order.sourceOrderId} item ${item.sourceItemId} must have unitPrice >= 0.`
        );
      }
    }
  }
}
