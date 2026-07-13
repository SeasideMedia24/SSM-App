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
import { getAppRole } from '@/lib/auth/role';
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
  // PaePae is owner-only (Slice B1) — same gate as the chat route.
  if ((await getAppRole(supabase)) !== 'owner') {
    return NextResponse.json({ ok: false, error: 'PaePae is only available to the owner.' }, { status: 403 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: 'Invalid JSON' }, { status: 400 });
  }

  const { action, params, summary } = (body ?? {}) as {
    action?: unknown;
    params?: unknown;
    summary?: unknown;
  };
  if (!isActionName(action)) {
    return NextResponse.json({ ok: false, error: 'Unknown action' }, { status: 400 });
  }

  try {
    // executeAction re-validates params internally before touching the DB.
    const message = await executeAction(action, params, supabase);
    for (const path of pathsToRevalidate(action)) revalidatePath(path);

    // Log the confirmed action so the dashboard can show what PaePae did. The
    // summary is the card's display lines (bounded); best-effort — a logging
    // failure must never fail the action the user already approved.
    const summaryLines = Array.isArray(summary)
      ? summary.filter((s): s is string => typeof s === 'string').slice(0, 40).map((s) => s.slice(0, 300))
      : [];
    await supabase
      .from('paepae_actions')
      .insert({ user_id: user.id, action, summary: summaryLines, result: message });

    return NextResponse.json({ ok: true, message });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'The action failed.';
    return NextResponse.json({ ok: false, error: message }, { status: 400 });
  }
}
