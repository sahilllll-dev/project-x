create extension if not exists pgcrypto;

create table if not exists public.categories (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.stores (id) on delete cascade,
  parent_id uuid references public.categories (id) on delete set null,
  name text not null,
  slug text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists categories_store_slug_unique
on public.categories (store_id, slug);

drop trigger if exists categories_handle_updated_at on public.categories;
create trigger categories_handle_updated_at
before update on public.categories
for each row execute procedure public.handle_updated_at();

alter table public.categories enable row level security;

drop policy if exists "Users can view store categories" on public.categories;
create policy "Users can view store categories"
on public.categories
for select
using (
  exists (
    select 1
    from public.stores
    where stores.id = categories.store_id
      and stores.owner_id = auth.uid()
  )
);

drop policy if exists "Users can create store categories" on public.categories;
create policy "Users can create store categories"
on public.categories
for insert
with check (
  exists (
    select 1
    from public.stores
    where stores.id = categories.store_id
      and stores.owner_id = auth.uid()
  )
);

drop policy if exists "Users can update store categories" on public.categories;
create policy "Users can update store categories"
on public.categories
for update
using (
  exists (
    select 1
    from public.stores
    where stores.id = categories.store_id
      and stores.owner_id = auth.uid()
  )
)
with check (
  exists (
    select 1
    from public.stores
    where stores.id = categories.store_id
      and stores.owner_id = auth.uid()
  )
);

drop policy if exists "Users can delete store categories" on public.categories;
create policy "Users can delete store categories"
on public.categories
for delete
using (
  exists (
    select 1
    from public.stores
    where stores.id = categories.store_id
      and stores.owner_id = auth.uid()
  )
);

drop policy if exists "Public can view categories" on public.categories;
create policy "Public can view categories"
on public.categories
for select
using (true);
