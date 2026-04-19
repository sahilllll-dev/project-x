do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'unique_store_slug'
      and conrelid = 'public.stores'::regclass
  ) then
    alter table public.stores
    add constraint unique_store_slug unique (slug);
  end if;
end $$;
