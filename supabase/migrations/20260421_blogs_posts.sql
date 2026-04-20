create extension if not exists pgcrypto;

create table if not exists public.blogs (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.stores (id) on delete cascade,
  title text not null,
  handle text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists blogs_store_handle_unique
on public.blogs (store_id, handle);

create table if not exists public.posts (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.stores (id) on delete cascade,
  blog_id uuid not null references public.blogs (id) on delete cascade,
  title text not null,
  slug text not null,
  excerpt text default '',
  content text default '',
  featured_image text default '',
  thumbnail text default '',
  category_id uuid references public.categories (id) on delete set null,
  tags text[] not null default '{}'::text[],
  is_published boolean not null default false,
  published_at timestamptz,
  scheduled_at timestamptz,
  seo_title text default '',
  seo_description text default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists posts_blog_slug_unique
on public.posts (blog_id, slug);

drop trigger if exists blogs_handle_updated_at on public.blogs;
create trigger blogs_handle_updated_at
before update on public.blogs
for each row execute procedure public.handle_updated_at();

drop trigger if exists posts_handle_updated_at on public.posts;
create trigger posts_handle_updated_at
before update on public.posts
for each row execute procedure public.handle_updated_at();

alter table public.blogs enable row level security;
alter table public.posts enable row level security;

drop policy if exists "Users can view store blogs" on public.blogs;
create policy "Users can view store blogs"
on public.blogs
for select
using (
  exists (
    select 1
    from public.stores
    where stores.id = blogs.store_id
      and stores.owner_id = auth.uid()
  )
);

drop policy if exists "Users can create store blogs" on public.blogs;
create policy "Users can create store blogs"
on public.blogs
for insert
with check (
  exists (
    select 1
    from public.stores
    where stores.id = blogs.store_id
      and stores.owner_id = auth.uid()
  )
);

drop policy if exists "Users can update store blogs" on public.blogs;
create policy "Users can update store blogs"
on public.blogs
for update
using (
  exists (
    select 1
    from public.stores
    where stores.id = blogs.store_id
      and stores.owner_id = auth.uid()
  )
)
with check (
  exists (
    select 1
    from public.stores
    where stores.id = blogs.store_id
      and stores.owner_id = auth.uid()
  )
);

drop policy if exists "Users can delete store blogs" on public.blogs;
create policy "Users can delete store blogs"
on public.blogs
for delete
using (
  exists (
    select 1
    from public.stores
    where stores.id = blogs.store_id
      and stores.owner_id = auth.uid()
  )
);

drop policy if exists "Public can view blogs" on public.blogs;
create policy "Public can view blogs"
on public.blogs
for select
using (true);

drop policy if exists "Users can view store posts" on public.posts;
create policy "Users can view store posts"
on public.posts
for select
using (
  exists (
    select 1
    from public.stores
    where stores.id = posts.store_id
      and stores.owner_id = auth.uid()
  )
);

drop policy if exists "Users can create store posts" on public.posts;
create policy "Users can create store posts"
on public.posts
for insert
with check (
  exists (
    select 1
    from public.stores
    where stores.id = posts.store_id
      and stores.owner_id = auth.uid()
  )
);

drop policy if exists "Users can update store posts" on public.posts;
create policy "Users can update store posts"
on public.posts
for update
using (
  exists (
    select 1
    from public.stores
    where stores.id = posts.store_id
      and stores.owner_id = auth.uid()
  )
)
with check (
  exists (
    select 1
    from public.stores
    where stores.id = posts.store_id
      and stores.owner_id = auth.uid()
  )
);

drop policy if exists "Users can delete store posts" on public.posts;
create policy "Users can delete store posts"
on public.posts
for delete
using (
  exists (
    select 1
    from public.stores
    where stores.id = posts.store_id
      and stores.owner_id = auth.uid()
  )
);

drop policy if exists "Public can view published posts" on public.posts;
create policy "Public can view published posts"
on public.posts
for select
using (is_published = true);
