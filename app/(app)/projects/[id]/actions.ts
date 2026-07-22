'use server';

// CRUD for the per-project views: Deliverables, Contracts, Expenses,
// Budget lines, and Timeline milestones. All writes go through the server
// Supabase client, so RLS applies. Input is validated here (not just the UI).

import { revalidatePath } from 'next/cache';
import { createClient as createSupabaseServer } from '@/lib/supabase/server';
import { ensureProjectMembership } from '@/lib/projects/assign';
import type { TaskStatus, ContractStatus } from '@/types/database.types';

export type PanelState = { error: string | null; ok?: number };

const TASK_STATUS = ['not_started', 'in_progress', 'done'];
const CONTRACT_STATUS = ['draft', 'sent', 'signed', 'declined'];

// Turn a form value into a number (blank/invalid → 0) or null for optional money.
function num(v: FormDataEntryValue | null): number {
  const n = Number(String(v ?? '').trim());
  return Number.isFinite(n) ? n : 0;
}
function dateOrNull(v: FormDataEntryValue | null): string | null {
  const s = String(v ?? '').trim();
  return s === '' ? null : s;
}
function textOrNull(v: FormDataEntryValue | null): string | null {
  const s = String(v ?? '').trim();
  return s === '' ? null : s;
}
function ok(): PanelState {
  return { error: null, ok: Date.now() };
}

async function db() {
  return createSupabaseServer();
}
function refresh(projectId: string) {
  revalidatePath(`/projects/${projectId}`);
}

// ── Deliverables ─────────────────────────────────────────────────────────────
export async function addDeliverable(projectId: string, _p: PanelState, f: FormData): Promise<PanelState> {
  const title = String(f.get('title') ?? '').trim();
  if (!title) return { error: 'Give the deliverable a name.' };
  const supabase = await db();
  const { error } = await supabase.from('deliverables').insert({
    project_id: projectId,
    title,
    due_date: dateOrNull(f.get('due_date')),
  });
  if (error) return { error: 'Could not add the deliverable.' };
  refresh(projectId);
  return ok();
}
export async function setDeliverableStatus(id: string, projectId: string, status: TaskStatus) {
  if (!TASK_STATUS.includes(status)) return;
  const supabase = await db();
  await supabase.from('deliverables').update({ status }).eq('id', id);
  refresh(projectId);
}
export async function deleteDeliverable(f: FormData) {
  const id = String(f.get('id') ?? '');
  const projectId = String(f.get('project_id') ?? '');
  if (!id) return;
  const supabase = await db();
  await supabase.from('deliverables').delete().eq('id', id);
  refresh(projectId);
}
// Assign a deliverable to a team member; auto-adds them to the project.
export async function setDeliverableAssignee(id: string, projectId: string, assigneeId: string | null) {
  if (!id) return;
  const supabase = await db();
  if (assigneeId !== null) {
    const okMember = await ensureProjectMembership(supabase, projectId, assigneeId);
    if (!okMember) return;
  }
  await supabase.from('deliverables').update({ assignee_id: assigneeId }).eq('id', id);
  refresh(projectId);
  revalidatePath('/my-work');
}

// ── Contracts ────────────────────────────────────────────────────────────────
export async function addContract(projectId: string, _p: PanelState, f: FormData): Promise<PanelState> {
  const title = String(f.get('title') ?? '').trim();
  if (!title) return { error: 'Give the contract a name.' };
  const supabase = await db();
  const { error } = await supabase.from('contracts').insert({
    project_id: projectId,
    title,
    amount: f.get('amount') ? num(f.get('amount')) : null,
    signed_date: dateOrNull(f.get('signed_date')),
    notes: textOrNull(f.get('notes')),
  });
  if (error) return { error: 'Could not add the contract.' };
  refresh(projectId);
  return ok();
}
export async function setContractStatus(id: string, projectId: string, status: ContractStatus) {
  if (!CONTRACT_STATUS.includes(status)) return;
  const supabase = await db();
  await supabase.from('contracts').update({ status }).eq('id', id);
  refresh(projectId);
}
export async function deleteContract(f: FormData) {
  const id = String(f.get('id') ?? '');
  const projectId = String(f.get('project_id') ?? '');
  if (!id) return;
  const supabase = await db();
  await supabase.from('contracts').delete().eq('id', id);
  refresh(projectId);
}

// ── Expenses ─────────────────────────────────────────────────────────────────
export async function addExpense(projectId: string, _p: PanelState, f: FormData): Promise<PanelState> {
  const label = String(f.get('label') ?? '').trim();
  if (!label) return { error: 'Give the expense a label.' };
  const supabase = await db();
  const { error } = await supabase.from('expenses').insert({
    project_id: projectId,
    label,
    category: textOrNull(f.get('category')),
    amount: num(f.get('amount')),
    spent_on: dateOrNull(f.get('spent_on')),
  });
  if (error) return { error: 'Could not add the expense.' };
  refresh(projectId);
  return ok();
}
export async function deleteExpense(f: FormData) {
  const id = String(f.get('id') ?? '');
  const projectId = String(f.get('project_id') ?? '');
  if (!id) return;
  const supabase = await db();
  await supabase.from('expenses').delete().eq('id', id);
  refresh(projectId);
}

// ── Budget lines ─────────────────────────────────────────────────────────────
export async function addBudgetLine(projectId: string, _p: PanelState, f: FormData): Promise<PanelState> {
  const label = String(f.get('label') ?? '').trim();
  if (!label) return { error: 'Give the budget line a label.' };
  const supabase = await db();
  const { error } = await supabase.from('budget_lines').insert({
    project_id: projectId,
    label,
    planned_amount: num(f.get('planned_amount')),
    actual_amount: num(f.get('actual_amount')),
  });
  if (error) return { error: 'Could not add the budget line.' };
  refresh(projectId);
  return ok();
}
export async function updateBudgetLine(id: string, projectId: string, field: 'planned_amount' | 'actual_amount', value: number) {
  const supabase = await db();
  const v = Number.isFinite(value) ? value : 0;
  const patch = field === 'planned_amount' ? { planned_amount: v } : { actual_amount: v };
  await supabase.from('budget_lines').update(patch).eq('id', id);
  refresh(projectId);
}
export async function deleteBudgetLine(f: FormData) {
  const id = String(f.get('id') ?? '');
  const projectId = String(f.get('project_id') ?? '');
  if (!id) return;
  const supabase = await db();
  await supabase.from('budget_lines').delete().eq('id', id);
  refresh(projectId);
}

// ── Milestones (Timeline) ────────────────────────────────────────────────────
export async function addMilestone(projectId: string, _p: PanelState, f: FormData): Promise<PanelState> {
  const title = String(f.get('title') ?? '').trim();
  if (!title) return { error: 'Give the milestone a name.' };
  const supabase = await db();
  const { error } = await supabase.from('milestones').insert({
    project_id: projectId,
    title,
    date: dateOrNull(f.get('date')),
  });
  if (error) return { error: 'Could not add the milestone.' };
  refresh(projectId);
  return ok();
}
export async function setMilestoneStatus(id: string, projectId: string, status: TaskStatus) {
  if (!TASK_STATUS.includes(status)) return;
  const supabase = await db();
  await supabase.from('milestones').update({ status }).eq('id', id);
  refresh(projectId);
}
export async function deleteMilestone(f: FormData) {
  const id = String(f.get('id') ?? '');
  const projectId = String(f.get('project_id') ?? '');
  if (!id) return;
  const supabase = await db();
  await supabase.from('milestones').delete().eq('id', id);
  refresh(projectId);
}
