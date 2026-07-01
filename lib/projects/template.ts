// The "project template" — the default deliverables, milestones, and budget
// lines that autofill every new project (mirrors Notion's default Project
// Template). Edit these lists to change what a fresh project starts with.
//
// (In a later phase these become editable in Settings.)

export const TEMPLATE_DELIVERABLES: { title: string }[] = [
  { title: 'Final video' },
  { title: 'Social cutdowns' },
  { title: 'Raw footage' },
  { title: 'Thumbnail' },
];

export const TEMPLATE_MILESTONES: { title: string }[] = [
  { title: 'Kickoff' },
  { title: 'Filming day' },
  { title: 'First cut' },
  { title: 'Delivery' },
];

export const TEMPLATE_BUDGET_LINES: { label: string }[] = [
  { label: 'Production' },
  { label: 'Editing' },
  { label: 'Travel' },
  { label: 'Gear / rentals' },
];

// Build the rows to insert for a newly-created project.
export function templateRows(projectId: string) {
  return {
    deliverables: TEMPLATE_DELIVERABLES.map((d, i) => ({
      project_id: projectId,
      title: d.title,
      position: i,
    })),
    milestones: TEMPLATE_MILESTONES.map((m, i) => ({
      project_id: projectId,
      title: m.title,
      position: i,
    })),
    budget_lines: TEMPLATE_BUDGET_LINES.map((b, i) => ({
      project_id: projectId,
      label: b.label,
      position: i,
    })),
  };
}
