alter table public.blogs
  add column if not exists slug text,
  add column if not exists content text default '',
  add column if not exists category_id uuid references public.categories (id) on delete set null,
  add column if not exists tags text[] not null default '{}'::text[],
  add column if not exists thumbnail_url text default '',
  add column if not exists meta_title text default '',
  add column if not exists meta_description text default '',
  add column if not exists status text not null default 'draft',
  add column if not exists published_at timestamptz;

create unique index if not exists blogs_store_slug_unique
on public.blogs (store_id, slug)
where slug is not null;
