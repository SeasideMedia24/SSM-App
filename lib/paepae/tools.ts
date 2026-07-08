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
import type Anthropic from '@anthropic-ai/sdk';
import type { SupabaseClient } from '@supabase/supabase-js';
import type {
  Database,
  ProjectStatus,
  TaskStatus,
  QuoteStatus,
} from '@/types/database.types';

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

// Tool definitions handed to the Claude API. Descriptions are prescriptive about
// *when* to call each one — recent models reach for tools more deliberately, so
// the trigger conditions matter.
export const paepaeTools: Anthropic.Tool[] = [
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
];

type ToolInput = Record<string, unknown>;

// Executes one tool call and returns a compact JSON string for the model.
// Throws on unknown tools / query errors; the caller turns that into an
// is_error tool_result so PaePae can recover gracefully.
export async function runTool(name: string, input: ToolInput, supabase: DB): Promise<string> {
  switch (name) {
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
