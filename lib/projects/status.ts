// Single source of truth for project/task status labels and colors.
// Colors mirror the owner's Notion board. To rename a status or recolor a
// column, edit it here and the board, badges, and filters all update.
//
// (Tailwind classes are written out in full so the compiler keeps them.)

import type { ProjectStatus, TaskStatus, TaskPriority, ClientType, ContractStatus, QuoteStatus } from '@/types/database.types';

export type StatusMeta<T extends string> = {
  value: T;
  label: string;
  pill: string; // chip: background + text
  bar: string; // solid accent (card left border / column bar)
  soft: string; // very light column background tint
};

// Order matters — this is the left-to-right column order on the board.
export const PROJECT_STATUSES: StatusMeta<ProjectStatus>[] = [
  { value: 'idea_inquiry', label: 'Idea / Inquiry', pill: 'bg-blue-100 text-blue-700', bar: 'bg-blue-400', soft: 'bg-blue-50/60' },
  { value: 'scripting_planning', label: 'Scripting / Planning', pill: 'bg-purple-100 text-purple-700', bar: 'bg-purple-400', soft: 'bg-purple-50/60' },
  { value: 'filming', label: 'Filming', pill: 'bg-pink-100 text-pink-700', bar: 'bg-pink-400', soft: 'bg-pink-50/60' },
  { value: 'editing', label: 'Editing', pill: 'bg-red-100 text-red-700', bar: 'bg-red-400', soft: 'bg-red-50/60' },
  { value: 'review_revision', label: 'Review / Revision', pill: 'bg-[#e7dccf] text-[#795c3f]', bar: 'bg-[#b08a5f]', soft: 'bg-[#f5efe7]/70' },
  { value: 'scheduled', label: 'Scheduled', pill: 'bg-orange-100 text-orange-700', bar: 'bg-orange-400', soft: 'bg-orange-50/60' },
  { value: 'archived', label: 'Archived', pill: 'bg-yellow-100 text-yellow-800', bar: 'bg-yellow-400', soft: 'bg-yellow-50/60' },
];

export const TASK_STATUSES: StatusMeta<TaskStatus>[] = [
  { value: 'not_started', label: 'Not started', pill: 'bg-slate-100 text-slate-600', bar: 'bg-slate-300', soft: 'bg-slate-50' },
  { value: 'in_progress', label: 'In progress', pill: 'bg-blue-100 text-blue-700', bar: 'bg-blue-400', soft: 'bg-blue-50/60' },
  { value: 'done', label: 'Done', pill: 'bg-green-100 text-green-700', bar: 'bg-green-400', soft: 'bg-green-50/60' },
];

export const TASK_PRIORITIES: { value: TaskPriority; label: string; pill: string }[] = [
  { value: 'low', label: 'Low', pill: 'bg-slate-100 text-slate-600' },
  { value: 'medium', label: 'Medium', pill: 'bg-sky-100 text-sky-700' },
  { value: 'high', label: 'High', pill: 'bg-rose-100 text-rose-700' },
];

export const CONTRACT_STATUSES: { value: ContractStatus; label: string; pill: string }[] = [
  { value: 'draft', label: 'Draft', pill: 'bg-slate-100 text-slate-600' },
  { value: 'sent', label: 'Sent', pill: 'bg-blue-100 text-blue-700' },
  { value: 'signed', label: 'Signed', pill: 'bg-green-100 text-green-700' },
  { value: 'declined', label: 'Declined', pill: 'bg-red-100 text-red-700' },
];

export const QUOTE_STATUSES: { value: QuoteStatus; label: string; pill: string }[] = [
  { value: 'draft', label: 'Draft', pill: 'bg-slate-100 text-slate-600' },
  { value: 'sent', label: 'Sent', pill: 'bg-blue-100 text-blue-700' },
  { value: 'accepted', label: 'Accepted', pill: 'bg-green-100 text-green-700' },
  { value: 'declined', label: 'Declined', pill: 'bg-red-100 text-red-700' },
];

export const CLIENT_TYPES: { value: ClientType; label: string; pill: string }[] = [
  { value: 'recurring', label: 'Recurring', pill: 'bg-green-100 text-green-700' },
  { value: 'one_time', label: 'One-time', pill: 'bg-slate-100 text-slate-600' },
  { value: 'campaign', label: 'Campaign', pill: 'bg-purple-100 text-purple-700' },
];

// Lookup helpers -------------------------------------------------------------
const projectMap = new Map(PROJECT_STATUSES.map((s) => [s.value, s]));
const taskMap = new Map(TASK_STATUSES.map((s) => [s.value, s]));
const priorityMap = new Map(TASK_PRIORITIES.map((s) => [s.value, s]));
const clientTypeMap = new Map(CLIENT_TYPES.map((s) => [s.value, s]));
const contractMap = new Map(CONTRACT_STATUSES.map((s) => [s.value, s]));
const quoteMap = new Map(QUOTE_STATUSES.map((s) => [s.value, s]));

export const projectStatusMeta = (v: ProjectStatus) => projectMap.get(v)!;
export const taskStatusMeta = (v: TaskStatus) => taskMap.get(v)!;
export const taskPriorityMeta = (v: TaskPriority) => priorityMap.get(v)!;
export const clientTypeMeta = (v: ClientType) => clientTypeMap.get(v)!;
export const contractStatusMeta = (v: ContractStatus) => contractMap.get(v)!;
export const quoteStatusMeta = (v: QuoteStatus) => quoteMap.get(v)!;
