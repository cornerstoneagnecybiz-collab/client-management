import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';
import { getSupabasePublishableKey, getSupabaseUrl } from './env';

const dashboardPaths = ['/', '/activity', '/projects', '/requirements', '/fulfilments', '/vendors', '/clients', '/finance', '/ledger', '/catalog', '/reports', '/audit', '/settings'];

function isDashboardPath(pathname: string): boolean {
  if (pathname === '/') return true;
  return dashboardPaths.some((p) => p !== '/' && pathname.startsWith(p));
}

/** Copy Set-Cookie headers from one response to another (e.g. when redirecting). */
function copySetCookieHeaders(from: NextResponse, to: NextResponse) {
  const setCookies = from.headers.getSetCookie?.();
  if (setCookies) {
    setCookies.forEach((cookie) => to.headers.append('Set-Cookie', cookie));
  }
}

export async function updateSession(request: NextRequest) {
  const pathname = request.nextUrl.pathname;

  try {
    const response = NextResponse.next({
      request,
    });

    const supabase = createServerClient(
      getSupabaseUrl(),
      getSupabasePublishableKey(),
      {
        cookies: {
          getAll() {
            return request.cookies.getAll();
          },
          setAll(cookiesToSet: { name: string; value: string; options?: Record<string, unknown> }[]) {
            cookiesToSet.forEach(({ name, value, options }) =>
              response.cookies.set(name, value, options)
            );
          },
        },
      }
    );

    const { data: { user } } = await supabase.auth.getUser();

    if (!user && isDashboardPath(pathname)) {
      const redirectResponse = NextResponse.redirect(new URL('/login', request.url));
      copySetCookieHeaders(response, redirectResponse);
      return redirectResponse;
    }

    if (user && (pathname === '/login' || pathname === '/auth/callback')) {
      const redirectResponse = NextResponse.redirect(new URL('/', request.url));
      copySetCookieHeaders(response, redirectResponse);
      return redirectResponse;
    }

    return response;
  } catch {
    if (isDashboardPath(pathname)) {
      return NextResponse.redirect(new URL('/login', request.url));
    }
    return NextResponse.next({ request });
  }
}
