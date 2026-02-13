# Cornerstone OS

Operations + Finance + Vendor Management — internal ERP for a single company.

## Tech stack

- **Next.js 15** (App Router)
- **Supabase** (Database, Auth, Storage)
- **TypeScript**
- **Tailwind CSS**

## Setup

1. **Clone and install**

   ```bash
   npm install
   ```

2. **Supabase**

   - Create a project at [supabase.com](https://supabase.com).
   - Copy `.env.example` to `.env.local` and set:
     - `NEXT_PUBLIC_SUPABASE_URL`
     - `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` (use **Publishable** key from API Keys, or legacy **anon** key)
   - Optional, for server-only admin (bypass RLS): `SUPABASE_SECRET_KEY` (or legacy **service_role** key). Never expose to client.
   - App supports legacy names too: `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`.
   - Run migrations (Supabase Dashboard → SQL Editor, or CLI):
     - `supabase/migrations/20250101000000_cornerstone_os_schema.sql`
     - `supabase/migrations/20250101000001_seed_service_catalog.sql`
   - In Dashboard → Authentication → Providers, enable Email and set up a user for login.

3. **Storage buckets** (Dashboard → Storage): create private buckets:
   - `requirement-documents`
   - `invoice-documents`
   - `vendor-documents`

4. **Run**

   ```bash
   npm run dev
   ```

   Open [http://localhost:3000](http://localhost:3000). Sign in with your Supabase user.

## Troubleshooting

- **"Failed to fetch" / "Cannot reach Supabase"** — The browser cannot reach your Supabase API. Check:
  1. `.env.local` has `NEXT_PUBLIC_SUPABASE_URL` set to your project URL (e.g. `https://xxxx.supabase.co` from [Dashboard → Settings → API](https://supabase.com/dashboard/project/_/settings/api)). No trailing slash.
  2. If using local Supabase (`http://127.0.0.1:54321`), run `supabase start` and ensure the URL matches.
  3. Network: VPN, firewall, or ad blockers can block the request. Try in an incognito window or another network.

## Build order (implemented / planned)

- [x] Step 1: Supabase SQL schema
- [x] Step 2: TypeScript types
- [x] Step 3: Auth (login, callback, protected routes)
- [x] Step 4: Projects module
- [x] Step 5: Requirements + vendor assignment
- [x] Step 6: Finance layer
- [x] Step 7: Vendor Management
- [x] Step 8: Client Management
- [x] Step 9: Ledger
- [x] Step 10: Catalog
- [x] Step 11: Reports
- [x] Step 12: Dashboards

## Financial model

- **Planned profit** = client price − expected vendor cost (calculated).
- **Actual profit** = client received − vendor paid (from ledger).
- **Variance** = planned − actual. No stored totals; prefer derived values.

## Shortcuts

- **⌘K / Ctrl+K**: Command palette (search, quick actions).
