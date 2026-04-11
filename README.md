# GBEMPIRE Test Project

Небольшой, аккуратный интеграционный проект для тестового задания GBEMPIRE AI Tools Specialist.

Проект специально сделан компактным и удобным для ревью. Он закрывает весь требуемый flow:

- импорт 50 mock orders в RetailCRM со стабильными `externalId`
- sync этих заказов в Supabase без дублей на повторном запуске
- duplicate-safe Telegram alerts для заказов выше `50_000`
- публичный dashboard с ключевыми метриками, реальным графиком и операционным срезом

## Стек

- Next.js
- TypeScript
- Supabase
- RetailCRM API
- Telegram Bot API

## Ссылки

- GitHub repo: [https://github.com/Humanji7/gbc-test](https://github.com/Humanji7/gbc-test)
- Публичный dashboard: [https://gbc-test-rho.vercel.app](https://gbc-test-rho.vercel.app)
- Структурированный ops summary: [https://gbc-test-rho.vercel.app/api/ops-summary](https://gbc-test-rho.vercel.app/api/ops-summary)

## Что Входит В Сдачу

- репозиторий с понятным кодом, schema, scripts и документацией для ревью
- committed `scripts/mock_orders.json` с 50 валидными заказами
- 6 заказов выше `50_000` и 1 boundary order ровно на `50_000` для проверки strict threshold
- путь импорта со стабильными id для mock-заказов в RetailCRM
- duplicate-safe RetailCRM -> Supabase reconciliation
- duplicate-safe Telegram high-value alerts при пороге `> 50_000`
- публичный deploy с реальными данными из Supabase и серверным графиком
- явное разделение между тем, что реализовано, что реально проверено и что остаётся ограничением или компромиссом

## Бизнес-Флоу

1. `npm run import:mock-orders`

Создаёт отсутствующие mock orders в RetailCRM, используя стабильные fixture-owned `externalId`.

2. `npm run sync:retailcrm-to-supabase`

Забирает ожидаемые RetailCRM orders по этим стабильным ids и делает upsert в `orders` и `order_items` в Supabase.

3. `npm run alerts:telegram`

Читает qualifying orders из Supabase выше `50_000` и отправляет Telegram alerts с постоянной дедупликацией через `notification_log`.

4. Public dashboard и ops summary

`/` показывает KPI, реальный график дневной выручки и лёгкий операторский срез. Dashboard читает текущий fixture-backed slice из Supabase, чтобы публичные totals совпадали с 50-order dataset. `/api/ops-summary` отдаёт sync и alert state в структурированном виде без секретов.

## Операторские Заметки

- Если `failed > 0`, сначала смотри записанную ошибку, потом перезапускай alert script.
- Если `delivery_unknown > 0`, не делай blind retry. Сначала нужна ручная проверка доставки.
- Если `sync_state.last_cursor` не пустой, считай, что прошлый sync был прерван, и перезапускай безопасно.
- Dashboard здесь специально узкий: это внутренний операционный срез, а не full backoffice queue.

## Как Быстро Проверить Проект

Самый быстрый путь для ревью:

1. Прочитать этот README и [QA.md](./QA.md).
2. Открыть публичный dashboard и [ops summary endpoint](https://gbc-test-rho.vercel.app/api/ops-summary).
3. Посмотреть схему в [supabase/schema.sql](./supabase/schema.sql).
4. Посмотреть основные integration entry points:
   - `scripts/import-mock-orders.ts`
   - `scripts/sync-retailcrm-to-supabase.ts`
   - `scripts/send-high-value-telegram-alerts.ts`
5. Посмотреть основные server-side reads:
   - `src/features/orders/`
   - `src/features/dashboard/get-dashboard-data.ts`
   - `src/app/page.tsx`

## Как Я Использовал AI

AI использовался как ускоритель, а не как автопилот.

- Работа была разбита на узкие майлстоуны с явным scope и validation.
- AI использовался и для реализации, и для жёстких review-проходов.
- Человеческое решение оставалось на архитектуре, idempotency, duplicate-safety, validation boundaries и tradeoffs.

Самые важные не-автопилотные решения в проекте:

- использовать stable-id full reconciliation вместо вида, что у RetailCRM есть безопасный delta feed
- предпочесть duplicate-safety вместо blind Telegram retries
- держать privileged credentials только на сервере
- явно зафиксировать трактовку alert trigger semantics вместо размытой формулировки

## Примеры Промптов

Ниже несколько реальных промптов из хода работы. Именно такой стиль запросов я использовал, чтобы вести проект по шагам, а не “генерить всё разом”.

Пример 1: старт работы над тестовым

```text
подготовимся к выполнению тестового, изучи ваку и тестовое. вернись с предложением поб идеальном решении
```

Пример 2: сборка общего процесса работы

```text
мф строим с тобой, поэтому промпты будем использовать те, что будут стратовать с начала проектирования спецификации и до конца, до этапа деплоя и тестов. Следюущим шагом вижу построение плейбука моего с тобой, чтобы я не сбился по пути. учитывай свои способности, что ты делаешь майлстоун за сессию и прочие устанволенные рамки работы
```

Пример 3: старт первого технического майлстоуна

```text
Start milestone 1 and draft the technical spec plus repository scaffold. Use the approved stack from AGENTS.md, keep the solution lightweight, create the initial Next.js/TypeScript project structure, add a safe server/client env contract, and leave the repo ready for Milestone 2 without introducing unnecessary dependencies.
```

Пример 4: добивание Milestone 4 до подтверждённого состояния

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

Пример 5: строгий review без фиксов

```text
Проведи строгий code review Milestone 5 в /Users/admin/projects/gbc_test без внесения изменений. Сфокусируйся на bugs, рисках, регрессиях, безопасности server-only env, duplicate-safety Telegram alerts и корректности notification_log retry/dedup semantics. Проверь новые файлы и связанные изменения в docs/config/UI, укажи findings по severity с точными file/line references, отдельно перечисли validation gaps и residual risks. Ничего не исправляй.
```

## С Какими Сложностями Столкнулся

Проект в целом шёл ровно: scope был узкий, стек простой, без лишней инфраструктуры. Основные сложности были вокруг подтверждения корректности интеграции: настроить внешние доступы, проверить защиту от дублей на повторных прогонах и отделить реально подтверждённое поведение от предположений.

## Как Решал

Решал это через маленькие майлстоуны с жёстким scope, повторные прогоны ключевых сценариев и отдельные review-проходы по рискам.

## Быстрый Старт

1. Скопировать `.env.example` в `.env.local`.
2. Установить зависимости через `npm install --ignore-scripts`.
3. Запустить приложение через `npm run dev`.
4. Импортировать mock orders через `npm run import:mock-orders`.
5. Синхронизировать их в Supabase через `npm run sync:retailcrm-to-supabase`.
6. Отправить qualifying Telegram alerts через `npm run alerts:telegram`.

Полезные команды:

- `npm run import:mock-orders`
- `npm run sync:retailcrm-to-supabase`
- `npm run alerts:telegram`

## История Валидации

Финальный pass по буквальному выравниванию под бриф от April 11, 2026:

- `npm run typecheck`
- `npm run build`
- `npm audit --audit-level=low`
- `npm run import:mock-orders`
- immediate rerun `npm run import:mock-orders`
- `npm run sync:retailcrm-to-supabase`
- immediate rerun `npm run sync:retailcrm-to-supabase`
- `npm run alerts:telegram`
- immediate rerun `npm run alerts:telegram`
- проверка deployed `/` на [https://gbc-test-rho.vercel.app](https://gbc-test-rho.vercel.app)
- визуальное подтверждение, что на странице есть `Выручка по дням` и KPI `Крупные заказы (> 50 000)`

Наблюдаемые результаты того прохода:

- import создал 50 orders; immediate rerun пропустил те же 50 по stable `externalId`
- sync вставил 50 orders и 81 line item; immediate rerun обновил те же строки без дублей
- alert run нашёл ровно 6 qualifying orders выше `50_000` и отправил 6 Telegram messages
- immediate alert rerun пропустил те же 6 orders как уже отправленные
- boundary order ровно на `50_000` не попал под условие, что соответствует strict `>` rule
- публичный dashboard показывал 50 orders и реальный Supabase-backed daily revenue chart

Последний release-closure pass от April 11, 2026:

- `npm run typecheck`
- `npm run build`
- `npm audit --audit-level=low`
- `npm run import:mock-orders` и immediate rerun оба вернули `skipped_existing=50`
- `npm run sync:retailcrm-to-supabase` и immediate rerun оба вернули `updated_orders=50` и `updated_items=81` без duplicate inserts
- `npm run alerts:telegram` и immediate rerun оба вернули `skipped_sent=6`, что подтверждает duplicate-safe поведение на уже отправленном live state
- свежий `vercel --prod` обновил [https://gbc-test-rho.vercel.app](https://gbc-test-rho.vercel.app)
- deployed `/api/health` вернул `{"ok":true,"app":"GBEMPIRE Test Project"}`

Дополнительный language-check pass:

- Telegram alert copy переведён на русский
- для проверки были вручную переведены 3 existing `sent` rows в `failed`
- штатный `npm run alerts:telegram` затем повторно отправил 3 сообщения
- новые `telegramMessageId`: `11`, `12`, `13`

## Ограничения И Компромиссы

- [docs/technical-spec.md](./docs/technical-spec.md) — это архитектурная рамка через Milestone 6, а не финальный source of truth по deployed state. Финальное состояние проекта описано в этом README и [QA.md](./QA.md).
- Sync специально использует stable-id full reconciliation, а не undocumented RetailCRM delta filter. Это менее эффективно, но проще проверяется и безопаснее для scope тестового.
- При сомнении в результате Telegram delivery проект предпочитает duplicate-safety: `delivery_unknown` блокирует automatic retries.
- Формулировка из брифа “when an order appears in RetailCRM” реализована так: после import и sync серверный alert runner читает Supabase и отправляет одно сообщение при первом обнаружении заказа выше `50_000`.
- Sync reruns duplicate-safe, но не no-op: второй прогон всё равно переобновляет те же 50 orders и 81 line items.
- Публичный dashboard специально остаётся узким internal ops view, а не generalized analytics product.

## Технические Заметки

Import:

- stable `externalId` формат: `mock-retailcrm:<sourceOrderId>`
- create races сходятся в `skipped_existing` через повторный поиск в RetailCRM

Sync:

- reconciled only expected fixture-backed orders
- `order_items.external_item_id` используется как stable write key
- incomplete RetailCRM item payloads fail closed и не приводят к неявному удалению items

Alerts:

- qualifying orders читаются из Supabase, а не напрямую из RetailCRM
- threshold строго `> 50_000`, а не `>= 50_000`
- `notification_log.notification_key` обеспечивает one-send-per-order semantics
- текст alert-сообщений минимизирует PII и теперь локализован на русский

## Чеклист Перед Сдачей

Использовать [SUBMISSION_CHECKLIST.md](./SUBMISSION_CHECKLIST.md) как финальный go/no-go checklist.
