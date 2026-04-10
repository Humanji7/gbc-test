# Scripts

This directory contains server-side entry points for milestone work.

Current scripts:

- `import-mock-orders.ts`
  - reads `mock_orders.json`
  - creates mock orders in RetailCRM
  - skips orders that already exist by stable `externalId`
  - keeps `externalId` stable from fixture data even when the target RetailCRM site is auto-resolved at runtime
  - re-checks RetailCRM after create failures so duplicate races converge to an existing order instead of aborting the run
  - verifies that each imported order can be matched back by the same `externalId`
- `sync-retailcrm-to-supabase.ts`
  - reads the same committed `mock_orders.json` contract to avoid `externalId` drift
  - fetches those orders from RetailCRM by stable `externalId`
  - upserts `orders` and reconciles `order_items` in Supabase
  - tracks in-flight progress in `sync_state.last_cursor`
  - clears the cursor after a successful full pass so reruns stay complete and duplicate-safe
- `send-high-value-telegram-alerts.ts`
  - reads qualifying orders from Supabase at the configured high-value threshold
  - sends Telegram Bot API messages from a server-only script
  - claims stable duplicate-safe records in `notification_log` before delivery so concurrent retries do not double-send
  - skips already-sent notifications on immediate reruns
  - moves ambiguous post-send persistence failures into a manual-review status instead of retrying blindly
