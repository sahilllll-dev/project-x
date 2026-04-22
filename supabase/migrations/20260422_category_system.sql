alter table public.categories
  alter column store_id drop not null,
  add column if not exists is_default boolean not null default false;

alter table public.products
  add column if not exists category_id uuid;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'products_category_id_fkey'
      and conrelid = 'public.products'::regclass
  ) then
    alter table public.products
      add constraint products_category_id_fkey
      foreign key (category_id)
      references public.categories (id)
      on delete set null;
  end if;
end $$;

create index if not exists categories_store_default_idx
on public.categories (store_id, is_default);

create index if not exists products_category_id_idx
on public.products (category_id);
