create extension if not exists pgcrypto;

create or replace function public.handle_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text unique not null,
  full_name text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email)
  values (new.id, new.email)
  on conflict (id) do update set email = excluded.email;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute procedure public.handle_new_user();

create table if not exists public.stores (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users (id) on delete cascade,
  name text not null,
  slug text not null unique,
  subdomain text not null unique,
  address1 text not null,
  address2 text,
  logo_url text,
  is_default boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users (id) on delete cascade,
  store_id uuid not null references public.stores (id) on delete cascade,
  title text not null,
  description text default '',
  category text default '',
  price numeric(12, 2) not null check (price >= 0),
  discounted_price numeric(12, 2) check (discounted_price is null or discounted_price >= 0),
  quantity integer not null default 0 check (quantity >= 0),
  sku text default '',
  status text not null default 'inactive' check (status in ('active', 'inactive')),
  image_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users (id) on delete cascade,
  store_id uuid not null references public.stores (id) on delete cascade,
  product_id uuid references public.products (id) on delete set null,
  product_title text not null,
  price numeric(12, 2) not null check (price >= 0),
  customer_name text not null,
  phone text not null,
  address text not null,
  status text not null default 'pending' check (status in ('pending', 'confirmed', 'delivered', 'cancelled')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.themes (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  code text unique not null,
  preview_image text,
  created_at timestamptz not null default now()
);

create table if not exists public.store_themes (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.stores (id) on delete cascade,
  theme_id uuid not null references public.themes (id),
  config jsonb not null default '{}'::jsonb,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create unique index if not exists one_active_theme_per_store
on public.store_themes (store_id)
where is_active = true;

create table if not exists public.store_pages (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.stores (id) on delete cascade,
  name text not null default 'homepage',
  slug text not null default '/',
  layout jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create unique index if not exists store_pages_store_slug_unique
on public.store_pages (store_id, slug);

create unique index if not exists one_default_store_per_owner
on public.stores (owner_id)
where is_default = true;

insert into public.themes (name, code, preview_image)
values
  ('Minimal Store', 'minimal', null),
  ('Modern Store', 'modern', null),
  ('Kalles Style', 'kalles', null)
on conflict (code) do update
set
  name = excluded.name,
  preview_image = excluded.preview_image;

drop trigger if exists stores_handle_updated_at on public.stores;
create trigger stores_handle_updated_at
before update on public.stores
for each row execute procedure public.handle_updated_at();

drop trigger if exists products_handle_updated_at on public.products;
create trigger products_handle_updated_at
before update on public.products
for each row execute procedure public.handle_updated_at();

drop trigger if exists orders_handle_updated_at on public.orders;
create trigger orders_handle_updated_at
before update on public.orders
for each row execute procedure public.handle_updated_at();

drop trigger if exists profiles_handle_updated_at on public.profiles;
create trigger profiles_handle_updated_at
before update on public.profiles
for each row execute procedure public.handle_updated_at();

alter table public.profiles enable row level security;
alter table public.stores enable row level security;
alter table public.products enable row level security;
alter table public.orders enable row level security;

drop policy if exists "Users can view their own profile" on public.profiles;
create policy "Users can view their own profile"
on public.profiles
for select
using (auth.uid() = id);

drop policy if exists "Users can update their own profile" on public.profiles;
create policy "Users can update their own profile"
on public.profiles
for update
using (auth.uid() = id)
with check (auth.uid() = id);

drop policy if exists "Users can view their stores" on public.stores;
create policy "Users can view their stores"
on public.stores
for select
using (auth.uid() = owner_id);

drop policy if exists "Users can create stores" on public.stores;
create policy "Users can create stores"
on public.stores
for insert
with check (auth.uid() = owner_id);

drop policy if exists "Users can update their stores" on public.stores;
create policy "Users can update their stores"
on public.stores
for update
using (auth.uid() = owner_id)
with check (auth.uid() = owner_id);

drop policy if exists "Users can delete their stores" on public.stores;
create policy "Users can delete their stores"
on public.stores
for delete
using (auth.uid() = owner_id);

drop policy if exists "Public can view stores" on public.stores;
create policy "Public can view stores"
on public.stores
for select
using (true);

drop policy if exists "Users can view their products" on public.products;
create policy "Users can view their products"
on public.products
for select
using (auth.uid() = owner_id);

drop policy if exists "Users can create products" on public.products;
create policy "Users can create products"
on public.products
for insert
with check (auth.uid() = owner_id);

drop policy if exists "Users can update their products" on public.products;
create policy "Users can update their products"
on public.products
for update
using (auth.uid() = owner_id)
with check (auth.uid() = owner_id);

drop policy if exists "Users can delete their products" on public.products;
create policy "Users can delete their products"
on public.products
for delete
using (auth.uid() = owner_id);

drop policy if exists "Public can view active products" on public.products;
create policy "Public can view active products"
on public.products
for select
using (status = 'active');

drop policy if exists "Users can view their orders" on public.orders;
create policy "Users can view their orders"
on public.orders
for select
using (auth.uid() = owner_id);

drop policy if exists "Public can create orders" on public.orders;
create policy "Public can create orders"
on public.orders
for insert
with check (true);

drop policy if exists "Users can update their orders" on public.orders;
create policy "Users can update their orders"
on public.orders
for update
using (auth.uid() = owner_id)
with check (auth.uid() = owner_id);
