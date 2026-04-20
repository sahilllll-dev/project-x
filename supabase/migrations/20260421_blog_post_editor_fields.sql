alter table public.posts
  add column if not exists thumbnail text default '',
  add column if not exists category_id uuid references public.categories (id) on delete set null,
  add column if not exists scheduled_at timestamptz,
  add column if not exists seo_title text default '',
  add column if not exists seo_description text default '';
