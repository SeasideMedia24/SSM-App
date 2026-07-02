'use client';

// Shared add/edit form for a project. Pass an existing project to edit, or leave
// it undefined to create (which also seeds the template — see actions.ts).

import Link from 'next/link';
import { useActionState, useState } from 'react';
import { useFormStatus } from 'react-dom';
import { motion } from 'motion/react';
import { saveProject, type ProjectFormState } from '@/app/(app)/projects/actions';
import { Button } from '@/components/ui/button';
import { PROJECT_STATUSES } from '@/lib/projects/status';
import { PROJECT_TAGS } from '@/lib/projects/tags';
import { PROJECT_TYPES } from '@/lib/projects/template';
import type { Database } from '@/types/database.types';

type Project = Database['public']['Tables']['projects']['Row'];

const PARA_OPTIONS = [
  { value: 'project', label: 'Project' },
  { value: 'area', label: 'Area' },
  { value: 'resource', label: 'Resource' },
  { value: 'archive', label: 'Archive' },
];

const initialState: ProjectFormState = { error: null };
const field =
  'rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-ink outline-none transition-shadow focus:border-teal focus:ring-2 focus:ring-aqua/40';

function SaveButton({ editing }: { editing: boolean }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      {pending ? 'Saving…' : editing ? 'Save changes' : 'Create project'}
    </Button>
  );
}

export function ProjectForm({
  clients,
  project,
}: {
  clients: { id: string; name: string }[];
  project?: Project;
}) {
  const [state, formAction] = useActionState(saveProject, initialState);
  const editing = Boolean(project);

  return (
    <form action={formAction} className="flex max-w-xl flex-col gap-4">
      {project && <input type="hidden" name="id" value={project.id} />}

      <div className="flex flex-col gap-1.5">
        <label htmlFor="title" className="text-sm font-medium text-slate-700">
          Title <span className="text-red-500">*</span>
        </label>
        <input id="title" name="title" required defaultValue={project?.title ?? ''} className={field} />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="client_id" className="text-sm font-medium text-slate-700">
            Client <span className="text-red-500">*</span>
          </label>
          <select id="client_id" name="client_id" required defaultValue={project?.client_id ?? ''} className={field}>
            <option value="" disabled>
              Choose a client…
            </option>
            {clients.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="status" className="text-sm font-medium text-slate-700">
            Status
          </label>
          <select id="status" name="status" defaultValue={project?.status ?? 'idea_inquiry'} className={field}>
            {PROJECT_STATUSES.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="para_category" className="text-sm font-medium text-slate-700">
            PARA category
          </label>
          <select id="para_category" name="para_category" defaultValue={project?.para_category ?? 'project'} className={field}>
            {PARA_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </div>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="start_date" className="text-sm font-medium text-slate-700">
            Start date
          </label>
          <input id="start_date" name="start_date" type="date" defaultValue={project?.start_date ?? ''} className={field} />
        </div>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="due_date" className="text-sm font-medium text-slate-700">
            Due date
          </label>
          <input id="due_date" name="due_date" type="date" defaultValue={project?.due_date ?? ''} className={field} />
        </div>
      </div>

      {!editing && (
        <div className="flex flex-col gap-1.5">
          <label htmlFor="project_type" className="text-sm font-medium text-slate-700">
            Project type <span className="text-slate-400">(seeds the template)</span>
          </label>
          <select id="project_type" name="project_type" defaultValue="brand_film" className={field}>
            {PROJECT_TYPES.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </select>
        </div>
      )}

      <div className="flex flex-col gap-1.5">
        <span className="text-sm font-medium text-slate-700">Tags</span>
        <TagPicker initial={project?.tags ?? []} />
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="description" className="text-sm font-medium text-slate-700">
          Description
        </label>
        <textarea id="description" name="description" rows={4} defaultValue={project?.description ?? ''} className={field} />
      </div>

      {state.error && (
        <motion.p
          initial={{ opacity: 0, y: -4 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700"
          role="alert"
        >
          {state.error}
        </motion.p>
      )}

      <div className="flex items-center gap-3">
        <SaveButton editing={editing} />
        <Link href={project ? `/projects/${project.id}` : '/projects'} className="text-sm text-slate-500 hover:text-slate-700">
          Cancel
        </Link>
      </div>
    </form>
  );
}

// Click-to-stack tag picker. Submits the selected tags as a single hidden
// comma-separated field named "tags" (the server action splits + validates it).
function TagPicker({ initial }: { initial: string[] }) {
  const [selected, setSelected] = useState<string[]>(() => initial.filter((t) => PROJECT_TAGS.includes(t)));

  function toggle(tag: string) {
    setSelected((cur) => (cur.includes(tag) ? cur.filter((t) => t !== tag) : [...cur, tag]));
  }

  return (
    <div>
      <input type="hidden" name="tags" value={selected.join(',')} />
      <div className="flex flex-wrap gap-2">
        {PROJECT_TAGS.map((tag) => {
          const on = selected.includes(tag);
          return (
            <button
              key={tag}
              type="button"
              onClick={() => toggle(tag)}
              aria-pressed={on}
              className={`rounded-full border px-3 py-1 text-sm transition-colors ${
                on
                  ? 'border-teal bg-teal/10 text-sea'
                  : 'border-slate-200 bg-white text-slate-500 hover:border-teal/60 hover:text-slate-700'
              }`}
            >
              {tag}
            </button>
          );
        })}
      </div>
    </div>
  );
}
