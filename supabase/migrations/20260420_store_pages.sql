create extension if not exists pgcrypto;

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
