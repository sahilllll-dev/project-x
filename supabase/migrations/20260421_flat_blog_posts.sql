alter table if exists public.posts
alter column blog_id drop not null;

alter table if exists public.posts
drop constraint if exists posts_blog_id_fkey;

alter table if exists public.posts
add constraint posts_blog_id_fkey
foreign key (blog_id)
references public.blogs (id)
on delete set null;

create unique index if not exists posts_store_slug_unique
on public.posts (store_id, slug);
