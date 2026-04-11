# GBEMPIRE Test Project

Compact, production-minded integration project for the GBEMPIRE AI Tools Specialist test.

This submission is intentionally small and reviewable. It covers the required business flow end to end:

- import 50 mock orders into RetailCRM with stable `externalId`
- sync those orders into Supabase without duplicate rows on rerun
- send duplicate-safe Telegram alerts for orders above `50_000`
- expose core business metrics, a real chart, and operational status in a public dashboard

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
- committed `scripts/mock_orders.json` fixture with 50 valid orders
- fixture includes 6 orders above `50_000` and 1 boundary order at exactly `50_000` for threshold validation
- stable-id import path for mock RetailCRM orders
- duplicate-safe RetailCRM -> Supabase reconciliation
- duplicate-safe Telegram high-value alert flow at the brief threshold of `> 50_000`
- public deploy with real dashboard data from Supabase, including a server-rendered chart
- explicit separation between confirmed validation and remaining unknowns

## Business Flow

1. `npm run import:mock-orders`

Creates any missing mock orders in RetailCRM using stable fixture-owned `externalId` values.

2. `npm run sync:retailcrm-to-supabase`

Fetches the expected RetailCRM orders by those stable ids and upserts `orders` plus `order_items` into Supabase.

3. `npm run alerts:telegram`

Reads qualifying Supabase orders above `50_000` and sends Telegram alerts with persistent deduplication through `notification_log`.

4. Public dashboard and ops summary

`/` shows KPIs, a real daily revenue chart, and a lightweight operator view. The dashboard reads the current committed fixture-backed order slice from Supabase so the public totals stay aligned with the 50-order brief dataset. `/api/ops-summary` exposes sync and alert state in a structured form without secrets.

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
- making the alert-trigger interpretation explicit instead of hiding it behind vague wording

## Quick Start

1. Copy `.env.example` into `.env.local`.
2. Install dependencies with `npm install --ignore-scripts`.
3. Start the app with `npm run dev`.
4. Run `npm run import:mock-orders`.
5. Run `npm run sync:retailcrm-to-supabase`.
6. Run `npm run alerts:telegram`.

Useful direct commands:

- `npm run import:mock-orders`
- `npm run sync:retailcrm-to-supabase`
- `npm run alerts:telegram`

## Validation Story

Rerun in the final brief-alignment pass on April 11, 2026:

- `npm run typecheck`
- `npm run build`
- `npm audit --audit-level=low`
- `npm run import:mock-orders`
- immediate rerun of `npm run import:mock-orders`
- `npm run sync:retailcrm-to-supabase`
- immediate rerun of `npm run sync:retailcrm-to-supabase`
- `npm run alerts:telegram`
- immediate rerun of `npm run alerts:telegram`
- deployed `/` check on [https://gbc-test-rho.vercel.app](https://gbc-test-rho.vercel.app)
- deployed page visibly includes the `Выручка по дням` chart and the `Крупные заказы (> 50 000)` KPI copy

Observed results from that pass:

- import run created 50 orders; immediate rerun skipped the same 50 by stable `externalId`
- sync run inserted 50 orders and 81 line items; immediate rerun updated the same rows without creating duplicates
- alert run found exactly 6 qualifying orders above `50_000` and sent 6 Telegram messages
- immediate alert rerun skipped the same 6 orders as already sent
- the exact-`50_000` boundary order did not qualify, matching the strict `>` rule
- the deployed dashboard shows 50 orders and a real Supabase-backed daily revenue chart

Latest release-closure pass on April 11, 2026:

- `npm run typecheck`
- `npm run build`
- `npm audit --audit-level=low`
- `npm run import:mock-orders` and immediate rerun both returned `skipped_existing=50`
- `npm run sync:retailcrm-to-supabase` and immediate rerun both returned `updated_orders=50` and `updated_items=81` without duplicate inserts
- `npm run alerts:telegram` and immediate rerun both returned `skipped_sent=6`, which confirms duplicate-safe behavior against the already-sent live state
- fresh `vercel --prod` produced a ready deployment and refreshed `https://gbc-test-rho.vercel.app`
- deployed `/api/health` returned `{"ok":true,"app":"GBEMPIRE Test Project"}`

## Known Limits / Tradeoffs

- [docs/technical-spec.md](./docs/technical-spec.md) is the architecture frame through Milestone 6, not the final deploy-state source of truth. Final review state lives in this README plus [QA.md](./QA.md).
- Sync deliberately uses stable-id full reconciliation rather than an undocumented RetailCRM delta filter. This is less efficient, but more reviewable and safer for the test scope.
- Telegram delivery uncertainty is handled conservatively: `delivery_unknown` blocks automatic retries to avoid duplicate messages.
- The alert brief phrase "when an order appears in RetailCRM" is implemented as: after import and sync, the server-side alert runner scans Supabase and sends one message the first time it sees an order above `50_000`.
- Sync reruns are duplicate-safe, but not a no-op: the second pass re-updates the same 50 orders and 81 line items through the merge-based reconciliation path.
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
- the threshold is strict `> 50_000`, not `>= 50_000`
- `notification_log.notification_key` enforces one-send-per-order semantics
- alert messages minimize PII and include the operator next step

## Submission Checklist

Use [SUBMISSION_CHECKLIST.md](./SUBMISSION_CHECKLIST.md) as the final go/no-go checklist.
