/**
 * Supabase env — latest concepts: publishable (public) vs secret key.
 * Supports both new names (NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY, SUPABASE_SECRET_KEY)
 * and legacy names (NEXT_PUBLIC_SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY).
 * @see https://supabase.com/docs/guides/api/api-keys
 */

function trim(s: string | undefined): string | undefined {
  const t = s?.trim();
  return t === '' ? undefined : t;
}

export function getSupabaseUrl(): string {
  const url = trim(process.env.NEXT_PUBLIC_SUPABASE_URL);
  if (!url) {
    throw new Error(
      'Missing NEXT_PUBLIC_SUPABASE_URL. Add it to .env or .env.local. See https://supabase.com/dashboard/project/_/settings/api'
    );
  }
  return url;
}

/** Public/publishable key — safe for browser and server with RLS. Use anon or sb_publishable_ key. */
export function getSupabasePublishableKey(): string {
  const key =
    trim(process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY) ??
    trim(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) ??
    trim(process.env.NEXT_PUBLIC_SUPABASE_KEY);
  if (!key) {
    throw new Error(
      'Missing Supabase public key. In .env or .env.local set one of: NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY or NEXT_PUBLIC_SUPABASE_ANON_KEY (required for browser). Get it from https://supabase.com/dashboard/project/_/settings/api'
    );
  }
  return key;
}

/** Secret key — server-only, bypasses RLS. Use service_role or sb_secret_ key. Never expose to client. */
export function getSupabaseSecretKey(): string | undefined {
  const k =
    trim(process.env.SUPABASE_SECRET_KEY) ??
    trim(process.env.SUPABASE_SERVICE_ROLE_KEY);
  return k;
}
