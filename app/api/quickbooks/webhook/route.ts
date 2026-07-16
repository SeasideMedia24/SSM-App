// QuickBooks webhook — flips an app invoice to "paid" automatically when the
// client pays in QuickBooks. This is a PUBLIC, unauthenticated endpoint, so:
//   1. every request is verified against the Intuit signature (HMAC-SHA256 of
//      the RAW body with our webhook verifier token) — mismatches are rejected;
//   2. work goes through the service-role admin client (no user session here),
//      scoped to the single invoice matched by qbo_invoice_id.
//
// When an invoice changes in QB (including when a payment lands and its balance
// drops to 0), Intuit sends an Invoice notification; we re-read that invoice's
// Balance from QB and mark ours paid when it hits 0. Best-effort + idempotent —
// we always answer 200 after the signature check so QuickBooks doesn't retry.

import { NextRequest, NextResponse } from 'next/server';
import { createHmac, timingSafeEqual } from 'crypto';
import { revalidatePath } from 'next/cache';
import { createAdminClient } from '@/lib/supabase/admin';
import { qboFetch } from '@/lib/quickbooks/client';

export const runtime = 'nodejs';

type Entity = { name: string; id: string; operation: string };
type Notification = { realmId: string; dataChangeEvent?: { entities?: Entity[] } };

function signatureValid(raw: string, header: string | null): boolean {
  const token = process.env.QUICKBOOKS_WEBHOOK_VERIFIER_TOKEN;
  if (!token || !header) return false;
  const expected = createHmac('sha256', token).update(raw).digest('base64');
  const a = Buffer.from(expected);
  const b = Buffer.from(header);
  return a.length === b.length && timingSafeEqual(a, b);
}

export async function POST(req: NextRequest) {
  const raw = await req.text();
  if (!signatureValid(raw, req.headers.get('intuit-signature'))) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }

  let payload: { eventNotifications?: Notification[] };
  try {
    payload = JSON.parse(raw);
  } catch {
    return NextResponse.json({ ok: true }); // nothing to do
  }

  const admin = createAdminClient();
  let touched = false;

  try {
    for (const note of payload.eventNotifications ?? []) {
      for (const entity of note.dataChangeEvent?.entities ?? []) {
        if (entity.name !== 'Invoice') continue; // payment lands as an Invoice balance change

        // Only act on invoices we actually created/mirrored.
        const { data: invoice } = await admin
          .from('invoices')
          .select('id, status')
          .eq('qbo_invoice_id', entity.id)
          .maybeSingle();
        if (!invoice || invoice.status === 'paid') continue;

        // Re-read the invoice's balance from QuickBooks (source of truth).
        const res = (await qboFetch(admin, `/invoice/${entity.id}`)) as { Invoice?: { Balance?: number } };
        const balance = res.Invoice?.Balance;
        if (balance === 0) {
          await admin
            .from('invoices')
            .update({ status: 'paid', paid_at: new Date().toISOString() })
            .eq('id', invoice.id);
          touched = true;
        }
      }
    }
  } catch {
    // Never fail the webhook on a processing error — QuickBooks would just retry.
  }

  if (touched) {
    revalidatePath('/invoices');
    revalidatePath('/dashboard');
  }
  return NextResponse.json({ ok: true });
}
