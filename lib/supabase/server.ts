// Server-side Supabase client (for Server Components, Route Handlers, and
// Server Actions). This is the default client for reading/writing data.
//
// It reads and writes the auth cookies so a logged-in session is available on
// the server. It uses the anon key + the user's session, so RLS still applies
// (this client cannot bypass Row-Level Security — that's the admin client's job).
//
// Note: cookies() is async in Next.js 15+, so this function is async too.

import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import type { Database } from '@/types/database.types';

export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options),
            );
          } catch {
            // `setAll` was called from a Server Component, where cookies are
            // read-only. This is safe to ignore when middleware is refreshing
            // the session (see middleware.ts, added in Phase 2).
          }
        },
      },
    },
  );
}
