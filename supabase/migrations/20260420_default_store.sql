alter table public.stores
add column if not exists is_default boolean not null default false;

create unique index if not exists one_default_store_per_owner
on public.stores (owner_id)
where is_default = true;
