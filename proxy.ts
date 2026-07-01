// Next.js 16 "Proxy" (this is what used to be called Middleware — same thing,
// renamed in v16). Runs before every matched request. We use it only to refresh
// the Supabase session cookie and do an optimistic signed-in/out redirect.
//
// See lib/supabase/proxy-session.ts for the actual logic.

import { type NextRequest } from 'next/server';
import { updateSession } from '@/lib/supabase/proxy-session';

export async function proxy(request: NextRequest) {
  return await updateSession(request);
}

export const config = {
  // Run on everything except Next internals and static image assets.
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)'],
};
