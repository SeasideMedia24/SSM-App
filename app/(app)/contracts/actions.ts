'use server';

// Server actions for the contract editor + e-sign flow. A contract is generated
// from a quote (buildContractFromQuote), edited here, then "sent for signature"
// which snapshots the rendered document into body_md and mints a share_token.
// The client signs at /contract/<token> (see app/contract/[token]). RLS-scoped
// through the server client; input validated server-side.

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { headers } from 'next/headers';
import { createClient as createSupabaseServer } from '@/lib/supabase/server';
import { sendContractEmail } from '@/lib/email/send';
import { buildContractFromQuote } from '@/lib/contracts/create';
import { renderContract, normalizeDeliverables, type ContractTerms, type Deliverable } from '@/lib/contracts/template';
import { contractReadiness } from '@/lib/contracts/validate';

const MIGRATION_HINT =
  'Contracts need a quick database update — run supabase/migrations/20260714000001_contract_esign.sql in the Supabase SQL Editor, then try again.';

// From the calculator's saved-quote list: generate a draft contract, open it.
export async function createContractFromQuote(formData: FormData) {
  const quoteId = String(formData.get('quote_id') ?? '').trim();
  if (!quoteId) redirect('/calculator');

  const supabase = await createSupabaseServer();
  let contract: { id: string; project_id: string } | null = null;
  let message: string | null = null;
  try {
    contract = await buildContractFromQuote(supabase, quoteId);
  } catch (e) {
    message = e instanceof Error ? e.message : 'Could not generate the contract.';
  }
  if (!contract) {
    // Surface the reason (e.g. "attach a project first") on the calculator.
    redirect(`/calculator?contract_error=${encodeURIComponent(message ?? 'error')}`);
  }
  revalidatePath('/projects/contracts');
  revalidatePath(`/projects/${contract.project_id}`);
  redirect(`/contracts/${contract.id}`);
}

// Same as createContractFromQuote but RETURNS the id instead of redirecting, so
// a client button can navigate itself (router.push). Used by the calculator's
// "Create contract" button, where a form `formAction` override proved unreliable
// inside the big save form.
export async function generateContractForQuote(
  quoteId: string,
): Promise<{ ok: true; id: string } | { ok: false; error: string }> {
  if (!quoteId) return { ok: false, error: 'Missing quote.' };
  const supabase = await createSupabaseServer();
  try {
    const contract = await buildContractFromQuote(supabase, quoteId);
    revalidatePath('/projects/contracts');
    revalidatePath(`/projects/${contract.project_id}`);
    return { ok: true, id: contract.id };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Could not generate the contract.' };
  }
}

const num = (v: FormDataEntryValue | null): number | null => {
  const s = String(v ?? '').trim();
  if (s === '') return null;
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
};

export type ContractFormState = { ok: boolean; error: string | null };

// Save the editable terms. Deliverables arrive as one-per-line text.
export async function updateContractTerms(_prev: ContractFormState, f: FormData): Promise<ContractFormState> {
  const id = String(f.get('id') ?? '').trim();
  if (!id) return { ok: false, error: 'Missing contract.' };

  const title = String(f.get('title') ?? '').trim();
  if (!title) return { ok: false, error: 'Give the contract a title.' };

  const effRaw = String(f.get('effective_date') ?? '').trim();
  const effective_date = /^\d{4}-\d{2}-\d{2}$/.test(effRaw) ? effRaw : null;
  const prodRaw = String(f.get('production_date') ?? '').trim();
  const production_date = /^\d{4}-\d{2}-\d{2}$/.test(prodRaw) ? prodRaw : null;

  const deposit_amount = num(f.get('deposit_amount'));
  const production_amount = num(f.get('production_amount'));
  const delivery_amount = num(f.get('delivery_amount'));
  const revision_rounds = num(f.get('revision_rounds')) ?? 0;
  const revision_pct = num(f.get('revision_pct')) ?? 0;

  // Deliverables arrive as JSON: [{ title, due }]. Normalize + drop blanks.
  let deliverables: Deliverable[];
  try {
    deliverables = normalizeDeliverables(JSON.parse(String(f.get('deliverables_json') ?? '[]')));
  } catch {
    deliverables = [];
  }

  for (const [label, v] of [['Deposit', deposit_amount], ['After production', production_amount], ['After delivery', delivery_amount]] as const) {
    if (v !== null && v < 0) return { ok: false, error: `${label} amount can’t be negative.` };
  }

  const supabase = await createSupabaseServer();
  const { error } = await supabase
    .from('contracts')
    .update({
      title,
      effective_date,
      production_date,
      deposit_amount,
      production_amount,
      delivery_amount,
      revision_rounds: Math.max(0, Math.round(revision_rounds)),
      revision_pct: Math.max(0, Math.round(revision_pct)),
      amount: deposit_amount != null || production_amount != null || delivery_amount != null
        ? (deposit_amount ?? 0) + (production_amount ?? 0) + (delivery_amount ?? 0)
        : null,
      deliverables_snapshot: deliverables,
    })
    .eq('id', id);
  if (error) return { ok: false, error: error.code === '42703' ? MIGRATION_HINT : 'Could not save. Please try again.' };

  revalidatePath(`/contracts/${id}`);
  return { ok: true, error: null };
}

export type SendResult =
  | { ok: true; token: string; emailedTo?: string | null; emailNote?: string | null }
  | { ok: false; error: string; missing?: string[] };

// Render + snapshot the document, mark sent, mint the share link. Blocked unless
// the readiness check passes (same gate PaePae will use).
export async function sendContractForSignature(contractId: string): Promise<SendResult> {
  if (!contractId) return { ok: false, error: 'Missing contract.' };
  const supabase = await createSupabaseServer();

  const { data: c, error } = await supabase
    .from('contracts')
    .select('*, projects ( id, title, clients ( name, company, email ) )')
    .eq('id', contractId)
    .single();
  if (error || !c) return { ok: false, error: error?.code === '42703' ? MIGRATION_HINT : 'That contract no longer exists.' };

  const project = c.projects as unknown as { title: string; clients: { name: string; company: string | null; email: string | null } | null } | null;
  const client = project?.clients ?? null;
  const deliverables = normalizeDeliverables(c.deliverables_snapshot);

  const missing = contractReadiness({
    clientName: client?.name,
    projectName: project?.title,
    effectiveDate: c.effective_date,
    depositAmount: c.deposit_amount,
    productionAmount: c.production_amount,
    deliveryAmount: c.delivery_amount,
    revisionRounds: c.revision_rounds,
    revisionPct: c.revision_pct,
    deliverablesCount: deliverables.length,
  });
  if (missing.length > 0) {
    return { ok: false, error: 'Some details are still missing before this can be sent.', missing };
  }

  const terms: ContractTerms = {
    clientName: client?.name ?? '',
    clientCompany: client?.company ?? null,
    projectName: project?.title ?? '',
    effectiveDate: c.effective_date,
    depositAmount: c.deposit_amount ?? 0,
    productionAmount: c.production_amount ?? 0,
    deliveryAmount: c.delivery_amount ?? 0,
    deliverables,
    revisionRounds: c.revision_rounds,
    revisionPct: c.revision_pct,
    productionDate: c.production_date,
  };

  const token = crypto.randomUUID();
  const { error: uErr } = await supabase
    .from('contracts')
    .update({ body_md: renderContract(terms), status: 'sent', share_token: token })
    .eq('id', contractId);
  if (uErr) return { ok: false, error: uErr.code === '42703' ? MIGRATION_HINT : 'Could not send. Please try again.' };

  // Email the signature link to the client (best-effort — the link in the UI is
  // always there regardless, and the editor shows what happened).
  let emailedTo: string | null = null;
  let emailNote: string | null = null;
  if (client?.email) {
    const h = await headers();
    const proto = h.get('x-forwarded-proto') ?? 'https';
    const host = h.get('host') ?? '';
    const res = await sendContractEmail({
      origin: `${proto}://${host}`,
      to: client.email,
      clientName: client.name ?? '',
      projectTitle: project?.title ?? 'your project',
      contractUrl: `${proto}://${host}/contract/${token}`,
    });
    if (res.ok) emailedTo = client.email;
    else emailNote = res.reason;
  } else {
    emailNote = 'The client has no email on file — copy the link below and send it yourself.';
  }

  revalidatePath(`/contracts/${contractId}`);
  return { ok: true, token, emailedTo, emailNote };
}

export async function revokeContractLink(contractId: string): Promise<SendResult> {
  if (!contractId) return { ok: false, error: 'Missing contract.' };
  const supabase = await createSupabaseServer();
  const { error } = await supabase.from('contracts').update({ share_token: null }).eq('id', contractId);
  if (error) return { ok: false, error: 'Could not turn the link off. Please try again.' };
  revalidatePath(`/contracts/${contractId}`);
  // token is irrelevant on revoke; return a benign shape.
  return { ok: true, token: '' };
}

// Delete a contract. The UI confirms first (CLAUDE.md #4).
export async function deleteContract(formData: FormData) {
  const id = String(formData.get('id') ?? '').trim();
  const projectId = String(formData.get('project_id') ?? '').trim();
  if (!id) return;
  const supabase = await createSupabaseServer();
  await supabase.from('contracts').delete().eq('id', id);
  revalidatePath('/projects/contracts');
  if (projectId) revalidatePath(`/projects/${projectId}`);
  redirect('/projects/contracts');
}
