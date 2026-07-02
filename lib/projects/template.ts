// The "project template" — the default deliverables, milestones, and budget
// lines that autofill a new project (mirrors Notion's default Project Template).
//
// Now type-aware: picking a project type on create seeds a matching set. Edit
// these lists to change what each type of project starts with. (Later these
// become editable in Settings.)

export type ProjectType = 'brand_film' | 'social' | 'event' | 'commercial' | 'retainer';

export const PROJECT_TYPES: { value: ProjectType; label: string }[] = [
  { value: 'brand_film', label: 'Brand Film' },
  { value: 'social', label: 'Social Package' },
  { value: 'event', label: 'Event Coverage' },
  { value: 'commercial', label: 'Commercial' },
  { value: 'retainer', label: 'Retainer' },
];

type Template = { deliverables: string[]; milestones: string[]; budget: string[] };

const TEMPLATES: Record<ProjectType, Template> = {
  brand_film: {
    deliverables: ['Final video', 'Social cutdowns', 'Raw footage', 'Thumbnail'],
    milestones: ['Kickoff', 'Filming day', 'First cut', 'Delivery'],
    budget: ['Production', 'Editing', 'Travel', 'Gear / rentals'],
  },
  social: {
    deliverables: ['Reel 1', 'Reel 2', 'Reel 3', 'Caption pack'],
    milestones: ['Content plan', 'Shoot day', 'Drafts', 'Delivery'],
    budget: ['Production', 'Editing', 'Music / licensing'],
  },
  event: {
    deliverables: ['Highlight film', 'Full-length edit', 'Photo gallery'],
    milestones: ['Pre-event call', 'Event day', 'First cut', 'Delivery'],
    budget: ['Crew', 'Gear / rentals', 'Travel'],
  },
  commercial: {
    deliverables: ['Hero spot', '15s cutdown', '6s bumper', 'Raw footage'],
    milestones: ['Creative / storyboard', 'Pre-production', 'Shoot day', 'Post', 'Delivery'],
    budget: ['Pre-production', 'Production', 'Post-production', 'Talent', 'Gear / rentals'],
  },
  retainer: {
    deliverables: ['Monthly video 1', 'Monthly video 2', 'Social cutdowns'],
    milestones: ['Monthly planning', 'Shoot day', 'Delivery'],
    budget: ['Production', 'Editing'],
  },
};

// Build the rows to insert for a newly-created project of the given type.
export function templateRows(projectId: string, type?: string) {
  const key = (type && type in TEMPLATES ? type : 'brand_film') as ProjectType;
  const tpl = TEMPLATES[key];
  return {
    deliverables: tpl.deliverables.map((title, i) => ({ project_id: projectId, title, position: i })),
    milestones: tpl.milestones.map((title, i) => ({ project_id: projectId, title, position: i })),
    budget_lines: tpl.budget.map((label, i) => ({ project_id: projectId, label, position: i })),
  };
}
