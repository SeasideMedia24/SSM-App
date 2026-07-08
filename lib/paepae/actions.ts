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

// ── Action schemas ───────────────────────────────────────────────────────────
// z.strictObject rejects unknown keys, so a malformed tool call fails loudly at
// propose time (where PaePae can correct itself) instead of at execute time.

export const actionSchemas = {
  create_task: z.strictObject({
    project_id: uuid,
    title: shortText,
    description: longText.optional(),
    status: taskStatus.optional(),
    priority: priority.optional(),
    due_date: isoDate.optional(),
  }),

  update_task: z.strictObject({
    task_id: uuid,
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
} as const;

export type ActionName = keyof typeof actionSchemas;
export type ActionParams<N extends ActionName> = z.infer<(typeof actionSchemas)[N]>;

export function isActionName(v: unknown): v is ActionName {
  return typeof v === 'string' && v in actionSchemas;
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
  return { ok: true, params: parsed.data as Record<string, unknown> };
}

// A proposal as shown on the chat card and posted back on Confirm.
export type Proposal = {
  action: ActionName;
  params: Record<string, unknown>;
  // Human-readable lines for the card, e.g. ["Project: Rock Jar reel", "Due: 2026-07-11"].
  summary: string[];
};

// ── Friendly summaries ───────────────────────────────────────────────────────
// Resolves related record names (so cards say "Project: Rock Jar reel", not a
// UUID) and lists the changes. Read-only; runs at propose time.

const nice = (s: string) => s.replaceAll('_', ' ');

export async function describeAction(
  action: ActionName,
  params: Record<string, unknown>,
  supabase: DB,
): Promise<string[]> {
  const lines: string[] = [];
  const skip = new Set(['project_id', 'client_id', 'task_id', 'line_items']);

  // Resolve IDs to names for context.
  if (typeof params.project_id === 'string') {
    const { data } = await supabase
      .from('projects')
      .select('title')
      .eq('id', params.project_id)
      .maybeSingle();
    lines.push(`Project: ${data?.title ?? 'unknown project'}`);
  }
  if (typeof params.client_id === 'string') {
    const { data } = await supabase
      .from('clients')
      .select('name')
      .eq('id', params.client_id)
      .maybeSingle();
    lines.push(`Client: ${data?.name ?? 'unknown client'}`);
  }
  if (typeof params.task_id === 'string') {
    const { data } = await supabase
      .from('tasks')
      .select('title')
      .eq('id', params.task_id)
      .maybeSingle();
    lines.push(`Task: ${data?.title ?? 'unknown task'}`);
  }

  // List the fields being set/changed.
  for (const [key, value] of Object.entries(params)) {
    if (skip.has(key) || value === undefined) continue;
    lines.push(`${nice(key)[0].toUpperCase()}${nice(key).slice(1)}: ${value === null ? '(cleared)' : nice(String(value))}`);
  }

  // Quote line items get their own block with a computed total.
  if (action === 'create_quote' && Array.isArray(params.line_items)) {
    let total = 0;
    for (const item of params.line_items as ActionParams<'create_quote'>['line_items']) {
      const amount = item.quantity * item.rate;
      total += amount;
      lines.push(
        `• ${item.label} — ${item.quantity}${item.unit ? ` ${item.unit}` : ''} × $${item.rate.toLocaleString()} = $${amount.toLocaleString()}`,
      );
    }
    lines.push(`Total: $${total.toLocaleString()} (saved as a draft)`);
  }

  return lines;
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
      if (error) throw new Error(error.message);
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
      if (error) throw new Error(error.message);
      return `Updated task “${data.title}”.`;
    }

    case 'create_project': {
      const p = parsed.data as ActionParams<'create_project'>;
      const { data, error } = await supabase
        .from('projects')
        .insert(p)
        .select('id, title')
        .single();
      if (error) throw new Error(error.message);
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
      if (error) throw new Error(error.message);
      return `Updated project “${data.title}”.`;
    }

    case 'create_client': {
      const p = parsed.data as ActionParams<'create_client'>;
      const { data, error } = await supabase
        .from('clients')
        .insert(p)
        .select('id, name')
        .single();
      if (error) throw new Error(error.message);
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
      if (error) throw new Error(error.message);
      return `Updated client “${data.name}”.`;
    }

    case 'create_quote': {
      const { line_items, ...quote } = parsed.data as ActionParams<'create_quote'>;
      // Totals are computed HERE, server-side — never taken from the model.
      const items = line_items.map((item, i) => ({
        label: item.label,
        quantity: item.quantity,
        unit: item.unit ?? null,
        rate: item.rate,
        amount: Math.round(item.quantity * item.rate * 100) / 100,
        position: i,
      }));
      const subtotal = Math.round(items.reduce((s, it) => s + it.amount, 0) * 100) / 100;

      const { data: created, error } = await supabase
        .from('quotes')
        .insert({ ...quote, status: 'draft', subtotal, total: subtotal })
        .select('id, title')
        .single();
      if (error) throw new Error(error.message);

      const { error: itemsError } = await supabase
        .from('quote_line_items')
        .insert(items.map((it) => ({ ...it, quote_id: created.id })));
      if (itemsError) {
        // Don't leave a half-made quote behind if the line items failed.
        await supabase.from('quotes').delete().eq('id', created.id);
        throw new Error(itemsError.message);
      }
      return `Saved draft quote “${created.title}” — $${subtotal.toLocaleString()}.`;
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
  }
}
