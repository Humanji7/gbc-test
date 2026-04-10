# Supabase Schema Notes

`supabase/schema.sql` is the source of truth for the current database shape used through Milestone 6 and the pre-deploy pass.

It creates the minimum tables needed for the implemented flow:

- `orders`
- `order_items`
- `sync_state`
- `notification_log`

## Apply Options

If the Supabase project is linked in this repo, apply the schema with:

```bash
supabase db query --linked -f supabase/schema.sql
```

If you have a direct Postgres connection string, apply it with:

```bash
psql "$SUPABASE_DB_URL" -f supabase/schema.sql
```

## Security Notes

- Row Level Security is explicitly enabled on all four tables before deploy.
- The current app still uses server-side `service_role` access for import, sync, alerts, and dashboard reads.
- No public browser path should depend on direct table access.

## Validation

For local validation without touching a real Supabase project, the schema can be applied to a temporary local Postgres instance.
