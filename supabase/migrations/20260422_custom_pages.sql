create table if not exists public.pages (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.stores (id) on delete cascade,
  title text not null,
  slug text not null,
  content text not null default '',
  status text not null default 'draft' check (status in ('draft', 'published')),
  meta_title text not null default '',
  meta_description text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.pages
add column if not exists content text not null default '',
add column if not exists status text not null default 'draft',
add column if not exists meta_title text not null default '',
add column if not exists meta_description text not null default '',
add column if not exists updated_at timestamptz not null default now();

create unique index if not exists pages_store_slug_unique
on public.pages (store_id, slug);

drop trigger if exists pages_handle_updated_at on public.pages;
create trigger pages_handle_updated_at
before update on public.pages
for each row execute procedure public.handle_updated_at();
