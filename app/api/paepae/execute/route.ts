// PaePae execute endpoint — the ONLY door a confirmed proposal can walk through.
//
// The chat UI posts { action, params } here when (and only when) the user
// clicks Confirm on a proposal card. We then:
//   1. require a signed-in user (same auth gate as the rest of the app),
//   2. re-validate the action against the zod schemas (never trusting what
//      came back from the browser),
//   3. execute it through the caller's RLS-scoped Supabase client,
//   4. refresh the app pages the change touches.
//
// PaePae itself never calls this — only the user's click does.

import { NextRequest, NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import {
  isActionName,
  executeAction,
  pathsToRevalidate,
} from '@/lib/paepae/actions';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: 'Invalid JSON' }, { status: 400 });
  }

  const { action, params } = (body ?? {}) as { action?: unknown; params?: unknown };
  if (!isActionName(action)) {
    return NextResponse.json({ ok: false, error: 'Unknown action' }, { status: 400 });
  }

  try {
    // executeAction re-validates params internally before touching the DB.
    const message = await executeAction(action, params, supabase);
    for (const path of pathsToRevalidate(action)) revalidatePath(path);
    return NextResponse.json({ ok: true, message });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'The action failed.';
    return NextResponse.json({ ok: false, error: message }, { status: 400 });
  }
}
