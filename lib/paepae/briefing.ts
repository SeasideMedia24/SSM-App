// PaePae's "what needs attention" briefing — a single, server-computed snapshot
// so summaries are reliable and consistent, rather than the model stitching
// together separate list calls and possibly miscounting.
//
// Everything here READS only, through the caller's RLS-scoped Supabase client
// (same guarantee as the other read tools). The bucketing/counting is split out
// into pure helpers so it can be unit tested without a database.

import 'server-only';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database, ProjectStatus, TaskPriority, QuoteStatus } from '@/types/database.types';
import { PROJECT_STATUSES } from '@/lib/projects/status';

type DB = SupabaseClient<Database>;

// How many days ahead counts as "due soon".
const HORIZON_DAYS = 7;

export type BriefTask = {
  id: string;
  title: string;
  due_date: string | null;
  priority: TaskPriority;
  project: string | null;
};

export type BriefQuote = {
  id: string;
  title: string;
  total: number;
  client: string | null;
};

export type PipelineStage = { status: ProjectStatus; label: string; count: number };

export type BriefInvoice = {
  id: string;
  title: string;
  invoice_number: string | null;
  total: number;
  due_date: string | null;
  client: string | null;
};

export type Briefing = {
  today: string;
  horizonDays: number;
  overdueTasks: BriefTask[];
  dueSoonTasks: BriefTask[];
  activeProjectCount: number;
  pipeline: PipelineStage[];
  draftQuotes: BriefQuote[]; // saved but not sent yet
  awaitingQuotes: BriefQuote[]; // sent, awaiting a client reply
  overdueInvoices: BriefInvoice[]; // sent and past their due date
  newInquiryCount: number; // fresh leads awaiting review
};

// ── Pure helpers (unit tested) ───────────────────────────────────────────────

// Add whole days to a YYYY-MM-DD string, staying in UTC so there's no DST drift.
export function addDays(isoDate: string, days: number): string {
  const d = new Date(`${isoDate}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

// Split dated tasks into overdue (before today) and due-soon (today..horizon).
// Tasks with no due date are left out — they aren't time-pressing. YYYY-MM-DD
// strings compare correctly with <, so no Date parsing is needed here.
export function bucketTasks<T extends { due_date: string | null }>(
  tasks: T[],
  today: string,
  horizonDays: number = HORIZON_DAYS,
): { overdue: T[]; dueSoon: T[] } {
  const horizon = addDays(today, horizonDays);
  const overdue: T[] = [];
  const dueSoon: T[] = [];
  for (const t of tasks) {
    if (!t.due_date) continue;
    if (t.due_date < today) overdue.push(t);
    else if (t.due_date <= horizon) dueSoon.push(t);
  }
  return { overdue, dueSoon };
}

// Count active projects per stage, in the board's left-to-right order, omitting
// stages with nothing in them (and archived projects entirely).
export function pipelineByStage<T extends { status: ProjectStatus }>(projects: T[]): PipelineStage[] {
  const counts = new Map<ProjectStatus, number>();
  for (const p of projects) counts.set(p.status, (counts.get(p.status) ?? 0) + 1);
  return PROJECT_STATUSES.filter((s) => s.value !== 'archived' && (counts.get(s.value) ?? 0) > 0).map((s) => ({
    status: s.value,
    label: s.label,
    count: counts.get(s.value)!,
  }));
}

// Quotes that need attention: drafts (not sent) and sent (awaiting a reply).
// Accepted/declined quotes are resolved and left out.
export function bucketQuotes<T extends { status: QuoteStatus }>(quotes: T[]): { draft: T[]; awaiting: T[] } {
  return {
    draft: quotes.filter((q) => q.status === 'draft'),
    awaiting: quotes.filter((q) => q.status === 'sent'),
  };
}

// Supabase returns a to-one join as an object, but the generated types can widen
// it to an array — read the name defensively either way.
function relName(rel: unknown, key: string): string | null {
  const obj = Array.isArray(rel) ? rel[0] : rel;
  if (obj && typeof obj === 'object' && typeof (obj as Record<string, unknown>)[key] === 'string') {
    return (obj as Record<string, string>)[key];
  }
  return null;
}

// ── The fetch (RLS-scoped) ───────────────────────────────────────────────────

export async function getBriefing(supabase: DB, today: string): Promise<Briefing> {
  const horizon = addDays(today, HORIZON_DAYS);

  const [{ data: tasks }, { data: projects }, { data: quotes }, { data: invoices }, { count: inquiryCount }] = await Promise.all([
    // Only pull tasks we'll actually bucket: not done, not archived, dated, and
    // due on or before the horizon (overdue tasks are <= horizon too). Archived
    // tasks never count — archiving means "out of my face" everywhere.
    supabase
      .from('tasks')
      .select('id, title, due_date, priority, projects(title)')
      .neq('status', 'done')
      .is('archived_at', null)
      .not('due_date', 'is', null)
      .lte('due_date', horizon)
      .order('due_date'),
    supabase.from('projects').select('id, status').neq('status', 'archived'),
    supabase
      .from('quotes')
      .select('id, title, total, status, clients(name)')
      .in('status', ['draft', 'sent'])
      .order('created_at', { ascending: false }),
    // Sent invoices already past their due date — money to chase.
    supabase
      .from('invoices')
      .select('id, title, invoice_number, total, due_date, clients(name)')
      .eq('status', 'sent')
      .lt('due_date', today)
      .order('due_date'),
    // Fresh leads nobody has looked at yet.
    supabase
      .from('onboarding_submissions')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'new'),
  ]);

  const briefTasks: BriefTask[] = (tasks ?? []).map((t) => ({
    id: t.id,
    title: t.title,
    due_date: t.due_date,
    priority: t.priority,
    project: relName(t.projects, 'title'),
  }));
  const { overdue, dueSoon } = bucketTasks(briefTasks, today);

  const { draft, awaiting } = bucketQuotes(quotes ?? []);
  const toBriefQuote = (q: (typeof draft)[number]): BriefQuote => ({
    id: q.id,
    title: q.title,
    total: q.total,
    client: relName(q.clients, 'name'),
  });

  const activeProjects = projects ?? [];

  const overdueInvoices: BriefInvoice[] = (invoices ?? []).map((inv) => ({
    id: inv.id,
    title: inv.title,
    invoice_number: inv.invoice_number,
    total: inv.total,
    due_date: inv.due_date,
    client: relName(inv.clients, 'name'),
  }));

  return {
    today,
    horizonDays: HORIZON_DAYS,
    overdueTasks: overdue,
    dueSoonTasks: dueSoon,
    activeProjectCount: activeProjects.length,
    pipeline: pipelineByStage(activeProjects),
    draftQuotes: draft.map(toBriefQuote),
    awaitingQuotes: awaiting.map(toBriefQuote),
    overdueInvoices,
    newInquiryCount: inquiryCount ?? 0,
  };
}
