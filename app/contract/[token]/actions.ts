'use server';

// The client signs their contract here. This is an ANONYMOUS surface, so writes
// go through the service-role admin client (RLS stays locked for anon) and are
// gated entirely by the unguessable share_token. Signing is idempotent, and it
// generates the deposit invoice (once) so the welcome packet can offer it to pay.

import { revalidatePath } from 'next/cache';
import { headers } from 'next/headers';
import { createAdminClient } from '@/lib/supabase/admin';
import { createDepositInvoice } from '@/lib/invoices/create';

export type SignState = { ok: boolean; error: string | null };

type ProjRel = { title: string; client_id: string } | { title: string; client_id: string }[] | null;
const one = (r: ProjRel) => (Array.isArray(r) ? (r[0] ?? null) : r);

export async function signContract(_prev: SignState, formData: FormData): Promise<SignState> {
  const token = String(formData.get('token') ?? '').trim();
  const name = String(formData.get('signer_name') ?? '').trim();
  const title = String(formData.get('signer_title') ?? '').trim();
  const agreed = formData.get('agree') != null;

  if (!token) return { ok: false, error: 'This link isn’t valid.' };
  if (!name) return { ok: false, error: 'Please type your full name to sign.' };
  if (!agreed) return { ok: false, error: 'Please check the box to agree before signing.' };

  const admin = createAdminClient();
  const { data: c } = await admin
    .from('contracts')
    .select('id, status, project_id, quote_id, deposit_amount, deposit_invoice_id, signed_at, projects ( title, client_id )')
    .eq('share_token', token)
    .single();
  if (!c) return { ok: false, error: 'This contract link isn’t active anymore.' };
  if (c.signed_at) return { ok: true, error: null }; // already signed — idempotent

  const project = one(c.projects as ProjRel);
  const clientId = project?.client_id ?? null;

  // Generate the deposit invoice once, mark it sent, and give it a share link so
  // the welcome packet can offer "pay your deposit".
  let depositInvoiceId = c.deposit_invoice_id;
  if (!depositInvoiceId && clientId && Number(c.deposit_amount ?? 0) > 0) {
    const inv = await createDepositInvoice(admin, {
      clientId,
      projectId: c.project_id,
      quoteId: c.quote_id,
      label: `Deposit — ${project?.title ?? 'project'} (due upon signature)`,
      amount: Number(c.deposit_amount),
    }).catch(() => null);
    if (inv) {
      depositInvoiceId = inv.id;
      await admin
        .from('invoices')
        .update({ share_token: crypto.randomUUID(), status: 'sent', sent_at: new Date().toISOString() })
        .eq('id', inv.id);
    }
  }

  const h = await headers();
  const ip = h.get('x-forwarded-for')?.split(',')[0]?.trim() ?? null;
  const nowIso = new Date().toISOString();

  const { error } = await admin
    .from('contracts')
    .update({
      status: 'signed',
      signer_name: name,
      signer_title: title || null,
      signed_at: nowIso,
      signed_date: nowIso.slice(0, 10),
      signer_ip: ip,
      deposit_invoice_id: depositInvoiceId,
    })
    .eq('id', c.id);
  if (error) return { ok: false, error: 'Something went wrong saving your signature. Please try again.' };

  revalidatePath(`/contract/${token}`);
  revalidatePath('/invoices');
  revalidatePath('/dashboard');
  revalidatePath(`/contracts/${c.id}`);
  return { ok: true, error: null };
}
