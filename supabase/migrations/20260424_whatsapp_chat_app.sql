insert into public.apps (slug, name, description, icon, is_active)
values (
  'whatsapp-chat',
  'WhatsApp Chat',
  'Add a floating WhatsApp button with a pre-filled storefront message.',
  'whatsapp-icon',
  true
)
on conflict (slug) do update
set
  name = excluded.name,
  description = excluded.description,
  icon = excluded.icon,
  is_active = excluded.is_active,
  updated_at = now();
