import { sendHighValueTelegramAlerts } from "../src/features/alerts/send-high-value-telegram-alerts.ts";

function parseArguments(argv: string[]): { threshold?: number } {
  const parsed = {
    threshold: undefined as number | undefined
  };

  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];

    if (argument === "--threshold") {
      parsed.threshold = Number(argv[index + 1]);
      index += 1;
      continue;
    }

    if (argument.startsWith("--threshold=")) {
      parsed.threshold = Number(argument.slice("--threshold=".length));
    }
  }

  if (
    parsed.threshold !== undefined &&
    (!Number.isFinite(parsed.threshold) || parsed.threshold < 0)
  ) {
    throw new Error("--threshold must be a non-negative number.");
  }

  return parsed;
}

async function main(): Promise<void> {
  const options = parseArguments(process.argv.slice(2));
  const result = await sendHighValueTelegramAlerts(options.threshold);

  console.log(
    `Summary: threshold=${result.threshold.toFixed(2)} qualifying_orders=${result.qualifyingOrders} sent=${result.sentCount} retried_failed=${result.retriedFailedCount} skipped_sent=${result.skippedSentCount} skipped_sending=${result.skippedSendingCount} skipped_delivery_unknown=${result.skippedDeliveryUnknownCount}`
  );

  for (const record of result.records) {
    console.log(
      [
        `externalId=${record.externalId}`,
        `orderId=${record.orderId}`,
        `notificationKey=${record.notificationKey}`,
        `action=${record.action}`,
        `notificationStatus=${record.notificationStatus}`,
        `totalAmount=${record.totalAmount.toFixed(2)}`,
        `telegramMessageId=${record.telegramMessageId ?? "n/a"}`,
        `reason=${record.reason ?? "n/a"}`
      ].join(" ")
    );
  }
}

main().catch((error) => {
  const message = error instanceof Error ? error.message : String(error);

  console.error(`High-value Telegram alerts failed: ${message}`);
  process.exitCode = 1;
});
