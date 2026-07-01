// Server-ONLY Supabase admin client.
//
// ⚠️  This uses the service-role key, which BYPASSES Row-Level Security.
//     - Only ever import this from server code (route handlers / server actions).
//     - Never import it into a "use client" component or anything the browser
//       downloads.
//     - Prefer the regular server client (./server.ts) for normal requests, so
//       RLS stays in force. Reach for this only for trusted admin/system tasks.
//
// The `import 'server-only'` line makes the build FAIL if this file is ever
// pulled into a client bundle — a guardrail against leaking the secret.

import 'server-only';
import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/types/database.types';

export function createAdminClient() {
  return createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    },
  );
}
