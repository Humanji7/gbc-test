import { syncRetailCrmOrdersToSupabase } from "../src/features/orders/sync-retailcrm-to-supabase.ts";
import {
  readPositiveIntegerFlag,
  readStringFlag,
  resolveMockOrdersSourceFilePath
} from "./mock-order-script-helpers.ts";

function parseArguments(argv: string[]): { sourceFilePath?: string; batchSize?: number } {
  return {
    sourceFilePath: readStringFlag(argv, "--file"),
    batchSize: readPositiveIntegerFlag(argv, "--batch-size")
  };
}

async function main(): Promise<void> {
  const options = parseArguments(process.argv.slice(2));
  const sourceFilePath = resolveMockOrdersSourceFilePath(import.meta.url, options.sourceFilePath);
  const result = await syncRetailCrmOrdersToSupabase({
    sourceFilePath,
    batchSize: options.batchSize
  });

  console.log(`Source: ${result.sourceFilePath}`);
  console.log(
    `Summary: total=${result.totalOrders} processed=${result.processedCount} inserted_orders=${result.insertedOrders} updated_orders=${result.updatedOrders} inserted_items=${result.insertedItems} updated_items=${result.updatedItems} deleted_items=${result.deletedItems}`
  );
  console.log(
    `SyncState: syncName=${result.syncName} resumedFromCursor=${result.resumedFromCursor ?? "none"} lastSyncedAtSource=${result.lastSyncedAtSource ?? "n/a"}`
  );

  for (const record of result.records) {
    console.log(
      [
        `sourceOrderId=${record.sourceOrderId}`,
        `externalId=${record.externalId}`,
        `retailCrmId=${record.retailCrmId}`,
        `supabaseOrderId=${record.supabaseOrderId}`,
        `orderAction=${record.orderAction}`,
        `insertedItems=${record.insertedItems}`,
        `updatedItems=${record.updatedItems}`,
        `deletedItems=${record.deletedItems}`,
        `sourceUpdatedAt=${record.sourceUpdatedAt ?? "n/a"}`
      ].join(" ")
    );
  }
}

main().catch((error) => {
  const message = error instanceof Error ? error.message : String(error);

  console.error(`RetailCRM -> Supabase sync failed: ${message}`);
  process.exitCode = 1;
});
