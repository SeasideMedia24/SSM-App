// Server-safe grouping helper + types for the cross-project grouped views
// (Timeline, Deliverables). Kept out of the 'use client' component so the server
// pages can call it directly.

import type { TaskStatus } from '@/types/database.types';

export type GroupItem = { id: string; title: string; status: TaskStatus; date: string | null };
export type ProjectGroup = { id: string; title: string; items: GroupItem[] };

// Group flat rows (already ordered) into per-project buckets, preserving order
// within each project. Rows without a project are dropped.
export function groupByProject(
  rows: { id: string; title: string; status: TaskStatus; date: string | null; project: { id: string; title: string } | null }[],
): ProjectGroup[] {
  const map = new Map<string, ProjectGroup>();
  for (const r of rows) {
    if (!r.project) continue;
    const g = map.get(r.project.id) ?? { id: r.project.id, title: r.project.title, items: [] };
    g.items.push({ id: r.id, title: r.title, status: r.status, date: r.date });
    map.set(r.project.id, g);
  }
  return [...map.values()].sort((a, b) => a.title.localeCompare(b.title));
}
