import { importMockOrders } from "../src/features/orders/import-mock-orders.ts";
import {
  hasFlag,
  readStringFlag,
  resolveMockOrdersSourceFilePath
} from "./mock-order-script-helpers.ts";

function parseArguments(argv: string[]): { dryRun: boolean; sourceFilePath?: string } {
  return {
    dryRun: hasFlag(argv, "--dry-run"),
    sourceFilePath: readStringFlag(argv, "--file")
  };
}

async function main(): Promise<void> {
  const options = parseArguments(process.argv.slice(2));
  const sourceFilePath = resolveMockOrdersSourceFilePath(import.meta.url, options.sourceFilePath);
  const result = await importMockOrders({
    sourceFilePath,
    dryRun: options.dryRun
  });

  console.log(`Source: ${result.sourceFilePath}`);
  console.log(
    `Summary: total=${result.totalOrders} created=${result.createdCount} updated_existing=${result.updatedExistingCount} skipped_existing=${result.skippedCount} dry_run=${result.dryRun}`
  );

  for (const record of result.records) {
    console.log(
      [
        `sourceOrderId=${record.sourceOrderId}`,
        `site=${record.site}`,
        `externalId=${record.externalId}`,
        `action=${record.action}`,
        `retailCrmId=${record.retailCrmId ?? "n/a"}`,
        `retailCrmNumber=${record.retailCrmNumber ?? "n/a"}`,
        `matchedByExternalId=${record.matchedByExternalId}`
      ].join(" ")
    );
  }
}

main().catch((error) => {
  const message = error instanceof Error ? error.message : String(error);

  console.error(`Mock RetailCRM import failed: ${message}`);
  process.exitCode = 1;
});
