// PaePae's read-only tools.
//
// Every tool here only READS. They run through the caller's RLS-scoped Supabase
// server client (see the route handler), so PaePae can only ever see the same
// rows the signed-in user can — no elevated access, no writes. To add a new
// read tool: add a definition to `paepaeTools` and a case to `runTool`.
//
// When we add write/send actions in a later slice, they must NOT go here as
// silent tools — they belong behind an explicit "propose → confirm → execute"
// gate in the UI.

import 'server-only';
import { z } from 'zod';
import type Anthropic from '@anthropic-ai/sdk';
import type { SupabaseClient } from '@supabase/supabase-js';
import type {
  Database,
  ProjectStatus,
  TaskStatus,
  QuoteStatus,
  InvoiceStatus,
} from '@/types/database.types';
import { actionSchemas, type ActionName, isActionName, requiresConfirmation } from './actions';
import { getBriefing } from './briefing';

type DB = SupabaseClient<Database>;

// The valid status values per table (kept in sync with the DB enums in
// types/database.types.ts). We validate the model's input against these so a
// stray value simply falls back to the default rather than erroring.
const PROJECT_STATUSES: readonly ProjectStatus[] = [
  'idea_inquiry',
  'scripting_planning',
  'filming',
  'editing',
  'review_revision',
  'scheduled',
  'archived',
];
const TASK_STATUSES: readonly TaskStatus[] = ['not_started', 'in_progress', 'done'];
const QUOTE_STATUSES: readonly QuoteStatus[] = ['draft', 'sent', 'accepted', 'declined'];
const INVOICE_STATUSES: readonly InvoiceStatus[] = ['draft', 'sent', 'paid'];
// Inquiry status is a plain-text column; these are the values the app writes.
const INQUIRY_STATUSES = ['new', 'reviewed', 'archived'] as const;

// Tool definitions handed to the Claude API. Descriptions are prescriptive about
// *when* to call each one — recent models reach for tools more deliberately, so
// the trigger conditions matter.
export const paepaeTools: Anthropic.Tool[] = [
  {
    name: 'get_briefing',
    description:
      "Get one snapshot of what needs attention right now: overdue tasks, tasks due in the next 7 days, the active project pipeline (count per stage), quotes needing attention (drafts not yet sent, and sent quotes awaiting a reply), overdue invoices (sent and past due), and the count of new inquiries awaiting review. Call this FIRST — a single call — whenever Jeremy asks for a summary, a digest, a daily or weekly rundown, 'what needs my attention', or 'what's going on', instead of stitching together the list_* tools yourself.",
    input_schema: { type: 'object', properties: {}, additionalProperties: false },
  },
  {
    name: 'list_clients',
    description:
      'List clients (name, company, email, phone, type). Call this when the question is about who a client is, their contact details, or to look up a client before drafting a message to them.',
    input_schema: { type: 'object', properties: {}, additionalProperties: false },
  },
  {
    name: 'list_projects',
    description:
      "List projects with their client, status, priority, and due date. Call this for anything about active work, what's in the pipeline, or what's due. Optionally filter by status.",
    input_schema: {
      type: 'object',
      properties: {
        status: {
          type: 'string',
          description:
            'Optional status filter. One of: idea_inquiry, scripting_planning, filming, editing, review_revision, scheduled, archived. Omit to get everything except archived.',
        },
      },
      additionalProperties: false,
    },
  },
  {
    name: 'list_tasks',
    description:
      'List tasks with their project, status, priority, and due date. Call this to see what needs doing, what is overdue, or to build a to-do plan. Optionally filter by status or a single project.',
    input_schema: {
      type: 'object',
      properties: {
        status: {
          type: 'string',
          description: 'Optional status filter. One of: not_started, in_progress, done.',
        },
        project_id: {
          type: 'string',
          description: 'Optional project id to limit tasks to one project.',
        },
      },
      additionalProperties: false,
    },
  },
  {
    name: 'list_quotes',
    description:
      'List quotes with their client, status, and total. Call this for questions about quotes sent, pending, accepted, or recent revenue. Optionally filter by status.',
    input_schema: {
      type: 'object',
      properties: {
        status: {
          type: 'string',
          description: 'Optional status filter. One of: draft, sent, accepted, declined.',
        },
      },
      additionalProperties: false,
    },
  },
  {
    name: 'list_contractors',
    description:
      'List the team — contractors and employees — with their type, role, contact details, day/half-day/hourly rates, and how many projects each is assigned to. Call this for anything about who is on the team, crew availability, rates, or before assigning someone to a project.',
    input_schema: { type: 'object', properties: {}, additionalProperties: false },
  },
  {
    name: 'list_invoices',
    description:
      'List invoices with their client, status (draft/sent/paid), total, and due date. Call this for anything about billing, unpaid or overdue invoices, or money owed. Optionally filter by status.',
    input_schema: {
      type: 'object',
      properties: {
        status: {
          type: 'string',
          description: 'Optional status filter. One of: draft, sent, paid.',
        },
      },
      additionalProperties: false,
    },
  },
  {
    name: 'list_deliverables',
    description:
      'List deliverables with their project, status, and due date. Call this for anything about what the studio owes clients, or before updating a deliverable. Optionally filter by project or status.',
    input_schema: {
      type: 'object',
      properties: {
        project_id: { type: 'string', description: 'Optional project id to limit to one project.' },
        status: { type: 'string', description: 'Optional status filter. One of: not_started, in_progress, done.' },
      },
      additionalProperties: false,
    },
  },
  {
    name: 'list_milestones',
    description:
      'List milestones with their project, status, and date. Call this for schedule questions or before updating a milestone. Optionally filter by project.',
    input_schema: {
      type: 'object',
      properties: {
        project_id: { type: 'string', description: 'Optional project id to limit to one project.' },
      },
      additionalProperties: false,
    },
  },
  {
    name: 'list_inquiries',
    description:
      'List inquiries (leads from the public onboarding form) with contact details, what they want, budget range, and status. Call this for anything about new leads or follow-ups. Optionally filter by status (new, reviewed, archived).',
    input_schema: {
      type: 'object',
      properties: {
        status: { type: 'string', description: 'Optional status filter. One of: new, reviewed, archived.' },
      },
      additionalProperties: false,
    },
  },
];

// ── Action tools (write powers) ──────────────────────────────────────────────
// One tool per action in lib/paepae/actions.ts. Input schemas are generated
// from the same zod schemas that validate execution, so the two can never
// drift apart. Two flavors, per the autonomy policy in actions.ts:
//
//   • AUTO actions (most): tool name is the bare action ("create_task"). The
//     route validates, verifies referenced records, executes immediately, and
//     the user sees a receipt card.
//   • CONFIRM actions (sends/invoices): tool name keeps the "propose_" prefix.
//     Calling one only shows a confirmation card — /api/paepae/execute writes
//     after the user clicks Confirm.

const PROPOSE_PREFIX = 'propose_';

// When each write tool should be reached for — shown to the model.
const actionDescriptions: Record<ActionName, string> = {
  create_task:
    'Create a task immediately. A project is OPTIONAL — tasks can stand alone, or attach to a project (project_id) and/or client (client_id); look ids up first (list_projects/list_clients) when attaching. The owner sees a receipt card.',
  update_task:
    'Update an existing task immediately (title, description, status, priority, due date — including marking it done — or attach/detach a project or client). Look the task up first (list_tasks) to get its id.',
  create_project:
    'Create a new project for a client immediately. Look up the client first (list_clients) to get its id.',
  update_project:
    'Update an existing project immediately (title, status, priority, dates, type). Look the project up first (list_projects) to get its id.',
  create_client:
    'Add a new client record immediately (name, company, contact details, notes, type).',
  update_client:
    'Update an existing client record immediately. Look the client up first (list_clients) to get its id.',
  create_quote:
    'Save a DRAFT quote for a client immediately, with line items (label, quantity, unit, rate). Totals are computed server-side. Use list_quotes/list_clients first for context; check pricing with the owner if unsure. Never mark a quote sent or accepted.',
  create_contract:
    'Draft a contract for a project immediately (title, notes for the terms, optional amount). Look up the project first (list_projects). Saved as a DRAFT — you never mark a contract sent or signed.',
  create_invoice:
    'Propose creating an invoice from an existing quote — it copies the quote\'s line items and total into a DRAFT invoice for the same client. Look the quote up first (list_quotes) to get its id. Optionally set a due date (YYYY-MM-DD; defaults to 14 days out). You never mark an invoice sent or paid. REQUIRES the owner\'s confirmation — the card must be confirmed before anything happens.',
  create_deliverable:
    'Add a deliverable to a project immediately (title, optional description/status/due date). Look up the project first (list_projects) to get its id.',
  update_deliverable:
    'Update an existing deliverable immediately (title, description, status — including marking it done — or due date). Look it up first (list_deliverables) to get its id.',
  create_milestone:
    'Add a milestone to a project immediately (title, optional date/status). Look up the project first (list_projects) to get its id.',
  update_milestone:
    'Update an existing milestone immediately (title, date, status). Look it up first (list_milestones) to get its id.',
  assign_contractor:
    'Assign a team member to a project immediately, optionally with a role and a booked rate (rate + rate_unit like "day"/"half day"/"hour"). Look up both ids first (list_contractors, list_projects).',
  update_contract:
    'Update an existing contract immediately (title, notes, amount, status draft/sent/signed/declined, signed date). Only set status/signed_date when the owner says that actually happened. Look the contract up via its project first.',
  update_quote_status:
    'Record a quote\'s real-world status immediately (draft/sent/accepted/declined). ONLY use this when the owner explicitly says it happened (e.g. "mark the Acme quote accepted — they said yes"); you cannot send quotes yourself. Look the quote up first (list_quotes).',
  update_invoice_status:
    'Record an invoice\'s real-world status immediately (draft/sent/paid) — bookkeeping timestamps are kept in step automatically. ONLY use this when the owner explicitly says it happened; you cannot send invoices yourself. Look the invoice up first (list_invoices).',
};

// "create_task" for auto actions; "propose_create_invoice" for gated ones.
export function toolNameFor(action: ActionName): string {
  return requiresConfirmation(action) ? `${PROPOSE_PREFIX}${action}` : action;
}

// Build the Anthropic tool definitions from the zod schemas.
export const actionTools: Anthropic.Tool[] = (
  Object.keys(actionSchemas) as ActionName[]
).map((action) => {
  const schema = z.toJSONSchema(actionSchemas[action]) as Record<string, unknown>;
  delete schema.$schema; // Anthropic wants a bare JSON schema object
  return {
    name: toolNameFor(action),
    description: actionDescriptions[action],
    input_schema: schema as Anthropic.Tool['input_schema'],
  };
});

// Everything PaePae gets: read tools + action tools.
export const allPaepaeTools: Anthropic.Tool[] = [...paepaeTools, ...actionTools];

// "create_task" or "propose_create_invoice" -> the ActionName; null for
// anything that isn't a write action (read tools, unknown names).
export function actionFromToolName(toolName: string): ActionName | null {
  const bare = toolName.startsWith(PROPOSE_PREFIX)
    ? toolName.slice(PROPOSE_PREFIX.length)
    : toolName;
  return isActionName(bare) ? bare : null;
}

type ToolInput = Record<string, unknown>;

// Executes one tool call and returns a compact JSON string for the model.
// Throws on unknown tools / query errors; the caller turns that into an
// is_error tool_result so PaePae can recover gracefully.
export async function runTool(name: string, input: ToolInput, supabase: DB): Promise<string> {
  switch (name) {
    case 'get_briefing': {
      const today = new Date().toISOString().slice(0, 10);
      const briefing = await getBriefing(supabase, today);
      return JSON.stringify(briefing);
    }

    case 'list_clients': {
      const { data, error } = await supabase
        .from('clients')
        .select('id, name, company, email, phone, client_type')
        .order('name');
      if (error) throw error;
      return JSON.stringify(data ?? []);
    }

    case 'list_projects': {
      let q = supabase
        .from('projects')
        .select('id, title, status, priority, due_date, start_date, clients(name)')
        .order('due_date', { nullsFirst: false });
      const status = asEnum(input.status, PROJECT_STATUSES);
      if (status) q = q.eq('status', status);
      else q = q.neq('status', 'archived');
      const { data, error } = await q;
      if (error) throw error;
      return JSON.stringify(data ?? []);
    }

    case 'list_tasks': {
      let q = supabase
        .from('tasks')
        .select('id, title, status, priority, due_date, projects(title)')
        .order('due_date', { nullsFirst: false });
      const status = asEnum(input.status, TASK_STATUSES);
      const projectId = asString(input.project_id);
      if (status) q = q.eq('status', status);
      if (projectId) q = q.eq('project_id', projectId);
      const { data, error } = await q;
      if (error) throw error;
      return JSON.stringify(data ?? []);
    }

    case 'list_quotes': {
      let q = supabase
        .from('quotes')
        .select('id, title, status, total, subtotal, clients(name)')
        .order('created_at', { ascending: false });
      const status = asEnum(input.status, QUOTE_STATUSES);
      if (status) q = q.eq('status', status);
      const { data, error } = await q;
      if (error) throw error;
      return JSON.stringify(data ?? []);
    }

    case 'list_contractors': {
      const { data, error } = await supabase
        .from('contractors')
        .select('id, name, type, role, email, phone, rate_full, rate_half, rate_hourly, project_contractors(count)')
        .order('name');
      if (error) throw error;
      // Flatten the assignment count join into a plain number for the model.
      const rows = (data ?? []).map(({ project_contractors, ...c }) => ({
        ...c,
        project_count: (project_contractors as unknown as { count: number }[] | null)?.[0]?.count ?? 0,
      }));
      return JSON.stringify(rows);
    }

    case 'list_invoices': {
      let q = supabase
        .from('invoices')
        .select('id, invoice_number, title, status, total, issue_date, due_date, clients(name), projects(title)')
        .order('created_at', { ascending: false });
      const status = asEnum(input.status, INVOICE_STATUSES);
      if (status) q = q.eq('status', status);
      const { data, error } = await q;
      if (error) throw error;
      return JSON.stringify(data ?? []);
    }

    case 'list_deliverables': {
      let q = supabase
        .from('deliverables')
        .select('id, title, status, due_date, project_id, projects(title)')
        .order('due_date', { ascending: true, nullsFirst: false });
      const status = asEnum(input.status, TASK_STATUSES);
      const projectId = asString(input.project_id);
      if (status) q = q.eq('status', status);
      if (projectId) q = q.eq('project_id', projectId);
      const { data, error } = await q;
      if (error) throw error;
      return JSON.stringify(data ?? []);
    }

    case 'list_milestones': {
      let q = supabase
        .from('milestones')
        .select('id, title, status, date, project_id, projects(title)')
        .order('date', { ascending: true, nullsFirst: false });
      const projectId = asString(input.project_id);
      if (projectId) q = q.eq('project_id', projectId);
      const { data, error } = await q;
      if (error) throw error;
      return JSON.stringify(data ?? []);
    }

    case 'list_inquiries': {
      let q = supabase
        .from('onboarding_submissions')
        .select('id, name, company, email, phone, project_type, project_description, budget_range, desired_timeline, status, created_at')
        .order('created_at', { ascending: false });
      const status = asEnum(input.status, INQUIRY_STATUSES);
      if (status) q = q.eq('status', status);
      const { data, error } = await q;
      if (error) throw error;
      return JSON.stringify(data ?? []);
    }

    default:
      throw new Error(`Unknown tool: ${name}`);
  }
}

// Narrow an unknown tool-input field to a non-empty trimmed string, else undefined.
function asString(v: unknown): string | undefined {
  if (typeof v !== 'string') return undefined;
  const t = v.trim();
  return t.length ? t : undefined;
}

// Narrow an unknown tool-input field to a valid enum member, else undefined.
// Guards against the model passing a status value that isn't in the schema.
function asEnum<T extends string>(v: unknown, allowed: readonly T[]): T | undefined {
  const s = asString(v);
  return s && (allowed as readonly string[]).includes(s) ? (s as T) : undefined;
}
