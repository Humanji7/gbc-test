create extension if not exists pgcrypto;

create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  external_id text not null unique,
  order_number text,
  status text not null,
  order_type text,
  order_method text,
  customer_first_name text,
  customer_last_name text,
  customer_phone text,
  customer_email text,
  city text,
  delivery_address text,
  utm_source text,
  total_amount numeric(12, 2) not null check (total_amount >= 0),
  currency text,
  created_at_source timestamptz,
  updated_at_source timestamptz,
  synced_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists orders_status_idx on public.orders (status);
create index if not exists orders_city_idx on public.orders (city);
create index if not exists orders_utm_source_idx on public.orders (utm_source);
create index if not exists orders_updated_at_source_idx on public.orders (updated_at_source desc);
alter table public.orders enable row level security;

create table if not exists public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  external_item_id text,
  sku text,
  product_name text not null,
  quantity integer not null check (quantity > 0),
  unit_price numeric(12, 2) not null check (unit_price >= 0),
  line_total numeric(12, 2) not null check (line_total >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists order_items_order_id_idx on public.order_items (order_id);
create unique index if not exists order_items_external_item_id_key on public.order_items (external_item_id);
alter table public.order_items enable row level security;

create table if not exists public.sync_state (
  id uuid primary key default gen_random_uuid(),
  sync_name text not null unique,
  last_cursor text,
  last_synced_at_source timestamptz,
  last_success_at timestamptz,
  last_error_at timestamptz,
  last_error_message text,
  updated_at timestamptz not null default now()
);
alter table public.sync_state enable row level security;

create table if not exists public.notification_log (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  notification_type text not null,
  notification_key text not null unique,
  status text not null default 'sending',
  sent_at timestamptz,
  error_message text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.notification_log enable row level security;

alter table public.notification_log
  add column if not exists updated_at timestamptz not null default now();

alter table public.notification_log
  alter column status set default 'sending';

alter table public.notification_log
  drop constraint if exists notification_log_status_check;

alter table public.notification_log
  add constraint notification_log_status_check
  check (status in ('pending', 'sending', 'sent', 'failed', 'delivery_unknown'));

create index if not exists notification_log_order_id_idx on public.notification_log (order_id);
create index if not exists notification_log_status_idx on public.notification_log (status);
