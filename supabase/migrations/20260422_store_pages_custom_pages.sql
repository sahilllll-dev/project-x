alter table public.store_pages
add column if not exists title text not null default '',
add column if not exists content text not null default '',
add column if not exists status text not null default 'draft',
add column if not exists meta_title text not null default '',
add column if not exists meta_description text not null default '',
add column if not exists updated_at timestamptz not null default now();

update public.store_pages
set title = coalesce(nullif(title, ''), name, 'Untitled page')
where title = '';

drop trigger if exists store_pages_handle_updated_at on public.store_pages;
create trigger store_pages_handle_updated_at
before update on public.store_pages
for each row execute procedure public.handle_updated_at();
