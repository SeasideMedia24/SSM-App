// Session refresh + optimistic auth redirect, run from proxy.ts on every request.
//
// Supabase stores the auth session in cookies. Those cookies need refreshing as
// tokens expire; that has to happen in the proxy (formerly "middleware" — renamed
// in Next.js 16) because Server Components can't write cookies. This helper:
//   1. builds a request-bound Supabase client,
//   2. calls getUser() so the library refreshes the token cookie if needed,
//   3. bounces signed-out visitors to /login (an optimistic gate; the real
//      enforcement is re-checked in the protected layout, close to the data).

import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

// Routes a signed-out user is allowed to see (login, the public onboarding
// form, and shared quote links).
const PUBLIC_PREFIXES = ['/login', '/auth', '/onboard', '/contractor-onboard', '/quote'];

export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          // Write refreshed cookies onto both the request (for this pass) and
          // the outgoing response (so the browser gets them).
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  // IMPORTANT: do not run code between createServerClient and getUser() — it can
  // cause hard-to-debug session issues (per Supabase's SSR guidance).
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const path = request.nextUrl.pathname;
  const isPublic = PUBLIC_PREFIXES.some((p) => path === p || path.startsWith(p + '/'));

  if (!user && !isPublic) {
    const url = request.nextUrl.clone();
    url.pathname = '/login';
    return NextResponse.redirect(url);
  }

  // Must return this exact response so the refreshed cookies are preserved.
  return response;
}
