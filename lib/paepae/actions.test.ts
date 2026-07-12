// Tests for PaePae's write-gate core logic — the security-critical, pure parts:
//   - schema validation (incl. rejecting unknown keys and no-op updates)
//   - server-authoritative quote maths (never trust the model's numbers)
//   - the propose_* → action name mapping
//
// These are the pieces where a silent regression could let a malformed or
// tampered proposal through, or miscompute money. They need no database.

import { describe, it, expect } from 'vitest';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/types/database.types';
import {
  validateAction,
  computeQuoteLineItems,
  buildProposal,
  isActionName,
  requiresConfirmation,
  actionSchemas,
  type ActionName,
} from './actions';
import { actionFromToolName, toolNameFor } from './tools';

// A tiny stand-in for the Supabase client that only supports the narrow chain
// buildProposal uses: from(table).select(cols).eq('id', id).maybeSingle().
// `rows` maps "table:id" -> the row to return (absence => null, i.e. not found).
function fakeSupabase(rows: Record<string, Record<string, unknown>>) {
  return {
    from(table: string) {
      return {
        select() {
          return {
            eq(_col: string, id: string) {
              return {
                async maybeSingle() {
                  return { data: rows[`${table}:${id}`] ?? null, error: null };
                },
              };
            },
          };
        },
      };
    },
  } as unknown as SupabaseClient<Database>;
}

const ID = 'f47ac10b-58cc-4372-a567-0e02b2c3d479';

describe('validateAction', () => {
  it('accepts a well-formed create_task', () => {
    const res = validateAction('create_task', {
      project_id: 'f47ac10b-58cc-4372-a567-0e02b2c3d479',
      title: 'Storyboard the intro',
    });
    expect(res.ok).toBe(true);
  });

  it('rejects a non-UUID id', () => {
    const res = validateAction('create_task', { project_id: 'not-a-uuid', title: 'x' });
    expect(res.ok).toBe(false);
  });

  it('rejects unknown keys (strictObject)', () => {
    const res = validateAction('create_client', { name: 'Rock Jar', is_admin: true });
    expect(res.ok).toBe(false);
  });

  it('rejects an update with only an id and nothing to change', () => {
    const res = validateAction('update_task', {
      task_id: 'f47ac10b-58cc-4372-a567-0e02b2c3d479',
    });
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.error).toMatch(/at least one field/i);
  });

  it('accepts an update that changes exactly one field', () => {
    const res = validateAction('update_task', {
      task_id: 'f47ac10b-58cc-4372-a567-0e02b2c3d479',
      status: 'done',
    });
    expect(res.ok).toBe(true);
  });

  it('rejects a status value outside the enum', () => {
    const res = validateAction('update_task', {
      task_id: 'f47ac10b-58cc-4372-a567-0e02b2c3d479',
      status: 'finished',
    });
    expect(res.ok).toBe(false);
  });

  it('rejects a create_quote with no line items', () => {
    const res = validateAction('create_quote', {
      client_id: 'f47ac10b-58cc-4372-a567-0e02b2c3d479',
      title: 'Empty',
      line_items: [],
    });
    expect(res.ok).toBe(false);
  });

  it('rejects a negative rate on a line item', () => {
    const res = validateAction('create_quote', {
      client_id: 'f47ac10b-58cc-4372-a567-0e02b2c3d479',
      title: 'Bad',
      line_items: [{ label: 'Day rate', quantity: 1, rate: -100 }],
    });
    expect(res.ok).toBe(false);
  });

  it('accepts a well-formed create_contract with an optional amount', () => {
    const res = validateAction('create_contract', {
      project_id: ID,
      title: 'Production agreement',
      notes: 'Standard terms.',
      amount: 5000,
    });
    expect(res.ok).toBe(true);
  });

  it('rejects a create_contract with a negative amount', () => {
    const res = validateAction('create_contract', {
      project_id: ID,
      title: 'Bad',
      amount: -1,
    });
    expect(res.ok).toBe(false);
  });

  it('accepts a create_invoice with just a quote id', () => {
    const res = validateAction('create_invoice', { quote_id: ID });
    expect(res.ok).toBe(true);
  });

  it('accepts a create_invoice with an optional due date', () => {
    const res = validateAction('create_invoice', { quote_id: ID, due_date: '2026-08-01' });
    expect(res.ok).toBe(true);
  });

  it('rejects a create_invoice with a malformed due date', () => {
    const res = validateAction('create_invoice', { quote_id: ID, due_date: '08/01/2026' });
    expect(res.ok).toBe(false);
  });

  it('rejects a create_invoice with no quote id', () => {
    const res = validateAction('create_invoice', { due_date: '2026-08-01' });
    expect(res.ok).toBe(false);
  });

  it('allows update_client to clear a nullable field', () => {
    const res = validateAction('update_client', {
      client_id: 'f47ac10b-58cc-4372-a567-0e02b2c3d479',
      company: null,
    });
    expect(res.ok).toBe(true);
  });
});

describe('computeQuoteLineItems (server-authoritative maths)', () => {
  it('computes per-line amounts, positions, and a subtotal', () => {
    const { items, subtotal } = computeQuoteLineItems([
      { label: 'Filming day', quantity: 2, unit: 'days', rate: 1500 },
      { label: 'Edit', quantity: 1, rate: 800 },
    ]);
    expect(items[0]).toMatchObject({ amount: 3000, position: 0, unit: 'days' });
    expect(items[1]).toMatchObject({ amount: 800, position: 1, unit: null });
    expect(subtotal).toBe(3800);
  });

  it('rounds each line to cents so the subtotal does not drift', () => {
    // 0.1 * 3 is 0.30000000000000004 in float; rounding must keep it clean.
    const { items, subtotal } = computeQuoteLineItems([
      { label: 'a', quantity: 3, rate: 0.1 },
      { label: 'b', quantity: 3, rate: 0.1 },
    ]);
    expect(items[0].amount).toBe(0.3);
    expect(subtotal).toBe(0.6);
  });
});

describe('buildProposal (propose-time reference check)', () => {
  it('refuses to build a card when the referenced project does not exist', async () => {
    const supabase = fakeSupabase({}); // nothing resolves
    const res = await buildProposal('create_task', { project_id: ID, title: 'Edit' }, supabase);
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.error).toMatch(/no project/i);
  });

  it('resolves the referenced record name and builds a summary when it exists', async () => {
    const supabase = fakeSupabase({ [`projects:${ID}`]: { title: 'Rock Jar reel' } });
    const res = await buildProposal('create_task', { project_id: ID, title: 'Edit' }, supabase);
    expect(res.ok).toBe(true);
    if (res.ok) {
      expect(res.proposal.summary).toContain('Project: Rock Jar reel');
      expect(res.proposal.summary).toContain('Title: Edit');
    }
  });

  it('includes a server-computed total line for a draft quote', async () => {
    const supabase = fakeSupabase({ [`clients:${ID}`]: { name: 'Rock Jar' } });
    const res = await buildProposal(
      'create_quote',
      { client_id: ID, title: 'Launch film', line_items: [{ label: 'Day', quantity: 2, rate: 1500 }] },
      supabase,
    );
    expect(res.ok).toBe(true);
    if (res.ok) {
      expect(res.proposal.summary.some((l) => l.includes('Total: $3,000'))).toBe(true);
    }
  });
});

describe('action name helpers', () => {
  it('maps propose_* tool names back to actions', () => {
    expect(actionFromToolName('propose_create_task')).toBe('create_task');
    expect(actionFromToolName('propose_create_quote')).toBe('create_quote');
  });

  it('returns null for read tools and unknown names', () => {
    expect(actionFromToolName('list_projects')).toBeNull();
    expect(actionFromToolName('propose_delete_everything')).toBeNull();
  });

  it('isActionName agrees with the schema keys', () => {
    for (const name of Object.keys(actionSchemas) as ActionName[]) {
      expect(isActionName(name)).toBe(true);
    }
    expect(isActionName('delete_task')).toBe(false);
  });
});

describe('autonomy policy (owner, 2026-07-11)', () => {
  // "Outside-world" actions need a Confirm click; everything else is auto.
  const GATED: ActionName[] = ['create_invoice', 'send_email', 'create_event'];

  it('gates exactly the outside-world actions; everything else is auto', () => {
    for (const name of Object.keys(actionSchemas) as ActionName[]) {
      expect(requiresConfirmation(name)).toBe(GATED.includes(name));
    }
  });

  it('auto actions use bare tool names; gated ones keep the propose_ prefix', () => {
    expect(toolNameFor('create_task')).toBe('create_task');
    expect(toolNameFor('create_invoice')).toBe('propose_create_invoice');
  });

  it('bare tool names map back to actions too', () => {
    expect(actionFromToolName('create_task')).toBe('create_task');
    expect(actionFromToolName('update_client')).toBe('update_client');
  });

  it('tasks no longer need a project (standalone, or client-attached)', () => {
    expect(validateAction('create_task', { title: 'Order gaffer tape' }).ok).toBe(true);
    expect(validateAction('create_task', { title: 'Call back', client_id: ID }).ok).toBe(true);
    // update_task can attach or detach a project later
    expect(validateAction('update_task', { task_id: ID, project_id: ID }).ok).toBe(true);
    expect(validateAction('update_task', { task_id: ID, project_id: null }).ok).toBe(true);
  });
});

// ── New actions (full-visibility slice, 2026-07-11) ──────────────────────────

describe('expanded action schemas', () => {
  const PID = '11111111-1111-4111-8111-111111111111';
  const CID = '22222222-2222-4222-8222-222222222222';

  it('validates create_deliverable and rejects unknown keys', () => {
    expect(
      validateAction('create_deliverable', { project_id: PID, title: 'Rough cut', due_date: '2026-08-01' }).ok,
    ).toBe(true);
    expect(
      validateAction('create_deliverable', { project_id: PID, title: 'Rough cut', sneaky: true }).ok,
    ).toBe(false);
  });

  it('rejects a no-op update_milestone (id only)', () => {
    expect(validateAction('update_milestone', { milestone_id: PID }).ok).toBe(false);
    expect(validateAction('update_milestone', { milestone_id: PID, status: 'done' }).ok).toBe(true);
  });

  it('enforces the status enums on record-status actions', () => {
    expect(validateAction('update_quote_status', { quote_id: PID, status: 'accepted' }).ok).toBe(true);
    expect(validateAction('update_quote_status', { quote_id: PID, status: 'paid' }).ok).toBe(false);
    expect(validateAction('update_invoice_status', { invoice_id: PID, status: 'paid' }).ok).toBe(true);
    expect(validateAction('update_invoice_status', { invoice_id: PID, status: 'accepted' }).ok).toBe(false);
  });

  it('validates assign_contractor and bounds the rate', () => {
    expect(validateAction('assign_contractor', { project_id: PID, contractor_id: CID, role: 'Editor' }).ok).toBe(true);
    expect(validateAction('assign_contractor', { project_id: PID, contractor_id: CID, rate: -5 }).ok).toBe(false);
  });

  it('keeps the confirm gate on the outside-world actions only', () => {
    const gated = (Object.keys(actionSchemas) as ActionName[]).filter(requiresConfirmation);
    expect(gated.sort()).toEqual(['create_event', 'create_invoice', 'send_email']);
    // Gated tools keep the propose_ prefix; auto tools use the bare name.
    expect(toolNameFor('create_invoice')).toBe('propose_create_invoice');
    expect(toolNameFor('send_email')).toBe('propose_send_email');
    expect(toolNameFor('create_event')).toBe('propose_create_event');
    expect(toolNameFor('update_invoice_status')).toBe('update_invoice_status');
    expect(actionFromToolName('propose_create_invoice')).toBe('create_invoice');
    expect(actionFromToolName('assign_contractor')).toBe('assign_contractor');
  });
});

// ── Outside-world actions (Phase 3: Gmail + Google Calendar) ────────────────

describe('send_email / create_event schemas', () => {
  it('validates a complete email and rejects a bad address', () => {
    expect(
      validateAction('send_email', { to: 'client@example.com', subject: 'Hi', body: 'Hello there' }).ok,
    ).toBe(true);
    expect(validateAction('send_email', { to: 'not-an-email', subject: 'Hi', body: 'x' }).ok).toBe(false);
    expect(validateAction('send_email', { to: 'client@example.com', subject: 'Hi' }).ok).toBe(false);
  });

  it('validates event times and requires end after start', () => {
    const base = { title: 'Kickoff call', attendees: ['client@example.com'] };
    expect(
      validateAction('create_event', { ...base, start: '2026-07-15T14:00', end: '2026-07-15T14:30' }).ok,
    ).toBe(true);
    expect(
      validateAction('create_event', { ...base, start: '2026-07-15T14:30', end: '2026-07-15T14:00' }).ok,
    ).toBe(false);
    expect(validateAction('create_event', { ...base, start: 'tomorrow 2pm', end: '3pm' }).ok).toBe(false);
  });
});
