  import { type NextRequest } from 'next/server';
import { updateSession } from '@/lib/supabase/middleware';

export async function middleware(request: NextRequest) {
  return await updateSession(request);
}

export const config = {
  matcher: [
    '/',
    '/login',
    '/auth/callback',
    '/projects/:path*',
    '/requirements/:path*',
    '/vendors/:path*',
    '/clients/:path*',
    '/finance/:path*',
    '/ledger/:path*',
    '/catalog/:path*',
    '/reports/:path*',
    '/settings/:path*',
  ],
};
