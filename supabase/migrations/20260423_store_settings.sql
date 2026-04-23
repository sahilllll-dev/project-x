alter table public.stores
  add column if not exists description text not null default '',
  add column if not exists email text,
  add column if not exists phone text,
  add column if not exists currency text not null default 'INR',
  add column if not exists timezone text not null default 'Asia/Kolkata',
  add column if not exists favicon_url text,
  add column if not exists primary_color text not null default '#000000',
  add column if not exists secondary_color text not null default '#ffffff';
