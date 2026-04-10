# Technical Spec

## Purpose

This document defines the lightweight architecture for the GBEMPIRE test project through the server-rendered dashboard delivered in Milestone 6.

The goal is to keep the implementation small, explicit, and safe by default while leaving clear extension points for the next milestones.

## Scope Through Milestone 6

Milestones 1 through 6 deliver:

- the technical specification
- the initial Next.js + TypeScript scaffold
- a safe environment-variable contract
- clear file ownership for future milestones
- the initial Supabase schema and first server-only Supabase helper
- a mock RetailCRM import runner backed by repository sample orders
- stable order `externalId` generation for duplicate-safe reruns and later sync matching
- a server-only RetailCRM -> Supabase sync runner that reuses those stable ids and records sync progress in `sync_state`
- a server-only Telegram alert runner that reads qualifying orders from Supabase and deduplicates sends in `notification_log`
- a server-rendered dashboard that reads real KPI and summary data from Supabase

The repository still does not yet deliver:

- deployment flow

## Architecture Summary

### Runtime split

- Next.js App Router provides the web app and server runtime surface.
- Server-only integration work will live in route handlers, server components, and library modules under `src/lib` and `src/features`.
- Browser code may only consume `NEXT_PUBLIC_*` configuration.

### Planned integrations

- Supabase stores normalized order data plus sync and notification state.
- RetailCRM is the source of truth for imported and synced orders.
- Telegram sends duplicate-safe notifications for qualifying orders.

### Deployment target

- The default deployment target is Vercel because it fits the approved stack and free-tier-friendly constraint.
- Scheduled work should stay simple and use the smallest workable Vercel-native or manual trigger path during the final deploy step.

## Repository Layout

```text
src/
  app/
    api/
      health/
    layout.tsx
    page.tsx
    globals.css
  env/
    public.ts
    server.ts
  features/
    alerts/
    dashboard/
    orders/
  lib/
    config.ts
    constants.ts
    supabase/
      server.ts
docs/
  technical-spec.md
scripts/
supabase/
  README.md
  schema.sql
```

## Environment Contract

### Public environment variables

Public variables are optional at scaffold time and may be safely exposed to browser bundles:

- `NEXT_PUBLIC_APP_NAME`
- `NEXT_PUBLIC_BASE_URL`
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`

### Server-only environment variables

These variables must never be imported into client code:

- `RETAILCRM_BASE_URL`
- `RETAILCRM_API_KEY`
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `TELEGRAM_BOT_TOKEN`
- `TELEGRAM_CHAT_ID`

### Contract rules

- Public env is read only from `src/env/public.ts`.
- Server env is read only from `src/env/server.ts`.
- The server env module includes a runtime guard so client-side imports fail fast during development.
- Build-time defaults are allowed for non-secret public values so the scaffold can run without account setup.
- Secret enforcement should happen at the integration boundary that needs the secret, not during a no-op Milestone 1 boot.

## Planned Data Flow

### Import flow

1. A server-side script or route creates mock orders in RetailCRM.
2. The import step generates a stable `externalId` per source order from fixture-owned data and skips orders that already exist for that id.
3. A verification pass reads RetailCRM orders back by `externalId` so later sync work can rely on stable identifiers.

### Sync flow

1. A server-side sync reads the repository mock-order contract and derives the same stable `externalId` values used during import.
2. RetailCRM orders are fetched by those stable ids and transformed into the normalized Supabase `orders` and `order_items` shape.
3. `sync_state.last_cursor` records in-flight batch progress so an interrupted run can resume from the next stable id.
4. After a successful full pass, the cursor is cleared and the sync relies on duplicate-safe reconciliation rather than an undocumented delta feed.

### Alert flow

1. New or updated orders are evaluated against the current high-value threshold of `100`.
2. Notification records are claimed atomically before delivery so concurrent runs cannot retry the same alert at the same time.
3. If Telegram may already have accepted a message but the final persistence step fails, the notification moves to a manual-review state instead of being retried blindly.

### Dashboard flow

1. Server-rendered pages query Supabase for KPI and summary views.
2. The browser only receives data already approved for display.

## Milestone Ownership

### Milestone 2

- create `supabase/schema.sql`
- define normalized tables
- add the first server-only Supabase helper
- document local schema apply flow

### Initial schema shape

- `orders` stores the business-level order record plus key customer, location, and tracking fields
- `order_items` stores line items separately from orders
- `sync_state` stores the last safe checkpoint for later incremental sync
- `notification_log` stores duplicate-safe Telegram notification state

### Milestone 3

- add RetailCRM import client and import entry point
- keep credentials server-side and out of client bundles
- make reruns duplicate-safe by stable `externalId`
- verify imported orders can be looked up by the same stable IDs

### Milestone 4

- add sync client, transforms, and Supabase write path
- keep the sync server-only and reuse the Milestone 3 stable-id contract without drift
- use `sync_state` for reviewable progress tracking during the full reconciliation pass

### Milestone 5

- add Telegram notifier and duplicate-safe notification log usage
- read qualifying orders from Supabase instead of directly from RetailCRM
- keep one-send-per-order semantics by stable notification keys

### Milestone 6

- replace the scaffold landing page with real server-rendered metrics

## Design Decisions

- No ORM: direct SQL and API clients keep the project smaller and easier to review.
- No background worker layer yet: milestone scope does not justify extra infrastructure.
- No client-side privileged access: all privileged reads and writes remain server-only.
- No UI component library yet: the dashboard can start with plain React and CSS until the real data shape exists.
- No fake incremental sync: because the current documented RetailCRM orders list filter exposes stable `externalIds` but not a general `updatedAtFrom`, Milestone 4 uses a full stable-id reconciliation pass with resumable cursor progress instead of a potentially lossy delta cursor.

## Open Questions Deferred

- whether a later milestone should add a stronger source-side delta strategy if RetailCRM account capabilities allow it
- final scheduling mechanism for recurring syncs on the free tier
