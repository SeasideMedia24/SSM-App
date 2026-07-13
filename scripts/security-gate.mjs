// Contractors Slice B1 — the 5-point security gate (docs/CONTRACTOR-LOGINS-PLAN.md).
//
// Run AFTER applying migration 20260712000001 to the live database:
//
//   node --env-file=.env.local scripts/security-gate.mjs
//
// It builds a throwaway world (a contractor login + a project it's assigned
// to + one that it isn't), signs in AS that contractor with the public anon
// client, and probes the API the way a malicious team member would — then
// cleans everything up. Exits non-zero if ANY check fails. No real data is
// touched; everything it creates is prefixed "GATE-" and deleted at the end.

import { createClient } from '@supabase/supabase-js';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
if (!url || !serviceKey || !anonKey) {
  console.error('Missing Supabase env vars — run with:  node --env-file=.env.local scripts/security-gate.mjs');
  process.exit(1);
}

const admin = createClient(url, serviceKey, { auth: { persistSession: false } });
const results = [];
const check = (name, pass, detail = '') => {
  results.push(pass);
  console.log(`  ${pass ? '✓' : '✗ FAIL'}  ${name}${detail ? ` — ${detail}` : ''}`);
};

// ── Build the throwaway world ────────────────────────────────────────────────
const email = `gate-${Date.now()}@example.com`;
const password = `Gate-${crypto.randomUUID()}`;
let userId, contractorId, clientId, projInId, projOutId, taskMineId, taskOtherId;

async function setup() {
  const { data: client_ } = await admin.from('clients').insert({ name: 'GATE-client' }).select('id').single();
  clientId = client_.id;
  const { data: pIn } = await admin.from('projects').insert({ client_id: clientId, title: 'GATE-assigned-project' }).select('id').single();
  projInId = pIn.id;
  const { data: pOut } = await admin.from('projects').insert({ client_id: clientId, title: 'GATE-other-project' }).select('id').single();
  projOutId = pOut.id;

  const { data: contractor } = await admin
    .from('contractors')
    .insert({ name: 'GATE-contractor', type: 'external', email, rate_full: 111 })
    .select('id')
    .single();
  contractorId = contractor.id;

  // Create the login the same way the invite trigger would land it.
  const { data: created, error: userErr } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name: 'GATE contractor', contractor_id: contractorId },
  });
  if (userErr) throw new Error(`could not create throwaway user: ${userErr.message}`);
  userId = created.user.id;
  // The on_auth_user_created trigger should have linked + stamped the role;
  // assert rather than silently patch, since that IS part of the gate.
  const { data: linked } = await admin.from('contractors').select('user_id').eq('id', contractorId).single();
  check('signup trigger linked the login to the contractor record', linked?.user_id === userId);
  const { data: prof } = await admin.from('profiles').select('role').eq('id', userId).single();
  check("signup trigger stamped role = 'contractor'", prof?.role === 'contractor');

  await admin.from('project_contractors').insert({ project_id: projInId, contractor_id: contractorId, role: 'Editor' });
  const { data: tMine } = await admin
    .from('tasks')
    .insert({ project_id: projInId, title: 'GATE-my-task', assignee_id: userId })
    .select('id')
    .single();
  taskMineId = tMine.id;
  const { data: tOther } = await admin.from('tasks').insert({ project_id: projOutId, title: 'GATE-other-task' }).select('id').single();
  taskOtherId = tOther.id;
}

async function cleanup() {
  // Order matters (FKs). Best-effort — GATE- prefix makes strays findable.
  await admin.from('tasks').delete().in('id', [taskMineId, taskOtherId].filter(Boolean));
  await admin.from('project_contractors').delete().eq('contractor_id', contractorId);
  await admin.from('contractors').delete().eq('id', contractorId);
  await admin.from('projects').delete().in('id', [projInId, projOutId].filter(Boolean));
  await admin.from('clients').delete().eq('id', clientId);
  if (userId) await admin.auth.admin.deleteUser(userId);
}

// ── The gate ─────────────────────────────────────────────────────────────────
try {
  console.log('Setting up a throwaway contractor world…');
  await setup();

  const c = createClient(url, anonKey, { auth: { persistSession: false } });
  const { error: signInErr } = await c.auth.signInWithPassword({ email, password });
  if (signInErr) throw new Error(`could not sign in as the throwaway contractor: ${signInErr.message}`);
  console.log('Signed in as the contractor. Probing…');

  // 1. Sees ONLY assigned projects.
  const { data: projs } = await c.from('projects').select('id, title');
  check('sees the assigned project', (projs ?? []).some((p) => p.id === projInId));
  check('cannot see the unassigned project', !(projs ?? []).some((p) => p.id === projOutId), `${projs?.length ?? 0} project(s) visible`);

  // 2. Money + client tables come back EMPTY.
  for (const table of ['clients', 'quotes', 'invoices', 'contracts', 'rate_presets', 'pricing_roles', 'paepae_actions', 'onboarding_submissions']) {
    const { data, error } = await c.from(table).select('*').limit(5);
    check(`no access to ${table}`, (data ?? []).length === 0, error ? 'denied' : `${data?.length ?? 0} rows`);
  }

  // 3. Own task: status flip works; title change is rejected; other's task is untouchable.
  const { error: statusErr } = await c.from('tasks').update({ status: 'in_progress' }).eq('id', taskMineId);
  const { data: afterStatus } = await admin.from('tasks').select('status').eq('id', taskMineId).single();
  check('can update own task status', !statusErr && afterStatus?.status === 'in_progress');

  const { error: noteErr } = await c.from('tasks').update({ worker_note: 'gate note' }).eq('id', taskMineId);
  const { data: afterNote } = await admin.from('tasks').select('worker_note').eq('id', taskMineId).single();
  check('can write own worker note', !noteErr && afterNote?.worker_note === 'gate note');

  const { error: titleErr } = await c.from('tasks').update({ title: 'HACKED' }).eq('id', taskMineId);
  const { data: afterTitle } = await admin.from('tasks').select('title').eq('id', taskMineId).single();
  check('cannot change own task TITLE (column guard)', afterTitle?.title === 'GATE-my-task', titleErr ? 'rejected' : 'accepted?!');

  await c.from('tasks').update({ status: 'done' }).eq('id', taskOtherId);
  const { data: otherAfter } = await admin.from('tasks').select('status').eq('id', taskOtherId).single();
  check("cannot touch someone else's task", otherAfter?.status !== 'done');

  // 4. Contractors table: own row only; type change rejected.
  const { data: cons } = await c.from('contractors').select('id, rate_full');
  check('sees exactly one contractor row (their own)', (cons ?? []).length === 1 && cons?.[0]?.id === contractorId);
  await c.from('contractors').update({ type: 'employee' }).eq('id', contractorId);
  const { data: conAfter } = await admin.from('contractors').select('type').eq('id', contractorId).single();
  check('cannot change own type (column guard)', conAfter?.type === 'external');

  // 5. Cannot create or delete anything.
  const { error: insErr } = await c.from('tasks').insert({ title: 'GATE-sneaky' });
  check('cannot create tasks', !!insErr);
  const { error: delErr, count } = await c.from('tasks').delete({ count: 'exact' }).eq('id', taskMineId);
  check('cannot delete tasks', !!delErr || count === 0);

  await c.auth.signOut();
} catch (err) {
  console.error(`\nGate aborted: ${err.message}`);
  results.push(false);
} finally {
  console.log('Cleaning up the throwaway world…');
  await cleanup();
}

const failed = results.filter((r) => !r).length;
console.log(`\n${results.length - failed}/${results.length} checks passed.`);
if (failed > 0) {
  console.log('❌ GATE FAILED — do NOT invite anyone until this passes.');
  process.exit(1);
}
console.log('✅ GATE PASSED — safe to send the first real invite.');
