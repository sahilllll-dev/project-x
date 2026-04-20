create table if not exists public.blog_posts (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.stores (id) on delete cascade,
  title text not null,
  slug text not null,
  content text not null default '',
  excerpt text default '',
  featured_image text,
  is_published boolean not null default false,
  published_at timestamptz,
  meta_title text,
  meta_description text,
  tags text[] not null default '{}'::text[],
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.blog_posts
add column if not exists excerpt text default '',
add column if not exists featured_image text,
add column if not exists is_published boolean not null default false,
add column if not exists meta_title text,
add column if not exists meta_description text,
add column if not exists tags text[] not null default '{}'::text[];

alter table public.blog_posts
alter column tags type text[]
using case
  when tags is null then '{}'::text[]
  when pg_typeof(tags)::text = 'text[]' then tags::text[]
  else string_to_array(tags::text, ',')
end;

alter table public.blog_posts
alter column tags set default '{}'::text[],
alter column tags set not null;

alter table public.blog_posts
drop column if exists thumbnail_url,
drop column if exists status;

create unique index if not exists blog_posts_store_slug_unique
on public.blog_posts (store_id, slug);

drop trigger if exists blog_posts_handle_updated_at on public.blog_posts;
create trigger blog_posts_handle_updated_at
before update on public.blog_posts
for each row execute procedure public.handle_updated_at();

alter table public.blog_posts enable row level security;

drop policy if exists "Users can view store blog posts" on public.blog_posts;
create policy "Users can view store blog posts"
on public.blog_posts
for select
using (
  exists (
    select 1
    from public.stores
    where stores.id = blog_posts.store_id
      and stores.owner_id = auth.uid()
  )
);

drop policy if exists "Users can insert store blog posts" on public.blog_posts;
create policy "Users can insert store blog posts"
on public.blog_posts
for insert
with check (
  exists (
    select 1
    from public.stores
    where stores.id = blog_posts.store_id
      and stores.owner_id = auth.uid()
  )
);

drop policy if exists "Users can update store blog posts" on public.blog_posts;
create policy "Users can update store blog posts"
on public.blog_posts
for update
using (
  exists (
    select 1
    from public.stores
    where stores.id = blog_posts.store_id
      and stores.owner_id = auth.uid()
  )
)
with check (
  exists (
    select 1
    from public.stores
    where stores.id = blog_posts.store_id
      and stores.owner_id = auth.uid()
  )
);

drop policy if exists "Users can delete store blog posts" on public.blog_posts;
create policy "Users can delete store blog posts"
on public.blog_posts
for delete
using (
  exists (
    select 1
    from public.stores
    where stores.id = blog_posts.store_id
      and stores.owner_id = auth.uid()
  )
);
