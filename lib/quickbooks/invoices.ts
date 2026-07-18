// Server-ONLY: push app invoices into QuickBooks and have QB email them.
//
//   ensureQboCustomer  app client  ↔ QB Customer   (match by name, else create)
//   ensureDefaultItem  the Service item every invoice line references (QB requires one)
//   pushInvoiceToQbo   create/update the QB invoice from the app's line items
//   sendQboInvoice     QB emails the invoice (Pay-Now link); marks the app invoice sent
//
// All calls go through qboFetch (RLS-scoped Supabase client → the owner's QB
// company). Errors bubble up as friendly Error messages; pushInvoiceToQbo also
// records the last failure on invoices.qbo_sync_error.

import 'server-only';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/types/database.types';
import { qboFetch, getQboAccount } from './client';

type DB = SupabaseClient<Database>;

// Escape a value for a QuickBooks query string literal (single-quoted).
const q = (s: string) => s.replace(/'/g, "\\'");

// ── Customer ─────────────────────────────────────────────────────────────────

export async function ensureQboCustomer(supabase: DB, clientId: string): Promise<string> {
  const { data: client } = await supabase
    .from('clients')
    .select('id, name, company, email, qbo_customer_id')
    .eq('id', clientId)
    .single();
  if (!client) throw new Error('That client no longer exists.');
  if (client.qbo_customer_id) return client.qbo_customer_id;

  // Look for an existing QB customer with the same display name.
  const found = (await qboFetch(
    supabase,
    `/query?query=${encodeURIComponent(`select Id from Customer where DisplayName = '${q(client.name)}'`)}`,
  )) as { QueryResponse?: { Customer?: { Id: string }[] } };

  let customerId = found.QueryResponse?.Customer?.[0]?.Id;

  if (!customerId) {
    const created = (await qboFetch(supabase, '/customer', {
      method: 'POST',
      body: JSON.stringify({
        DisplayName: client.name,
        ...(client.company ? { CompanyName: client.company } : {}),
        ...(client.email ? { PrimaryEmailAddr: { Address: client.email } } : {}),
      }),
    })) as { Customer?: { Id: string } };
    customerId = created.Customer?.Id;
    if (!customerId) throw new Error('QuickBooks did not return a customer id.');
  }

  await supabase.from('clients').update({ qbo_customer_id: customerId }).eq('id', client.id);
  return customerId;
}

// ── Default line item ────────────────────────────────────────────────────────

const DEFAULT_ITEM_NAME = 'Video Production Services';

export async function ensureDefaultItem(supabase: DB): Promise<string> {
  const account = await getQboAccount(supabase);
  if (account?.default_item_id) return account.default_item_id;

  // Reuse an existing active Service item if the company already has one.
  const existing = (await qboFetch(
    supabase,
    `/query?query=${encodeURIComponent(`select Id from Item where Type = 'Service' and Active = true`)}`,
  )) as { QueryResponse?: { Item?: { Id: string }[] } };
  let itemId = existing.QueryResponse?.Item?.[0]?.Id;

  if (!itemId) {
    // Create one, pointing at the company's first income account (required).
    const acct = (await qboFetch(
      supabase,
      `/query?query=${encodeURIComponent(`select Id from Account where AccountType = 'Income'`)}`,
    )) as { QueryResponse?: { Account?: { Id: string }[] } };
    const incomeAccountId = acct.QueryResponse?.Account?.[0]?.Id;
    if (!incomeAccountId) throw new Error('No income account found in QuickBooks to attach the service item to.');

    const created = (await qboFetch(supabase, '/item', {
      method: 'POST',
      body: JSON.stringify({
        Name: DEFAULT_ITEM_NAME,
        Type: 'Service',
        IncomeAccountRef: { value: incomeAccountId },
      }),
    })) as { Item?: { Id: string } };
    itemId = created.Item?.Id;
    if (!itemId) throw new Error('QuickBooks did not return an item id.');
  }

  if (account) await supabase.from('qbo_accounts').update({ default_item_id: itemId }).eq('user_id', account.user_id);
  return itemId;
}

// ── Invoice push ─────────────────────────────────────────────────────────────

type InvoiceLine = { label: string; quantity: number; rate: number; amount: number; position: number };

export async function pushInvoiceToQbo(supabase: DB, invoiceId: string): Promise<{ docNumber: string | null }> {
  const { data: invoice } = await supabase
    .from('invoices')
    .select('id, client_id, due_date, qbo_invoice_id, clients ( email )')
    .eq('id', invoiceId)
    .single();
  if (!invoice) throw new Error('That invoice no longer exists.');

  const clientEmail = (invoice.clients as unknown as { email: string | null } | null)?.email ?? null;

  try {
    const customerId = await ensureQboCustomer(supabase, invoice.client_id);
    const itemId = await ensureDefaultItem(supabase);

    const { data: lineRows } = await supabase
      .from('invoice_line_items')
      .select('label, quantity, rate, amount, position')
      .eq('invoice_id', invoiceId)
      .order('position');
    const lines = (lineRows ?? []) as InvoiceLine[];
    if (lines.length === 0) throw new Error('This invoice has no line items to send.');

    const Line = lines.map((l) => ({
      DetailType: 'SalesItemLineDetail' as const,
      Amount: Number(l.amount),
      Description: l.label,
      SalesItemLineDetail: { ItemRef: { value: itemId } },
    }));

    const body: Record<string, unknown> = {
      CustomerRef: { value: customerId },
      Line,
      ...(invoice.due_date ? { DueDate: invoice.due_date } : {}),
      ...(clientEmail ? { BillEmail: { Address: clientEmail } } : {}),
    };

    // Update the existing QB invoice (sparse) if we've synced before, else create.
    if (invoice.qbo_invoice_id) {
      const existing = (await qboFetch(supabase, `/invoice/${invoice.qbo_invoice_id}`)) as {
        Invoice?: { SyncToken: string };
      };
      const syncToken = existing.Invoice?.SyncToken;
      if (syncToken) {
        body.Id = invoice.qbo_invoice_id;
        body.SyncToken = syncToken;
        body.sparse = true;
      }
    }

    const res = (await qboFetch(supabase, '/invoice', {
      method: 'POST',
      body: JSON.stringify(body),
    })) as { Invoice?: { Id: string; DocNumber?: string } };

    const qboId = res.Invoice?.Id;
    if (!qboId) throw new Error('QuickBooks did not return an invoice id.');
    const docNumber = res.Invoice?.DocNumber ?? null;

    await supabase
      .from('invoices')
      .update({
        qbo_invoice_id: qboId,
        qbo_doc_number: docNumber,
        qbo_synced_at: new Date().toISOString(),
        qbo_sync_error: null,
      })
      .eq('id', invoiceId);

    return { docNumber };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'QuickBooks sync failed.';
    await supabase.from('invoices').update({ qbo_sync_error: message }).eq('id', invoiceId);
    throw new Error(message);
  }
}

// ── QB emails the invoice ────────────────────────────────────────────────────

export async function sendQboInvoice(supabase: DB, invoiceId: string): Promise<{ sentTo: string }> {
  const { data: invoice } = await supabase
    .from('invoices')
    .select('id, qbo_invoice_id, clients ( email )')
    .eq('id', invoiceId)
    .single();
  if (!invoice) throw new Error('That invoice no longer exists.');
  if (!invoice.qbo_invoice_id) throw new Error('Sync this invoice to QuickBooks first, then send it.');

  const email = (invoice.clients as unknown as { email: string | null } | null)?.email ?? null;
  if (!email) throw new Error('This client has no email address, so QuickBooks can’t send the invoice.');

  await qboFetch(supabase, `/invoice/${invoice.qbo_invoice_id}/send?sendTo=${encodeURIComponent(email)}`, {
    method: 'POST',
  });

  await supabase
    .from('invoices')
    .update({ status: 'sent', sent_at: new Date().toISOString() })
    .eq('id', invoiceId);

  return { sentTo: email };
}

// ── Estimate push + send ──────────────────────────────────────────────────────
// Seaside's flow is estimate-first: PaePae sends an ESTIMATE for the client to
// approve; QuickBooks converts the accepted estimate into an invoice (in QB).
// Same customer/item/line shape as an invoice — just the /estimate entity.

export async function pushEstimateToQbo(supabase: DB, invoiceId: string): Promise<{ docNumber: string | null }> {
  const { data: invoice } = await supabase
    .from('invoices')
    .select('id, client_id, qbo_estimate_id, clients ( email )')
    .eq('id', invoiceId)
    .single();
  if (!invoice) throw new Error('That invoice no longer exists.');

  const clientEmail = (invoice.clients as unknown as { email: string | null } | null)?.email ?? null;

  try {
    const customerId = await ensureQboCustomer(supabase, invoice.client_id);
    const itemId = await ensureDefaultItem(supabase);

    const { data: lineRows } = await supabase
      .from('invoice_line_items')
      .select('label, quantity, rate, amount, position')
      .eq('invoice_id', invoiceId)
      .order('position');
    const lines = (lineRows ?? []) as InvoiceLine[];
    if (lines.length === 0) throw new Error('This invoice has no line items to send.');

    const Line = lines.map((l) => ({
      DetailType: 'SalesItemLineDetail' as const,
      Amount: Number(l.amount),
      Description: l.label,
      SalesItemLineDetail: { ItemRef: { value: itemId } },
    }));

    const body: Record<string, unknown> = {
      CustomerRef: { value: customerId },
      Line,
      ...(clientEmail ? { BillEmail: { Address: clientEmail } } : {}),
    };

    // Update the existing QB estimate (sparse) if synced before, else create.
    if (invoice.qbo_estimate_id) {
      const existing = (await qboFetch(supabase, `/estimate/${invoice.qbo_estimate_id}`)) as {
        Estimate?: { SyncToken: string };
      };
      const syncToken = existing.Estimate?.SyncToken;
      if (syncToken) {
        body.Id = invoice.qbo_estimate_id;
        body.SyncToken = syncToken;
        body.sparse = true;
      }
    }

    const res = (await qboFetch(supabase, '/estimate', {
      method: 'POST',
      body: JSON.stringify(body),
    })) as { Estimate?: { Id: string; DocNumber?: string } };

    const qboId = res.Estimate?.Id;
    if (!qboId) throw new Error('QuickBooks did not return an estimate id.');
    const docNumber = res.Estimate?.DocNumber ?? null;

    await supabase
      .from('invoices')
      .update({
        qbo_estimate_id: qboId,
        qbo_estimate_number: docNumber,
        qbo_synced_at: new Date().toISOString(),
        qbo_sync_error: null,
      })
      .eq('id', invoiceId);

    return { docNumber };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'QuickBooks sync failed.';
    await supabase.from('invoices').update({ qbo_sync_error: message }).eq('id', invoiceId);
    throw new Error(message);
  }
}

export async function sendQboEstimate(supabase: DB, invoiceId: string): Promise<{ sentTo: string }> {
  const { data: invoice } = await supabase
    .from('invoices')
    .select('id, qbo_estimate_id, clients ( email )')
    .eq('id', invoiceId)
    .single();
  if (!invoice) throw new Error('That invoice no longer exists.');
  if (!invoice.qbo_estimate_id) throw new Error('Sync this estimate to QuickBooks first, then send it.');

  const email = (invoice.clients as unknown as { email: string | null } | null)?.email ?? null;
  if (!email) throw new Error('This client has no email address, so QuickBooks can’t send the estimate.');

  await qboFetch(supabase, `/estimate/${invoice.qbo_estimate_id}/send?sendTo=${encodeURIComponent(email)}`, {
    method: 'POST',
  });

  // The client has now been sent the estimate to approve — mark the app invoice
  // sent so it isn't re-sent, and stamp when the estimate went out.
  await supabase
    .from('invoices')
    .update({ status: 'sent', sent_at: new Date().toISOString(), qbo_estimate_sent_at: new Date().toISOString() })
    .eq('id', invoiceId);

  return { sentTo: email };
}
