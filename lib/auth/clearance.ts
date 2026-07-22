// Team clearance levels — the single place their meaning is written down.
// A person has a default level (contractors.clearance); each project assignment
// can override it (project_contractors.clearance). Effective level on a project
// = override ?? default. The database mirrors this in public.my_clearance(pid),
// which the RLS policies use — keep the two in sync if levels ever change.

export type Clearance = 1 | 2 | 3;

export const CLEARANCE_LEVELS: { value: Clearance; label: string; blurb: string }[] = [
  { value: 1, label: 'Level 1 · View', blurb: 'Sees their projects, tasks, and messages. Can update their own tasks.' },
  { value: 2, label: 'Level 2 · Edit', blurb: 'Also creates and updates tasks, deliverables, and milestones on their projects.' },
  { value: 3, label: 'Level 3 · Full', blurb: 'Also sees and updates that project’s contracts and invoices.' },
];

const map = new Map(CLEARANCE_LEVELS.map((l) => [l.value, l]));
export const clearanceMeta = (v: number | null | undefined): (typeof CLEARANCE_LEVELS)[number] =>
  map.get((v ?? 1) as Clearance) ?? CLEARANCE_LEVELS[0];

// Effective level for an assignment row.
export const effectiveClearance = (personDefault: number | null | undefined, override: number | null | undefined): Clearance =>
  ((override ?? personDefault ?? 1) as Clearance);
