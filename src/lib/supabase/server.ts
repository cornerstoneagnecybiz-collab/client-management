import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { getSupabasePublishableKey, getSupabaseSecretKey, getSupabaseUrl } from './env';

export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(
    getSupabaseUrl(),
    getSupabasePublishableKey(),
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // Server Component; ignore
          }
        },
      },
    }
  );
}

/**
 * Server-only client with secret key. Bypasses RLS — use only for admin operations.
 * Requires SUPABASE_SECRET_KEY or SUPABASE_SERVICE_ROLE_KEY. Throws if not set.
 */
export async function createServerAdminClient() {
  const secretKey = getSupabaseSecretKey();
  if (!secretKey) throw new Error('Missing SUPABASE_SECRET_KEY or SUPABASE_SERVICE_ROLE_KEY for admin client');
  return createServerClient(getSupabaseUrl(), secretKey, {
    cookies: { getAll: () => [], setAll: () => {} },
  });
}
