# GBEMPIRE Test Project

This repository contains a lightweight, production-minded integration project for the GBEMPIRE AI Tools Specialist test.

Milestones 3 through 7 cover the full required flow: mock orders can be imported into RetailCRM with stable `externalId` values, those same orders can be synced server-side into Supabase without duplicating rows on rerun, qualifying Supabase orders can trigger duplicate-safe Telegram alerts, and the dashboard is deployed publicly on Vercel with core business metrics from Supabase.

## Stack

- Next.js
- TypeScript
- Supabase
- RetailCRM API
- Telegram Bot API

## Submission Links

- GitHub repo: [https://github.com/Humanji7/gbc-test](https://github.com/Humanji7/gbc-test)
- Public dashboard: [https://gbc-test-rho.vercel.app](https://gbc-test-rho.vercel.app)

## Current Status

Implemented so far:

- technical spec in [docs/technical-spec.md](./docs/technical-spec.md)
- minimal Next.js App Router scaffold
- explicit public/server env separation with a guarded server module
- initial Supabase schema in [supabase/schema.sql](./supabase/schema.sql)
- Supabase apply notes in [supabase/README.md](./supabase/README.md)
- minimal server-side Supabase helper in `src/lib/supabase/server.ts`
- mock RetailCRM importer in `scripts/import-mock-orders.ts`
- RetailCRM -> Supabase sync runner in `scripts/sync-retailcrm-to-supabase.ts`
- repository mock source data in `scripts/mock_orders.json`
- stable `externalId` strategy reused across import and sync
- `sync_state` checkpointing for safe progress tracking during the sync pass
- duplicate-safe Telegram alert runner in `scripts/send-high-value-telegram-alerts.ts`
- `notification_log` usage for one-send-per-order alert deduplication
- explicit RLS enablement in `supabase/schema.sql` for all project tables before deploy
- server-rendered dashboard on `/` with KPI cards, source breakdown, city breakdown, and recent orders from Supabase
- Vercel deploy setup with production env wiring
- public deploy available at `https://gbc-test-rho.vercel.app`

## Что Должно Быть В Финальной Сдаче

Готовая сдача для этого тестового должна включать:

- репозиторий с понятным кодом, schema, scripts и документацией
- рабочий integration flow:
  - import mock orders -> RetailCRM
  - sync RetailCRM -> Supabase
  - duplicate-safe Telegram alerts
  - dashboard с core business metrics
- публичный deploy URL с честно проверенным результатом
- README и финальные docs, где отделено:
  - что реализовано
  - что реально проверено
  - что осталось ограничением или tradeoff

Сейчас финальная сдача уже включает и репозиторий, и публичный URL, и честно зафиксированную validation story.

## Reviewer Path

Если нужно быстро проверить проект руками:

1. Начать с этого README и [QA.md](./QA.md): это текущая финальная submission-story и честный статус проверки.
2. Прочитать [docs/technical-spec.md](./docs/technical-spec.md) как архитектурную рамку через Milestone 6.
3. Посмотреть env contract в [.env.example](./.env.example).
4. Посмотреть database shape в [supabase/schema.sql](./supabase/schema.sql).
5. Проверить scripts:
   - `scripts/import-mock-orders.ts`
   - `scripts/sync-retailcrm-to-supabase.ts`
   - `scripts/send-high-value-telegram-alerts.ts`
6. Открыть dashboard-код:
   - `src/app/page.tsx`
   - `src/features/dashboard/get-dashboard-data.ts`
   - `src/features/dashboard/dashboard-snapshot.ts`
7. Открыть публичный deploy: [https://gbc-test-rho.vercel.app](https://gbc-test-rho.vercel.app).
8. Свериться с текущим handoff в [HANDOFF.md](./HANDOFF.md) для next-step context, если он вообще нужен.

## Как Я Использовал AI В Этом Проекте

Ниже несколько реальных запросов из хода работы над проектом. Они лучше всего показывают, как я вел проект по этапам.

Пример 1: старт работы над тестовым

```text
подготовимся к выполнению тестового, изучи ваку и тестовое. вернись с предложением поб идеальном решении
```

С этого началась работа.

Пример 2: сборка общего процесса работы

```text
мф строим с тобой, поэтому промпты будем использовать те, что будут стратовать с начала проектирования спецификации и до конца, до этапа деплоя и тестов. Следюущим шагом вижу построение плейбука моего с тобой, чтобы я не сбился по пути. учитывай свои способности, что ты делаешь майлстоун за сессию и прочие устанволенные рамки работы
```

Здесь видно, что мне важно было сразу собрать понятный рабочий процесс.

Пример 3: старт первого технического майлстоуна

```text
Start milestone 1 and draft the technical spec plus repository scaffold. Use the approved stack from AGENTS.md, keep the solution lightweight, create the initial Next.js/TypeScript project structure, add a safe server/client env contract, and leave the repo ready for Milestone 2 without introducing unnecessary dependencies.
```

Это уже пример постановки с явными рамками реализации.

Пример 4: добивание Milestone 4 до подтвержденного состояния

```text
Проверь и добей Milestone 4 до полностью подтвержденного состояния в /Users/admin/projects/gbc_test:

1. примени обновленную schema.sql к Supabase,
2. запусти sync RetailCRM -> Supabase,
3. сразу запусти sync второй раз,
4. проверь, что дубликаты не появились,
5. проверь, что sync_state обновляется корректно,
6. коротко зафиксируй результат в HANDOFF.md и QA.md,
7. ничего не делай по Telegram, dashboard и deploy.
```

Здесь уже есть и действия, и критерии проверки, и жесткое ограничение по scope.

Пример 5: строгий review без фиксов

```text
Проведи строгий code review Milestone 5 в /Users/admin/projects/gbc_test без внесения изменений. Сфокусируйся на bugs, рисках, регрессиях, безопасности server-only env, duplicate-safety Telegram alerts и корректности notification_log retry/dedup semantics. Проверь новые файлы и связанные изменения в docs/config/UI, укажи findings по severity с точными file/line references, отдельно перечисли validation gaps и residual risks. Ничего не исправляй.
```

Этот запрос показывает, что AI использовался и для реализации, и для строгой проверки.

## С Какими Сложностями Столкнулся

Проект в целом шел ровно: scope был узкий, стек простой, без лишней инфраструктуры. Основные сложности были связаны с подтверждением корректности интеграции: настроить внешние доступы, проверить защиту от дублей при повторных запусках и отделить реально подтвержденное поведение от предположений.

## Как Решал

Решал это через маленькие майлстоуны с жестким scope, повторные прогоны ключевых сценариев и отдельные review-проходы по рискам.

## Quick Start

1. Copy `.env.example` values into `.env.local`.
2. Install dependencies with `npm install --ignore-scripts`.
3. Start the app with `npm run dev`.
4. Import the mock RetailCRM orders with `npm run import:mock-orders`.
5. Sync those RetailCRM orders into Supabase with `npm run sync:retailcrm-to-supabase`.
6. Send Telegram alerts for qualifying orders with `npm run alerts:telegram`.

Dry-run the importer without creating orders:

- `npm run import:mock-orders -- --dry-run`

Run the sync:

- `npm run sync:retailcrm-to-supabase`

Run Telegram alerts:

- `npm run alerts:telegram`

## Validation

Run:

- `npm run typecheck`
- `npm run build`
- `npm run import:mock-orders -- --dry-run`
- `npm run import:mock-orders` to create any missing mock orders
- `npm run import:mock-orders` again immediately to confirm the same stable ids are skipped as existing
- `npm run sync:retailcrm-to-supabase`
- `npm run sync:retailcrm-to-supabase` again immediately to confirm reruns update existing rows instead of inserting duplicates
- `npm run alerts:telegram`
- `npm run alerts:telegram` again immediately to confirm the same qualifying order is skipped as already sent
- `npm audit --audit-level=low`

Schema validation options:

- `supabase db query --linked -f supabase/schema.sql`
- `psql "$SUPABASE_DB_URL" -f supabase/schema.sql`

Pre-deploy checks completed in the latest preparation pass:

- `npm run typecheck`
- `npm run build`
- `npm audit --audit-level=low`
- `npm run import:mock-orders -- --dry-run`
- read-only Supabase sanity check for:
  - recent orders
  - missing `order_items.external_item_id`
  - `notification_log` statuses

Deploy checks completed:

- Vercel production env vars are configured for the deployed project
- production deploy finished successfully
- public `/api/health` returned `200`
- public `/` returned `200`
- the public dashboard was also opened in a real browser pass for a visual sanity check

Still intentionally not re-run in the final submission pass:

- live sync mutation
- live Telegram send mutation

## Known Limitations / Tradeoffs

- The technical spec in [docs/technical-spec.md](./docs/technical-spec.md) is the architecture frame through Milestone 6, not the source of truth for the current deploy state. The current deploy/review state lives in this README plus [QA.md](./QA.md).
- The final submission pass revalidated safe checks (`typecheck`, `build`, `audit`, dry-run import, and public HTTP reachability), but it intentionally did not rerun live sync mutation or live Telegram delivery to avoid side effects in external systems.
- Dashboard freshness depends on the currently connected Supabase project state. The public URL is live and checked, but the exact metrics can change if the backing data changes later.
- The sync design deliberately favors full stable-id reconciliation over an undocumented incremental delta filter in RetailCRM. This keeps behavior reviewable and safer for the test scope, but it is less efficient than a trustworthy delta feed would be.
- Duplicate-safety for Telegram alerts is intentionally prioritized over blind retry behavior. If delivery persistence becomes uncertain after Telegram may already have accepted a message, the project stops automatic retries and requires manual review.

## Import Notes

- The importer keeps secrets server-side by reading RetailCRM credentials from server-only env vars.
- Reruns are duplicate-safe because stable `externalId` values are generated as `mock-retailcrm:<sourceOrderId>` from the repository fixture data rather than live RetailCRM site defaults.
- If `site` is omitted from a mock record, the importer tries to resolve a single default RetailCRM site before creating orders.
- If a create request loses a race with another import run, the importer re-queries RetailCRM by `externalId` and converges to `skipped_existing` instead of failing the whole run.
- Imported orders are verified by querying RetailCRM back with the same stable `externalId` values.

## Sync Notes

- The sync path is also server-only and uses the same stable `externalId` format `mock-retailcrm:<sourceOrderId>` as Milestone 3.
- The sync reads the repository fixture ids, fetches matching RetailCRM orders by those ids, and upserts `orders` plus `order_items` into Supabase.
- The sync refuses to reconcile `order_items` if RetailCRM omits the line-item payload for an order, so an incomplete API response cannot be misread as “delete every item”.
- `order_items.external_item_id` is now treated as the duplicate-safe write key, and the sync only accepts the same stable item-id contract produced during Milestone 3 import.
- `SUPABASE_SERVICE_ROLE_KEY` and RetailCRM secrets stay in server-only modules and are never read from client code.
- `sync_state.last_cursor` is used as a progress marker for an in-flight fixture scan. After a successful full pass the cursor is cleared so later reruns perform a complete duplicate-safe reconciliation instead of pretending to have a safe delta feed.
- The current RetailCRM API shape used here does not expose a general documented `updatedAtFrom` filter, so this milestone intentionally favors a full stable-id reconciliation over a lossy incremental shortcut.

## Alert Notes

- The alert path is server-only and reads qualifying orders from Supabase rather than from RetailCRM.
- The current high-value threshold is `100`, which intentionally produces one qualifying fixture-backed order in the confirmed test dataset.
- `notification_log.notification_key` uses a stable per-order key, and the runner now claims rows atomically before delivery so concurrent retries cannot send the same alert twice.
- If Telegram may already have accepted a message but the final `sent` write cannot be persisted, the row is moved into `delivery_unknown` and automatic retries stop until manual review. This deliberately prefers duplicate-safety over blind resend behavior.
- Alert messages keep personal data minimal by sending order id, amount, status, masked initials, and city only.

## Final State

The project is ready for review and submission in its current state. The clean public URL to use in the submission is [https://gbc-test-rho.vercel.app](https://gbc-test-rho.vercel.app).

## Submission Checklist

Use [SUBMISSION_CHECKLIST.md](./SUBMISSION_CHECKLIST.md) as the final go/no-go list before deploy and before sending the result.
