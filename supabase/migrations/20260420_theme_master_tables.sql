create extension if not exists pgcrypto;

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

insert into public.themes (name, code, preview_image)
values
  ('Minimal Store', 'minimal', null),
  ('Modern Store', 'modern', null),
  ('Kalles Style', 'kalles', null)
on conflict (code) do update
set
  name = excluded.name,
  preview_image = excluded.preview_image;

insert into public.store_themes (store_id, theme_id, config, is_active)
select
  stores.id,
  themes.id,
  coalesce(stores.theme_config, '{}'::jsonb),
  true
from public.stores stores
join public.themes themes
  on themes.code = coalesce(nullif(stores.theme_id, ''), 'minimal')
on conflict (store_id)
where is_active = true
do update
set
  theme_id = excluded.theme_id,
  config = excluded.config;
