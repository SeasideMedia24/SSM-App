// The "project template" — the default milestones and budget lines that
// autofill a new project. Type-aware: picking a project type on create seeds a
// matching set. Edit these to change what each type starts with.
// (Later these become editable in Settings.)
//
// Deliverables are deliberately NOT templated: the owner enters the real ones
// while quoting (calculator → Deliverables), and those sync onto the project and
// autofill the contract. Seeding guesses here would pollute that list.

export type ProjectType =
  | 'campaign'
  | 'photography'
  | 'brand_film'
  | 'teaching_course'
  | 'promotional_bumper'
  | 'advertisement'
  | 'commercial';

export const PROJECT_TYPES: { value: ProjectType; label: string }[] = [
  { value: 'campaign', label: 'Campaign' },
  { value: 'photography', label: 'Photography' },
  { value: 'brand_film', label: 'Brand Film' },
  { value: 'teaching_course', label: 'Teaching / Course' },
  { value: 'promotional_bumper', label: 'Promotional Bumper' },
  { value: 'advertisement', label: 'Advertisement' },
  { value: 'commercial', label: 'Commercial' },
];

const projectTypeMap = new Map(PROJECT_TYPES.map((t) => [t.value, t]));
export const projectTypeLabel = (v: string | null | undefined) =>
  (v && projectTypeMap.get(v as ProjectType)?.label) || null;

type Template = { milestones: string[]; budget: string[] };

const TEMPLATES: Record<ProjectType, Template> = {
  campaign: {
    milestones: ['Strategy', 'Shoot day', 'First cut', 'Launch'],
    budget: ['Production', 'Editing', 'Paid media', 'Gear / rentals'],
  },
  photography: {
    milestones: ['Pre-shoot call', 'Shoot day', 'Culling', 'Delivery'],
    budget: ['Shoot', 'Editing / retouch', 'Travel'],
  },
  brand_film: {
    milestones: ['Kickoff', 'Filming day', 'First cut', 'Delivery'],
    budget: ['Production', 'Editing', 'Travel', 'Gear / rentals'],
  },
  teaching_course: {
    milestones: ['Outline', 'Record day', 'Edit', 'Publish'],
    budget: ['Production', 'Editing', 'Platform / hosting'],
  },
  promotional_bumper: {
    milestones: ['Concept', 'Shoot / assets', 'Delivery'],
    budget: ['Production', 'Editing', 'Music / licensing'],
  },
  advertisement: {
    milestones: ['Creative', 'Pre-production', 'Shoot day', 'Delivery'],
    budget: ['Pre-production', 'Production', 'Post', 'Talent'],
  },
  commercial: {
    milestones: ['Creative / storyboard', 'Pre-production', 'Shoot day', 'Post', 'Delivery'],
    budget: ['Pre-production', 'Production', 'Post-production', 'Talent', 'Gear / rentals'],
  },
};

// Build the rows to insert for a newly-created project of the given type.
// No deliverables — those come from the quote (see note at the top of this file).
export function templateRows(projectId: string, type?: string) {
  const key = (type && type in TEMPLATES ? type : 'brand_film') as ProjectType;
  const tpl = TEMPLATES[key];
  return {
    milestones: tpl.milestones.map((title, i) => ({ project_id: projectId, title, position: i })),
    budget_lines: tpl.budget.map((label, i) => ({ project_id: projectId, label, position: i })),
  };
}
