'use client';

// "New task" form on My Tasks. A task can be pointed at a project, a client,
// both, or neither. Collapsed behind a button so the page stays clean.

import { useActionState, useState } from 'react';
import { useFormStatus } from 'react-dom';
import { createTask, type TaskFormState } from '@/app/(app)/tasks/actions';
import { Button } from '@/components/ui/button';
import { TASK_PRIORITIES, TASK_STATUSES } from '@/lib/projects/status';

type Option = { id: string; label: string };

const initialState: TaskFormState = { error: null };

const field =
  'rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-ink outline-none transition-shadow focus:border-teal focus:ring-2 focus:ring-aqua/40';

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      {pending ? 'Adding…' : 'Add task'}
    </Button>
  );
}

export function NewTaskForm({ projects, clients }: { projects: Option[]; clients: Option[] }) {
  const [open, setOpen] = useState(false);
  const [state, formAction] = useActionState(createTask, initialState);

  if (!open) {
    return (
      <div className="mb-5">
        <Button type="button" onClick={() => setOpen(true)}>
          + New task
        </Button>
      </div>
    );
  }

  return (
    <form
      // Remount on a successful add (ok changes) so the fields clear without a
      // state-setting effect. Stays open so you can add several in a row.
      key={state.ok ?? 'new'}
      action={formAction}
      className="mb-5 flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
    >
      <input name="title" required placeholder="What needs doing?" className={field} autoFocus />

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <label className="flex flex-col gap-1 text-xs font-medium text-slate-500">
          Project
          <select name="project_id" defaultValue="" className={field}>
            <option value="">— none —</option>
            {projects.map((p) => (
              <option key={p.id} value={p.id}>
                {p.label}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-xs font-medium text-slate-500">
          Client
          <select name="client_id" defaultValue="" className={field}>
            <option value="">— none —</option>
            {clients.map((c) => (
              <option key={c.id} value={c.id}>
                {c.label}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <label className="flex flex-col gap-1 text-xs font-medium text-slate-500">
          Priority
          <select name="priority" defaultValue="medium" className={field}>
            {TASK_PRIORITIES.map((p) => (
              <option key={p.value} value={p.value}>
                {p.label}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-xs font-medium text-slate-500">
          Status
          <select name="status" defaultValue="not_started" className={field}>
            {TASK_STATUSES.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-xs font-medium text-slate-500">
          Due date
          <input type="date" name="due_date" className={field} />
        </label>
      </div>

      {state.error && (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700" role="alert">
          {state.error}
        </p>
      )}

      <div className="flex items-center gap-3">
        <SubmitButton />
        <button type="button" onClick={() => setOpen(false)} className="text-sm text-slate-500 hover:text-slate-700">
          Cancel
        </button>
      </div>
    </form>
  );
}
