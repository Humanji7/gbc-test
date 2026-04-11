# GBEMPIRE Test Project

Compact, production-minded integration project for the GBEMPIRE AI Tools Specialist test.

This submission is intentionally small and reviewable. It covers the required business flow end to end:

- import mock orders into RetailCRM with stable `externalId`
- sync those orders into Supabase without duplicate rows on rerun
- send duplicate-safe Telegram alerts for high-value orders
- expose core business metrics and operational status in a public dashboard

## Stack

- Next.js
- TypeScript
- Supabase
- RetailCRM API
- Telegram Bot API

## Submission Links

- GitHub repo: [https://github.com/Humanji7/gbc-test](https://github.com/Humanji7/gbc-test)
- Public dashboard: [https://gbc-test-rho.vercel.app](https://gbc-test-rho.vercel.app)
- Structured ops summary: [https://gbc-test-rho.vercel.app/api/ops-summary](https://gbc-test-rho.vercel.app/api/ops-summary)

## What This Submission Delivers

- repository with schema, scripts, server-side integration code, and reviewer-facing docs
- stable-id import path for mock RetailCRM orders
- duplicate-safe RetailCRM -> Supabase reconciliation
- duplicate-safe Telegram high-value alert flow
- public deploy with real dashboard data from Supabase
- explicit separation between confirmed validation and remaining unknowns

## Business Flow

1. `npm run import:mock-orders`

Creates any missing mock orders in RetailCRM using stable fixture-owned `externalId` values.

2. `npm run sync:retailcrm-to-supabase`

Fetches the expected RetailCRM orders by those stable ids and upserts `orders` plus `order_items` into Supabase.

3. `npm run alerts:telegram`

Reads qualifying Supabase orders and sends Telegram alerts with persistent deduplication through `notification_log`.

4. Public dashboard and ops summary

`/` shows KPIs plus a lightweight operator view. `/api/ops-summary` exposes sync and alert state in a structured form without secrets.

## Operator / Ops Notes

- If `failed > 0`, inspect the recorded error first, then rerun the alert script.
- If `delivery_unknown > 0`, do not blind-retry. Manual delivery review comes first.
- If `sync_state.last_cursor` is not empty, treat the previous sync as interrupted and rerun safely.
- The dashboard is a lightweight operating slice, not a full backoffice queue.

## Reviewer Path

Fastest review path:

1. Read this README and [QA.md](./QA.md).
2. Open the public dashboard and [ops summary endpoint](https://gbc-test-rho.vercel.app/api/ops-summary).
3. Check the schema in [supabase/schema.sql](./supabase/schema.sql).
4. Check the integration entry points:
   - `scripts/import-mock-orders.ts`
   - `scripts/sync-retailcrm-to-supabase.ts`
   - `scripts/send-high-value-telegram-alerts.ts`
5. Check the main server-side reads:
   - `src/features/orders/`
   - `src/features/dashboard/get-dashboard-data.ts`
   - `src/app/page.tsx`

## How AI Was Used

AI was used as an accelerator, not as an autopilot.

- Work was split into narrow milestone-sized sessions with explicit scope and validation.
- AI was used both for implementation and for adversarial review passes.
- Human judgment stayed on architecture, idempotency, duplicate-safety, validation boundaries, and tradeoffs.

The most important non-autopilot choices in this project were:

- using stable-id full reconciliation instead of pretending there is a safe RetailCRM delta feed
- preferring duplicate-safety over blind Telegram retries
- keeping privileged credentials server-side only
- documenting what was not revalidated instead of overstating confidence

## Quick Start

1. Copy `.env.example` into `.env.local`.
2. Install dependencies with `npm install --ignore-scripts`.
3. Start the app with `npm run dev`.
4. Run `npm run import:mock-orders`.
5. Run `npm run sync:retailcrm-to-supabase`.
6. Run `npm run alerts:telegram`.

Useful direct commands:

- `npm run import:mock-orders -- --dry-run`
- `npm run sync:retailcrm-to-supabase`
- `npm run alerts:telegram`

## Validation Story

Historically validated in the working project flow:

- importer rerun behavior with stable ids
- sync rerun behavior without duplicate orders
- Telegram rerun behavior without duplicate alert sends

Rechecked in the final submission pass:

- `npm run typecheck`
- `npm run build`
- `npm audit --audit-level=low`
- `npm run import:mock-orders -- --dry-run`
- public `/api/health` returned `200`
- public `/api/ops-summary` returned a structured operational snapshot
- public `/` returned `200` and rendered real data
- read-only Supabase sanity check for:
  - recent orders
  - missing `order_items.external_item_id`
  - `notification_log` status shape

Intentionally not rerun in the final submission pass:

- live sync mutation
- live Telegram send mutation

## Known Limits / Tradeoffs

- [docs/technical-spec.md](./docs/technical-spec.md) is the architecture frame through Milestone 6, not the final deploy-state source of truth. Final review state lives in this README plus [QA.md](./QA.md).
- Sync deliberately uses stable-id full reconciliation rather than an undocumented RetailCRM delta filter. This is less efficient, but more reviewable and safer for the test scope.
- Telegram delivery uncertainty is handled conservatively: `delivery_unknown` blocks automatic retries to avoid duplicate messages.
- Dashboard freshness depends on the current connected Supabase project state, so metrics can change later even if the deploy stays healthy.
- The public dashboard is intentionally a narrow internal operations slice, not a generalized analytics product.

## Implementation Notes

Import:

- stable `externalId` format is `mock-retailcrm:<sourceOrderId>`
- create races converge to `skipped_existing` by re-querying RetailCRM

Sync:

- only expected fixture-backed orders are reconciled
- `order_items.external_item_id` is treated as the stable write key
- incomplete RetailCRM item payloads fail closed instead of deleting items implicitly

Alerts:

- qualifying orders are read from Supabase, not directly from RetailCRM
- `notification_log.notification_key` enforces one-send-per-order semantics
- alert messages minimize PII and include the operator next step

## Submission Checklist

Use [SUBMISSION_CHECKLIST.md](./SUBMISSION_CHECKLIST.md) as the final go/no-go checklist.
