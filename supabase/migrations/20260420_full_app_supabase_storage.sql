create extension if not exists pgcrypto;

alter table public.stores
  alter column address1 set default '',
  add column if not exists owner_email text default '',
  add column if not exists theme_id text not null default 'minimal',
  add column if not exists theme_config jsonb not null default '{"heroTitle":"Welcome to your store","showBrands":true,"primaryColor":"#000000","font":"Inter","layout":"grid"}'::jsonb,
  add column if not exists onboarding_step integer not null default 1,
  add column if not exists is_onboarding_completed boolean not null default false;

alter table public.products
  add column if not exists low_stock_threshold integer not null default 5,
  add column if not exists gallery_image text default '',
  add column if not exists shipping jsonb not null default '{}'::jsonb,
  add column if not exists seo jsonb not null default '{}'::jsonb,
  add column if not exists limit_single_purchase boolean not null default false;

alter table public.orders
  add column if not exists customer_id uuid,
  add column if not exists customer_email text default '',
  add column if not exists products jsonb not null default '[]'::jsonb,
  add column if not exists subtotal_amount numeric(12, 2) not null default 0,
  add column if not exists discount_amount numeric(12, 2) not null default 0,
  add column if not exists final_amount numeric(12, 2) not null default 0,
  add column if not exists coupon_code text default '',
  add column if not exists total_amount numeric(12, 2) not null default 0,
  add column if not exists payment_method text not null default 'cod',
  add column if not exists payment_status text not null default 'pending',
  add column if not exists fulfillment_status text not null default 'unfulfilled',
  add column if not exists order_status text not null default 'open',
  add column if not exists shipping_address text default '';

create table if not exists public.order_timeline (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders (id) on delete cascade,
  status text not null,
  message text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.customers (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.stores (id) on delete cascade,
  name text default '',
  email text default '',
  phone text default '',
  total_orders integer not null default 0,
  total_spent numeric(12, 2) not null default 0,
  created_at timestamptz not null default now()
);

create unique index if not exists customers_store_email_unique
on public.customers (store_id, lower(email))
where email <> '';

create table if not exists public.coupons (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.stores (id) on delete cascade,
  code text not null,
  type text not null check (type in ('percentage', 'fixed')),
  value numeric(12, 2) not null check (value > 0),
  min_order_value numeric(12, 2) not null default 0,
  max_discount numeric(12, 2),
  usage_limit integer,
  used_count integer not null default 0,
  expires_at timestamptz,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create unique index if not exists coupons_store_code_unique
on public.coupons (store_id, upper(code));

create table if not exists public.store_apps (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.stores (id) on delete cascade,
  app_id text not null,
  enabled boolean not null default true,
  created_at timestamptz not null default now()
);

create unique index if not exists store_apps_store_app_unique
on public.store_apps (store_id, app_id);
