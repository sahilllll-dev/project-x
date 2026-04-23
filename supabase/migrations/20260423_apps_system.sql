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

create table if not exists public.apps (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  description text not null default '',
  icon text not null default '',
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

insert into public.apps (slug, name, description, icon, is_active)
values
  ('seo-helper', 'SEO Helper', 'Improve product metadata, search snippets, and storefront SEO.', 'seo-icon', true),
  ('analytics', 'Analytics', 'Track storefront activity, sales trends, and conversion signals.', 'analytics-icon', true),
  ('product-labels', 'Product Labels', 'Highlight bestsellers, new arrivals, sale items, and custom badges.', 'labels-icon', true),
  ('custom-scripts', 'Custom Scripts', 'Add approved tracking snippets and storefront scripts.', 'scripts-icon', true)
on conflict (slug) do update
set
  name = excluded.name,
  description = excluded.description,
  icon = excluded.icon,
  is_active = excluded.is_active,
  updated_at = now();

create table if not exists public.store_apps (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.stores (id) on delete cascade,
  app_id text not null,
  enabled boolean not null default true,
  created_at timestamptz not null default now()
);

alter table public.store_apps
  add column if not exists installed_at timestamptz,
  add column if not exists updated_at timestamptz;

update public.store_apps
set
  installed_at = coalesce(installed_at, created_at, now()),
  updated_at = coalesce(updated_at, created_at, now())
where installed_at is null
  or updated_at is null;

alter table public.store_apps
  alter column installed_at set default now(),
  alter column installed_at set not null,
  alter column updated_at set default now(),
  alter column updated_at set not null;

create unique index if not exists store_apps_store_app_unique
on public.store_apps (store_id, app_id);

create index if not exists store_apps_store_idx
on public.store_apps (store_id);

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'store_apps_app_id_fkey'
      and conrelid = 'public.store_apps'::regclass
  ) then
    alter table public.store_apps
      add constraint store_apps_app_id_fkey
      foreign key (app_id)
      references public.apps (slug)
      on delete cascade
      not valid;
  end if;
end $$;

create table if not exists public.store_app_configs (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.stores (id) on delete cascade,
  app_id uuid not null references public.apps (id) on delete cascade,
  config jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists store_app_configs_store_app_unique
on public.store_app_configs (store_id, app_id);

create index if not exists store_app_configs_store_idx
on public.store_app_configs (store_id);

drop trigger if exists apps_handle_updated_at on public.apps;
create trigger apps_handle_updated_at
before update on public.apps
for each row execute procedure public.handle_updated_at();

drop trigger if exists store_apps_handle_updated_at on public.store_apps;
create trigger store_apps_handle_updated_at
before update on public.store_apps
for each row execute procedure public.handle_updated_at();

drop trigger if exists store_app_configs_handle_updated_at on public.store_app_configs;
create trigger store_app_configs_handle_updated_at
before update on public.store_app_configs
for each row execute procedure public.handle_updated_at();

alter table public.apps enable row level security;
alter table public.store_apps enable row level security;
alter table public.store_app_configs enable row level security;

drop policy if exists "Public can view active apps" on public.apps;
create policy "Public can view active apps"
on public.apps
for select
using (is_active = true);

drop policy if exists "Users can view store apps" on public.store_apps;
create policy "Users can view store apps"
on public.store_apps
for select
using (
  exists (
    select 1
    from public.stores
    where stores.id = store_apps.store_id
      and stores.owner_id = auth.uid()
  )
);

drop policy if exists "Users can install store apps" on public.store_apps;
create policy "Users can install store apps"
on public.store_apps
for insert
with check (
  exists (
    select 1
    from public.stores
    where stores.id = store_apps.store_id
      and stores.owner_id = auth.uid()
  )
);

drop policy if exists "Users can update store apps" on public.store_apps;
create policy "Users can update store apps"
on public.store_apps
for update
using (
  exists (
    select 1
    from public.stores
    where stores.id = store_apps.store_id
      and stores.owner_id = auth.uid()
  )
)
with check (
  exists (
    select 1
    from public.stores
    where stores.id = store_apps.store_id
      and stores.owner_id = auth.uid()
  )
);

drop policy if exists "Users can uninstall store apps" on public.store_apps;
create policy "Users can uninstall store apps"
on public.store_apps
for delete
using (
  exists (
    select 1
    from public.stores
    where stores.id = store_apps.store_id
      and stores.owner_id = auth.uid()
  )
);

drop policy if exists "Users can view store app configs" on public.store_app_configs;
create policy "Users can view store app configs"
on public.store_app_configs
for select
using (
  exists (
    select 1
    from public.stores
    where stores.id = store_app_configs.store_id
      and stores.owner_id = auth.uid()
  )
);

drop policy if exists "Users can create store app configs" on public.store_app_configs;
create policy "Users can create store app configs"
on public.store_app_configs
for insert
with check (
  exists (
    select 1
    from public.stores
    where stores.id = store_app_configs.store_id
      and stores.owner_id = auth.uid()
  )
);

drop policy if exists "Users can update store app configs" on public.store_app_configs;
create policy "Users can update store app configs"
on public.store_app_configs
for update
using (
  exists (
    select 1
    from public.stores
    where stores.id = store_app_configs.store_id
      and stores.owner_id = auth.uid()
  )
)
with check (
  exists (
    select 1
    from public.stores
    where stores.id = store_app_configs.store_id
      and stores.owner_id = auth.uid()
  )
);
