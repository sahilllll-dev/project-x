# Supabase Setup

This repo now includes the Supabase SDK in both the React app and the Node server.

## Frontend

1. Copy `project-x/.env.example` to `project-x/.env`.
2. Add:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_PUBLISHABLE_KEY`
3. Restart Vite after editing env values.

The auth screens now prefer Supabase automatically when those env vars are present. Without them, the app falls back to the current local Express auth flow.

## Server

1. Copy `server/.env.example` to `server/.env`.
2. Add:
   - `SUPABASE_URL`
   - `SUPABASE_SERVICE_ROLE_KEY`

`server/supabaseAdmin.js` exposes a service-role client for future secure server-side operations like store provisioning, admin order updates, and product writes.

## Database

Run `supabase/schema.sql` in the Supabase SQL editor. It creates:

- `profiles`
- `stores`
- `products`
- `orders`
- triggers for `updated_at`
- a profile row on new auth signup
- row-level security policies

## Supabase Dashboard Settings

In Supabase Auth settings:

1. Set Site URL to `http://localhost:5173`
2. Add redirect URL: `http://localhost:5173/login?verified=true`
3. Keep email confirmation enabled

## Current Migration State

This setup gives you the Supabase foundation without breaking the current app:

- `Signup.jsx` and `Login.jsx` can use Supabase auth immediately once frontend env vars are set.
- Existing products/orders/store APIs are still the current source of truth until you migrate them to Supabase tables.
- The SQL schema is ready for that next migration step.

## Recommended Next Step

Migrate these in order:

1. Stores from `localStorage` to `public.stores`
2. Products from Express memory to `public.products`
3. Orders from Express memory to `public.orders`
4. Remove the temporary in-memory auth endpoints from `server/index.js`
