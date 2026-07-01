// Browser-side Supabase client (for use inside "use client" components).
//
// Uses only the PUBLIC env vars. The anon key is safe to ship to the browser;
// Row-Level Security is what actually guards the data. Never import the
// service-role key here.

import { createBrowserClient } from '@supabase/ssr';
import type { Database } from '@/types/database.types';

export function createClient() {
  return createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
}
