// PaePae's write actions — the ONLY changes PaePae can make, and every one of
// them goes through the propose → confirm → execute gate:
//
//   1. PaePae calls a propose_* tool. The input is validated here (zod) and
//      turned into a Proposal the chat UI shows as a card. NOTHING is written.
//   2. The user clicks Confirm. The browser posts the proposal to
//      /api/paepae/execute, which re-validates it HERE (never trusting the
//      client) and only then runs it through the caller's RLS-scoped Supabase
//      client — so PaePae can never touch rows the signed-in user couldn't.
//
// There is deliberately no delete action and no send-email action. Deletes stay
// in the app UI with its own confirmation; sending email is Phase 3.
//
// To add a new action: add a schema to `actionSchemas`, a case to
// `executeAction`, and a matching propose_* tool in tools.ts.

import 'server-only';
import { z } from 'zod';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/types/database.types';
import { createInvoiceFromQuoteId } from '@/lib/invoices/create';
import { sendGmail, createCalendarEvent } from '@/lib/google/act';
import { pushInvoiceToQbo, sendQboInvoice } from '@/lib/quickbooks/invoices';

type DB = SupabaseClient<Database>;

// ── Field helpers ────────────────────────────────────────────────────────────

// Dates arrive from the model as YYYY-MM-DD strings.
const isoDate = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Expected a date formatted YYYY-MM-DD');

const uuid = z.uuid();
const shortText = z.string().trim().min(1).max(200);
const longText = z.string().trim().min(1).max(5000);

// Enums mirror the DB types in types/database.types.ts — keep them in sync.
const projectStatus = z.enum([
  'idea_inquiry',
  'scripting_planning',
  'filming',
  'editing',
  'review_revision',
  'scheduled',
  'archived',
]);
const taskStatus = z.enum(['not_started', 'in_progress', 'done']);
const priority = z.enum(['low', 'medium', 'high']);
const clientType = z.enum(['recurring', 'one_time', 'campaign']);
const quoteStatus = z.enum(['draft', 'sent', 'accepted', 'declined']);
const invoiceStatus = z.enum(['draft', 'sent', 'paid']);
const contractStatus = z.enum(['draft', 'sent', 'signed', 'declined']);

// ── Action schemas ───────────────────────────────────────────────────────────
// z.strictObject rejects unknown keys, so a malformed tool call fails loudly at
// propose time (where PaePae can correct itself) instead of at execute time.

export const actionSchemas = {
  // A task can stand alone — attach it to a project and/or client later (or
  // in the same breath if the owner names one). Mirrors the app's My Tasks.
  create_task: z.strictObject({
    project_id: uuid.optional(),
    client_id: uuid.optional(),
    title: shortText,
    description: longText.optional(),
    status: taskStatus.optional(),
    priority: priority.optional(),
    due_date: isoDate.optional(),
  }),

  update_task: z.strictObject({
    task_id: uuid,
    // A task can be attached to (or detached from) a project/client after the
    // fact — "add that task to the Rock Jar project" works as an update.
    project_id: uuid.nullable().optional(),
    client_id: uuid.nullable().optional(),
    title: shortText.optional(),
    description: longText.nullable().optional(),
    status: taskStatus.optional(),
    priority: priority.optional(),
    due_date: isoDate.nullable().optional(),
  }),

  create_project: z.strictObject({
    client_id: uuid,
    title: shortText,
    description: longText.optional(),
    status: projectStatus.optional(),
    priority: priority.optional(),
    project_type: shortText.optional(),
    start_date: isoDate.optional(),
    due_date: isoDate.optional(),
  }),

  update_project: z.strictObject({
    project_id: uuid,
    title: shortText.optional(),
    description: longText.nullable().optional(),
    status: projectStatus.optional(),
    priority: priority.optional(),
    project_type: shortText.nullable().optional(),
    start_date: isoDate.nullable().optional(),
    due_date: isoDate.nullable().optional(),
  }),

  create_client: z.strictObject({
    name: shortText,
    company: shortText.optional(),
    email: z.email().optional(),
    phone: shortText.optional(),
    notes: longText.optional(),
    client_type: clientType.optional(),
  }),

  update_client: z.strictObject({
    client_id: uuid,
    name: shortText.optional(),
    company: shortText.nullable().optional(),
    email: z.email().nullable().optional(),
    phone: shortText.nullable().optional(),
    notes: longText.nullable().optional(),
    client_type: clientType.optional(),
  }),

  // Invoices are generated from an existing quote (copies its line items +
  // total) and saved as DRAFTS — PaePae never marks one sent or paid.
  create_invoice: z.strictObject({
    quote_id: uuid,
    due_date: isoDate.optional(),
  }),

  // Contracts save as DRAFTS only — PaePae never marks one sent/signed.
  create_contract: z.strictObject({
    project_id: uuid,
    title: shortText,
    notes: longText.optional(),
    amount: z.number().min(0).max(10_000_000).optional(),
  }),

  // Quotes save as DRAFTS only — PaePae never marks a quote sent/accepted.
  create_quote: z.strictObject({
    client_id: uuid,
    project_id: uuid.optional(),
    title: shortText,
    notes: longText.optional(),
    line_items: z
      .array(
        z.strictObject({
          label: shortText,
          quantity: z.number().positive().max(10000),
          unit: shortText.optional(),
          rate: z.number().min(0).max(1_000_000),
        }),
      )
      .min(1)
      .max(40),
  }),

  create_deliverable: z.strictObject({
    project_id: uuid,
    title: shortText,
    description: longText.optional(),
    status: taskStatus.optional(),
    due_date: isoDate.optional(),
  }),

  update_deliverable: z.strictObject({
    deliverable_id: uuid,
    title: shortText.optional(),
    description: longText.nullable().optional(),
    status: taskStatus.optional(),
    due_date: isoDate.nullable().optional(),
  }),

  create_milestone: z.strictObject({
    project_id: uuid,
    title: shortText,
    date: isoDate.optional(),
    status: taskStatus.optional(),
  }),

  update_milestone: z.strictObject({
    milestone_id: uuid,
    title: shortText.optional(),
    date: isoDate.nullable().optional(),
    status: taskStatus.optional(),
  }),

  // Put a team member on a project (optionally with a role and booked rate).
  assign_contractor: z.strictObject({
    project_id: uuid,
    contractor_id: uuid,
    role: shortText.optional(),
    rate: z.number().min(0).max(100_000).optional(),
    rate_unit: shortText.optional(),
  }),

  update_contract: z.strictObject({
    contract_id: uuid,
    title: shortText.optional(),
    notes: longText.nullable().optional(),
    amount: z.number().min(0).max(10_000_000).nullable().optional(),
    status: contractStatus.optional(),
    signed_date: isoDate.nullable().optional(),
  }),

  // Status RECORDING — PaePae notes what Jeremy says happened (a client
  // accepted, an invoice got paid); it still can't send anything itself.
  update_quote_status: z.strictObject({
    quote_id: uuid,
    status: quoteStatus,
  }),

  update_invoice_status: z.strictObject({
    invoice_id: uuid,
    status: invoiceStatus,
  }),

  // ── Outside-world actions (Phase 3) ── always behind a Confirm card. ──────
  // Sent through the owner's connected Google account (Settings → Google
  // Calendar). Nothing leaves the studio without an explicit Confirm click.

  send_email: z.strictObject({
    to: z.email(),
    cc: z.array(z.email()).max(10).optional(),
    subject: shortText,
    body: z.string().trim().min(1).max(20000),
  }),

  create_event: z.strictObject({
    title: shortText,
    description: longText.optional(),
    location: shortText.optional(),
    // Local wall-clock times in time_zone, e.g. 2026-07-15T14:00.
    start: z.string().regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/, 'Expected YYYY-MM-DDTHH:MM'),
    end: z.string().regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/, 'Expected YYYY-MM-DDTHH:MM'),
    time_zone: shortText.optional(), // IANA name; defaults to America/New_York
    attendees: z.array(z.email()).max(20).optional(),
    with_meet: z.boolean().optional(), // default true — include a Google Meet link
  }),

  // Send an existing invoice to the client THROUGH QuickBooks: syncs it to QB,
  // then QuickBooks emails it with a Pay-Now link. Always behind a Confirm card.
  send_invoice: z.strictObject({
    invoice_id: uuid,
  }),
} as const;

export type ActionName = keyof typeof actionSchemas;
export type ActionParams<N extends ActionName> = z.infer<(typeof actionSchemas)[N]>;

export function isActionName(v: unknown): v is ActionName {
  return typeof v === 'string' && v in actionSchemas;
}

// ── Autonomy policy ──────────────────────────────────────────────────────────
// Owner's rule (2026-07-11): PaePae just DOES most things — create/update tasks,
// projects, clients, quotes, contracts execute immediately and show a receipt.
// A confirmation card is reserved for actions with outside-world consequences:
// invoicing now; sending email, calendar invites, and onboarding links when
// those integrations arrive. Add any new "send"-like action to this set.

const CONFIRM_ACTIONS: ReadonlySet<ActionName> = new Set<ActionName>([
  'create_invoice',
  'send_email',
  'create_event',
  'send_invoice',
]);

export function requiresConfirmation(action: ActionName): boolean {
  return CONFIRM_ACTIONS.has(action);
}

// Shared validation used at BOTH propose time (so PaePae can self-correct) and
// execute time (so a tampered confirm can't slip anything past the schema).
export function validateAction(
  action: ActionName,
  raw: unknown,
):
  | { ok: true; params: Record<string, unknown> }
  | { ok: false; error: string } {
  const parsed = actionSchemas[action].safeParse(raw);
  if (!parsed.success) {
    return { ok: false, error: z.prettifyError(parsed.error) };
  }
  // Updates must actually change something (beyond the id field).
  if (action.startsWith('update_') && Object.keys(parsed.data).length <= 1) {
    return { ok: false, error: 'Provide at least one field to change.' };
  }
  // Events must end after they start (same string format → safe to compare).
  if (action === 'create_event') {
    const p = parsed.data as ActionParams<'create_event'>;
    if (p.end <= p.start) return { ok: false, error: 'The end time must be after the start time.' };
  }
  return { ok: true, params: parsed.data as Record<string, unknown> };
}

// A proposal as shown on the chat card and posted back on Confirm.
export type Proposal = {
  action: ActionName;
  params: Record<string, unknown>;
  // Human-readable lines for the card, e.g. ["Project: Rock Jar reel", "Due: 2026-07-11"].
  summary: string[];
};

// ── Quote maths (pure, server-authoritative) ─────────────────────────────────
// Line totals and the subtotal are ALWAYS computed here — never taken from the
// model or the browser. Kept as a standalone pure function so it can be unit
// tested and reused by both the proposal summary and the actual insert.

export type QuoteLineItemRow = {
  label: string;
  quantity: number;
  unit: string | null;
  rate: number;
  amount: number;
  position: number;
};

export function computeQuoteLineItems(
  lineItems: ActionParams<'create_quote'>['line_items'],
): { items: QuoteLineItemRow[]; subtotal: number } {
  const items: QuoteLineItemRow[] = lineItems.map((item, i) => ({
    label: item.label,
    quantity: item.quantity,
    unit: item.unit ?? null,
    rate: item.rate,
    // Round each line to cents so the subtotal can't drift on float noise.
    amount: Math.round(item.quantity * item.rate * 100) / 100,
    position: i,
  }));
  const subtotal = Math.round(items.reduce((s, it) => s + it.amount, 0) * 100) / 100;
  return { items, subtotal };
}

// ── Friendly DB errors ───────────────────────────────────────────────────────
// Turn raw Postgres errors into plain language for a non-technical owner. The
// most likely one now is a foreign-key violation when a referenced record was
// deleted between the proposal and the Confirm click.

function friendlyError(error: { code?: string; message?: string }): Error {
  const byCode: Record<string, string> = {
    '23503':
      'That was linked to a record that no longer exists — it may have been deleted since I proposed this. Look it up again and retry.',
    '23502': 'A required field was missing.',
    '23505': 'That already exists.',
    '23514': 'One of the values wasn’t allowed.',
    '22P02': 'One of the values wasn’t in the expected format.',
  };
  return new Error((error.code && byCode[error.code]) || error.message || 'The action failed.');
}

// ── Building a proposal ──────────────────────────────────────────────────────
// Runs at propose time (read-only). It (1) verifies every referenced record
// actually exists and is visible under RLS — refusing to show a card for an
// invented id — and (2) builds the human-readable summary lines. Returning a
// clear error instead lets PaePae self-correct (look the id up again) rather
// than showing a broken card that would fail on Confirm.

const nice = (s: string) => s.replaceAll('_', ' ');

export async function buildProposal(
  action: ActionName,
  params: Record<string, unknown>,
  supabase: DB,
): Promise<{ ok: true; proposal: Proposal } | { ok: false; error: string }> {
  const lines: string[] = [];
  const skip = new Set([
    'project_id', 'client_id', 'task_id', 'quote_id', 'line_items',
    'deliverable_id', 'milestone_id', 'contractor_id', 'invoice_id', 'contract_id',
    'body', 'attendees', 'with_meet', // formatted specially below
  ]);

  // Resolve IDs to names AND verify they exist. A missing one aborts the card.
  if (typeof params.project_id === 'string') {
    const { data } = await supabase
      .from('projects')
      .select('title')
      .eq('id', params.project_id)
      .maybeSingle();
    if (!data) {
      return { ok: false, error: `No project matches that id. Use list_projects to get a real id, then try again.` };
    }
    lines.push(`Project: ${data.title}`);
  }
  if (typeof params.client_id === 'string') {
    const { data } = await supabase
      .from('clients')
      .select('name')
      .eq('id', params.client_id)
      .maybeSingle();
    if (!data) {
      return { ok: false, error: `No client matches that id. Use list_clients to get a real id, then try again.` };
    }
    lines.push(`Client: ${data.name}`);
  }
  if (typeof params.task_id === 'string') {
    const { data } = await supabase
      .from('tasks')
      .select('title')
      .eq('id', params.task_id)
      .maybeSingle();
    if (!data) {
      return { ok: false, error: `No task matches that id. Use list_tasks to get a real id, then try again.` };
    }
    lines.push(`Task: ${data.title}`);
  }
  if (typeof params.quote_id === 'string') {
    const { data } = await supabase
      .from('quotes')
      .select('title, total')
      .eq('id', params.quote_id)
      .maybeSingle();
    if (!data) {
      return { ok: false, error: `No quote matches that id. Use list_quotes to get a real id, then try again.` };
    }
    lines.push(`Quote: ${data.title}`);
    if (action === 'create_invoice') {
      lines.push(`Amount: $${Number(data.total).toLocaleString()} (copied from the quote)`);
    }
  }
  if (typeof params.deliverable_id === 'string') {
    const { data } = await supabase
      .from('deliverables')
      .select('title')
      .eq('id', params.deliverable_id)
      .maybeSingle();
    if (!data) {
      return { ok: false, error: `No deliverable matches that id. Use list_deliverables to get a real id, then try again.` };
    }
    lines.push(`Deliverable: ${data.title}`);
  }
  if (typeof params.milestone_id === 'string') {
    const { data } = await supabase
      .from('milestones')
      .select('title')
      .eq('id', params.milestone_id)
      .maybeSingle();
    if (!data) {
      return { ok: false, error: `No milestone matches that id. Use list_milestones to get a real id, then try again.` };
    }
    lines.push(`Milestone: ${data.title}`);
  }
  if (typeof params.contractor_id === 'string') {
    const { data } = await supabase
      .from('contractors')
      .select('name')
      .eq('id', params.contractor_id)
      .maybeSingle();
    if (!data) {
      return { ok: false, error: `No team member matches that id. Use list_contractors to get a real id, then try again.` };
    }
    lines.push(`Team member: ${data.name}`);
  }
  if (typeof params.invoice_id === 'string') {
    const { data } = await supabase
      .from('invoices')
      .select('title, invoice_number')
      .eq('id', params.invoice_id)
      .maybeSingle();
    if (!data) {
      return { ok: false, error: `No invoice matches that id. Use list_invoices to get a real id, then try again.` };
    }
    lines.push(`Invoice: ${data.invoice_number ? `${data.invoice_number} · ` : ''}${data.title}`);
  }
  if (typeof params.contract_id === 'string') {
    const { data } = await supabase
      .from('contracts')
      .select('title')
      .eq('id', params.contract_id)
      .maybeSingle();
    if (!data) {
      return { ok: false, error: `No contract matches that id. Look it up again, then retry.` };
    }
    lines.push(`Contract: ${data.title}`);
  }

  // List the fields being set/changed.
  for (const [key, value] of Object.entries(params)) {
    if (skip.has(key) || value === undefined) continue;
    lines.push(`${nice(key)[0].toUpperCase()}${nice(key).slice(1)}: ${value === null ? '(cleared)' : nice(String(value))}`);
  }

  // Quote line items get their own block with a server-computed total.
  if (action === 'create_quote' && Array.isArray(params.line_items)) {
    const { items, subtotal } = computeQuoteLineItems(
      params.line_items as ActionParams<'create_quote'>['line_items'],
    );
    for (const item of items) {
      lines.push(
        `• ${item.label} — ${item.quantity}${item.unit ? ` ${item.unit}` : ''} × $${item.rate.toLocaleString()} = $${item.amount.toLocaleString()}`,
      );
    }
    lines.push(`Total: $${subtotal.toLocaleString()} (saved as a draft)`);
  }

  // Outside-world actions get explicit, no-surprises cards.
  if (action === 'send_email') {
    const body = String(params.body ?? '');
    lines.push(`Body: ${body.length > 200 ? `${body.slice(0, 200)}…` : body}`);
    lines.push('Sends from your connected Gmail the moment you Confirm.');
  }
  if (action === 'create_event') {
    const attendees = Array.isArray(params.attendees) ? (params.attendees as string[]) : [];
    lines.push(
      attendees.length > 0
        ? `Invites: ${attendees.join(', ')} (emailed by Google on Confirm)`
        : 'No attendees — goes on your calendar only.',
    );
    if (params.with_meet !== false) lines.push('Includes a Google Meet link.');
  }

  // send_invoice readiness: bail with a clear list of what's missing so PaePae
  // tells the owner to fix it rather than showing a card that will fail. This is
  // the same "check before send" gate the invoice page and the owner use.
  if (action === 'send_invoice' && typeof params.invoice_id === 'string') {
    const [{ data: qbo }, { data: inv }, { count: lineCount }] = await Promise.all([
      supabase.from('qbo_accounts').select('user_id').maybeSingle(),
      supabase.from('invoices').select('clients ( name, email )').eq('id', params.invoice_id).maybeSingle(),
      supabase.from('invoice_line_items').select('id', { count: 'exact', head: true }).eq('invoice_id', params.invoice_id),
    ]);
    const client = (inv?.clients as unknown as { name: string; email: string | null } | null) ?? null;
    const missing: string[] = [];
    if (!qbo) missing.push('QuickBooks isn’t connected (Settings → QuickBooks)');
    if (!client?.email) missing.push(`the client${client?.name ? ` (${client.name})` : ''} has no email address on file`);
    if (!lineCount || lineCount === 0) missing.push('the invoice has no line items');
    if (missing.length > 0) {
      return { ok: false, error: `Can’t send this invoice yet — ${missing.join('; ')}. Fix that, then ask me again.` };
    }
    lines.push('On Confirm: syncs to QuickBooks, then QuickBooks emails it with a Pay-Now link.');
  }

  return { ok: true, proposal: { action, params, summary: lines } };
}

// ── Execution ────────────────────────────────────────────────────────────────
// Runs ONE confirmed action. Called only by /api/paepae/execute, after auth and
// re-validation. Returns a short human message for the chat card.

export async function executeAction(
  action: ActionName,
  rawParams: unknown,
  supabase: DB,
): Promise<string> {
  // Re-validate here no matter who calls us — never trust the round trip.
  const checked = validateAction(action, rawParams);
  if (!checked.ok) {
    throw new Error(`Invalid ${action} parameters: ${checked.error}`);
  }
  const parsed = { data: checked.params };

  switch (action) {
    case 'create_task': {
      const p = parsed.data as ActionParams<'create_task'>;
      const { data, error } = await supabase
        .from('tasks')
        .insert(p)
        .select('id, title')
        .single();
      if (error) throw friendlyError(error);
      return `Created task “${data.title}”.`;
    }

    case 'update_task': {
      const { task_id, ...fields } = parsed.data as ActionParams<'update_task'>;
      const { data, error } = await supabase
        .from('tasks')
        .update(fields)
        .eq('id', task_id)
        .select('id, title')
        .single();
      if (error) throw friendlyError(error);
      return `Updated task “${data.title}”.`;
    }

    case 'create_project': {
      const p = parsed.data as ActionParams<'create_project'>;
      const { data, error } = await supabase
        .from('projects')
        .insert(p)
        .select('id, title')
        .single();
      if (error) throw friendlyError(error);
      return `Created project “${data.title}”.`;
    }

    case 'update_project': {
      const { project_id, ...fields } = parsed.data as ActionParams<'update_project'>;
      const { data, error } = await supabase
        .from('projects')
        .update(fields)
        .eq('id', project_id)
        .select('id, title')
        .single();
      if (error) throw friendlyError(error);
      return `Updated project “${data.title}”.`;
    }

    case 'create_client': {
      const p = parsed.data as ActionParams<'create_client'>;
      const { data, error } = await supabase
        .from('clients')
        .insert(p)
        .select('id, name')
        .single();
      if (error) throw friendlyError(error);
      return `Added client “${data.name}”.`;
    }

    case 'update_client': {
      const { client_id, ...fields } = parsed.data as ActionParams<'update_client'>;
      const { data, error } = await supabase
        .from('clients')
        .update(fields)
        .eq('id', client_id)
        .select('id, name')
        .single();
      if (error) throw friendlyError(error);
      return `Updated client “${data.name}”.`;
    }

    case 'create_invoice': {
      const p = parsed.data as ActionParams<'create_invoice'>;
      // Reuses the shared quote → invoice copy (always a draft).
      const invoice = await createInvoiceFromQuoteId(supabase, p.quote_id, { dueDate: p.due_date });
      return `Created draft invoice “${invoice.title}” — $${Number(invoice.total).toLocaleString()} (from the quote).`;
    }

    case 'create_contract': {
      const p = parsed.data as ActionParams<'create_contract'>;
      // Always a draft — PaePae never marks a contract sent or signed.
      const { data, error } = await supabase
        .from('contracts')
        .insert({ ...p, status: 'draft' })
        .select('id, title')
        .single();
      if (error) throw friendlyError(error);
      return `Drafted contract “${data.title}”.`;
    }

    case 'create_quote': {
      const { line_items, ...quote } = parsed.data as ActionParams<'create_quote'>;
      // Totals are computed HERE, server-side — never taken from the model.
      const { items, subtotal } = computeQuoteLineItems(line_items);

      const { data: created, error } = await supabase
        .from('quotes')
        .insert({ ...quote, status: 'draft', subtotal, total: subtotal })
        .select('id, title')
        .single();
      if (error) throw friendlyError(error);

      const { error: itemsError } = await supabase
        .from('quote_line_items')
        .insert(items.map((it) => ({ ...it, quote_id: created.id })));
      if (itemsError) {
        // Don't leave a half-made quote behind if the line items failed.
        await supabase.from('quotes').delete().eq('id', created.id);
        throw friendlyError(itemsError);
      }
      return `Saved draft quote “${created.title}” — $${subtotal.toLocaleString()}.`;
    }

    case 'create_deliverable': {
      const p = parsed.data as ActionParams<'create_deliverable'>;
      // Append at the end of the project's list (the panel orders by position).
      const { count } = await supabase
        .from('deliverables')
        .select('id', { count: 'exact', head: true })
        .eq('project_id', p.project_id);
      const { data, error } = await supabase
        .from('deliverables')
        .insert({ ...p, position: count ?? 0 })
        .select('id, title')
        .single();
      if (error) throw friendlyError(error);
      return `Added deliverable “${data.title}”.`;
    }

    case 'update_deliverable': {
      const { deliverable_id, ...fields } = parsed.data as ActionParams<'update_deliverable'>;
      const { data, error } = await supabase
        .from('deliverables')
        .update(fields)
        .eq('id', deliverable_id)
        .select('id, title')
        .single();
      if (error) throw friendlyError(error);
      return `Updated deliverable “${data.title}”.`;
    }

    case 'create_milestone': {
      const p = parsed.data as ActionParams<'create_milestone'>;
      const { count } = await supabase
        .from('milestones')
        .select('id', { count: 'exact', head: true })
        .eq('project_id', p.project_id);
      const { data, error } = await supabase
        .from('milestones')
        .insert({ ...p, position: count ?? 0 })
        .select('id, title')
        .single();
      if (error) throw friendlyError(error);
      return `Added milestone “${data.title}”.`;
    }

    case 'update_milestone': {
      const { milestone_id, ...fields } = parsed.data as ActionParams<'update_milestone'>;
      const { data, error } = await supabase
        .from('milestones')
        .update(fields)
        .eq('id', milestone_id)
        .select('id, title')
        .single();
      if (error) throw friendlyError(error);
      return `Updated milestone “${data.title}”.`;
    }

    case 'assign_contractor': {
      const p = parsed.data as ActionParams<'assign_contractor'>;
      const { error } = await supabase.from('project_contractors').insert(p);
      if (error) {
        if (error.code === '23505') throw new Error('They’re already assigned to that project.');
        throw friendlyError(error);
      }
      // Names for a readable receipt (best-effort — the assignment already landed).
      const [{ data: who }, { data: proj }] = await Promise.all([
        supabase.from('contractors').select('name').eq('id', p.contractor_id).maybeSingle(),
        supabase.from('projects').select('title').eq('id', p.project_id).maybeSingle(),
      ]);
      return `Assigned ${who?.name ?? 'the team member'} to “${proj?.title ?? 'the project'}”${p.role ? ` as ${p.role}` : ''}.`;
    }

    case 'update_contract': {
      const { contract_id, ...fields } = parsed.data as ActionParams<'update_contract'>;
      const { data, error } = await supabase
        .from('contracts')
        .update(fields)
        .eq('id', contract_id)
        .select('id, title, status')
        .single();
      if (error) throw friendlyError(error);
      return `Updated contract “${data.title}”${fields.status ? ` — now ${data.status}` : ''}.`;
    }

    case 'update_quote_status': {
      const p = parsed.data as ActionParams<'update_quote_status'>;
      const { data, error } = await supabase
        .from('quotes')
        .update({ status: p.status })
        .eq('id', p.quote_id)
        .select('id, title')
        .single();
      if (error) throw friendlyError(error);
      return `Marked quote “${data.title}” as ${p.status}.`;
    }

    case 'update_invoice_status': {
      const p = parsed.data as ActionParams<'update_invoice_status'>;
      // Keep the bookkeeping timestamps in step with the recorded status.
      const now = new Date().toISOString();
      const stamps =
        p.status === 'draft'
          ? { sent_at: null, paid_at: null }
          : p.status === 'sent'
            ? { sent_at: now, paid_at: null }
            : { paid_at: now }; // paid — keep sent_at as-is
      const { data, error } = await supabase
        .from('invoices')
        .update({ status: p.status, ...stamps })
        .eq('id', p.invoice_id)
        .select('id, title, invoice_number')
        .single();
      if (error) throw friendlyError(error);
      return `Marked invoice ${data.invoice_number ? `${data.invoice_number} ` : ''}“${data.title}” as ${p.status}.`;
    }

    // Outside-world actions — only reachable after the owner's Confirm click
    // (both are in CONFIRM_ACTIONS), sent via the connected Google account.
    case 'send_email': {
      const p = parsed.data as ActionParams<'send_email'>;
      const result = await sendGmail(supabase, { to: p.to, cc: p.cc, subject: p.subject, body: p.body });
      if (!result.ok) throw new Error(result.error);
      return result.detail;
    }

    case 'create_event': {
      const p = parsed.data as ActionParams<'create_event'>;
      const result = await createCalendarEvent(supabase, {
        title: p.title,
        description: p.description,
        location: p.location,
        start: p.start,
        end: p.end,
        timeZone: p.time_zone ?? 'America/New_York', // the studio's home zone
        attendees: p.attendees ?? [],
        withMeet: p.with_meet !== false,
      });
      if (!result.ok) throw new Error(result.error);
      return result.detail;
    }

    // Sends the invoice THROUGH QuickBooks (syncs it, then QB emails the Pay-Now
    // invoice). Only reachable after the owner's Confirm click (send_invoice is in
    // CONFIRM_ACTIONS); readiness was checked at propose time in buildProposal.
    case 'send_invoice': {
      const p = parsed.data as ActionParams<'send_invoice'>;
      await pushInvoiceToQbo(supabase, p.invoice_id);
      const { sentTo } = await sendQboInvoice(supabase, p.invoice_id);
      return `Sent the invoice through QuickBooks — it emailed the Pay-Now invoice to ${sentTo}.`;
    }
  }
}

// App pages that should refresh after a given action lands.
export function pathsToRevalidate(action: ActionName): string[] {
  switch (action) {
    case 'create_task':
    case 'update_task':
      return ['/my-tasks', '/projects', '/dashboard'];
    case 'create_project':
    case 'update_project':
      return ['/projects', '/dashboard'];
    case 'create_client':
    case 'update_client':
      return ['/clients'];
    case 'create_quote':
      return ['/calculator', '/dashboard'];
    case 'create_contract':
    case 'update_contract':
      return ['/projects/contracts', '/projects'];
    case 'create_invoice':
    case 'update_invoice_status':
      return ['/invoices', '/dashboard'];
    case 'create_deliverable':
    case 'update_deliverable':
      return ['/projects/deliverables', '/projects', '/dashboard'];
    case 'create_milestone':
    case 'update_milestone':
      return ['/projects', '/dashboard'];
    case 'assign_contractor':
      return ['/contractors', '/projects'];
    case 'update_quote_status':
      return ['/calculator', '/dashboard'];
    case 'send_email':
      return [];
    case 'create_event':
      return ['/dashboard']; // the calendar block shows the new event
    case 'send_invoice':
      return ['/invoices', '/dashboard'];
  }
}
