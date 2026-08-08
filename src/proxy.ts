import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { SESSION_COOKIE, sessionToken } from '@/lib/auth';

/**
 * Gate the whole planner behind the shared password. Next 16 renamed `middleware.ts`
 * to `proxy.ts`; it runs on the Node.js runtime, so node:crypto is available here.
 *
 * Fails closed: with no ADMIN_PASSWORD set, sessionToken() can never match a cookie
 * and every request lands on /login, which reports the misconfiguration.
 */
export function proxy(request: NextRequest) {
  if (request.cookies.get(SESSION_COOKIE)?.value === sessionToken()) {
    return NextResponse.next();
  }

  const { pathname, search } = request.nextUrl;
  const url = request.nextUrl.clone();
  url.pathname = '/login';
  url.search = pathname === '/' ? '' : `?next=${encodeURIComponent(pathname + search)}`;
  return NextResponse.redirect(url);
}

export const config = {
  matcher: ['/((?!login|api/login|_next/static|_next/image|favicon.ico|logo.png).*)'],
};
