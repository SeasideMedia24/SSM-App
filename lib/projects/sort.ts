// Ordering for projects on the board and list: priority first (High → Low),
// then the closest due date (undated projects sink to the bottom).

import type { TaskPriority } from '@/types/database.types';

const PRIORITY_RANK: Record<TaskPriority, number> = { high: 0, medium: 1, low: 2 };

export type Sortable = { priority: TaskPriority; due_date: string | null };

export function compareProjects(a: Sortable, b: Sortable): number {
  const p = PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority];
  if (p !== 0) return p;
  if (a.due_date && b.due_date) return a.due_date.localeCompare(b.due_date);
  if (a.due_date) return -1;
  if (b.due_date) return 1;
  return 0;
}
