'use client';

// Tasks for a project, grouped by status (Not started / In progress / Done).
// Add a task, change its status inline, or delete it (with a confirm step).

import { useActionState, useEffect, useRef, useState, useTransition } from 'react';
import { useFormStatus } from 'react-dom';
import { addTask, setTaskStatus, deleteTask, setTaskAssignee, type TaskFormState } from '@/app/(app)/tasks/actions';
import { TASK_STATUSES, TASK_PRIORITIES, taskPriorityMeta } from '@/lib/projects/status';
import { Button } from '@/components/ui/button';
import { useUndo } from '@/components/undo/undo-provider';
import type { Database, TaskStatus } from '@/types/database.types';

type TaskItem = Pick<
  Database['public']['Tables']['tasks']['Row'],
  'id' | 'title' | 'status' | 'priority' | 'due_date' | 'assignee_id' | 'worker_note'
>;

// Team members who can be assigned tasks (contractors with a login), passed
// down from the project page. id = their auth user id.
export type AssigneeOption = { id: string; name: string };

const inputCls =
  'rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-teal';

export function TasksPanel({
  projectId,
  tasks,
  assignees = [],
}: {
  projectId: string;
  tasks: TaskItem[];
  assignees?: AssigneeOption[];
}) {
  return (
    <div className="space-y-6">
      <AddTaskForm projectId={projectId} />
      <div className="space-y-5">
        {TASK_STATUSES.map((col) => {
          const items = tasks.filter((t) => t.status === col.value);
          return (
            <div key={col.value}>
              <div className="mb-2 flex items-center gap-2">
                <span className={`rounded-md px-2 py-0.5 text-xs font-semibold ${col.pill}`}>{col.label}</span>
                <span className="text-xs text-slate-400">{items.length}</span>
              </div>
              {items.length === 0 ? (
                <p className="px-1 text-sm text-slate-400">No tasks here.</p>
              ) : (
                <ul className="divide-y divide-slate-100 overflow-hidden rounded-xl border border-slate-200 bg-white">
                  {items.map((t) => (
                    <TaskRow key={t.id} task={t} projectId={projectId} assignees={assignees} />
                  ))}
                </ul>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function AddButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" size="sm" disabled={pending}>
      {pending ? 'Adding…' : 'Add task'}
    </Button>
  );
}

function AddTaskForm({ projectId }: { projectId: string }) {
  const bound = addTask.bind(null, projectId);
  const [state, action] = useActionState<TaskFormState, FormData>(bound, { error: null });
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state.ok) formRef.current?.reset();
  }, [state.ok]);

  return (
    <form ref={formRef} action={action} className="flex flex-wrap items-end gap-2 rounded-xl border border-slate-200 bg-white p-3">
      <input name="title" required placeholder="Add a task…" className={`min-w-[200px] flex-1 ${inputCls}`} />
      <select name="priority" defaultValue="medium" className={inputCls}>
        {TASK_PRIORITIES.map((p) => (
          <option key={p.value} value={p.value}>
            {p.label}
          </option>
        ))}
      </select>
      <input name="due_date" type="date" className={inputCls} />
      <AddButton />
      {state.error && <p className="w-full text-sm text-red-600">{state.error}</p>}
    </form>
  );
}

function TaskRow({ task, projectId, assignees }: { task: TaskItem; projectId: string; assignees: AssigneeOption[] }) {
  const [pending, start] = useTransition();
  const [confirming, setConfirming] = useState(false);
  const undo = useUndo();
  const prio = taskPriorityMeta(task.priority);
  const due = task.due_date
    ? new Date(task.due_date + 'T00:00:00').toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
    : null;
  // Show the picker when there's anyone to assign, or an assignment to display.
  const showAssignee = assignees.length > 0 || task.assignee_id != null;

  function changeStatus(next: TaskStatus) {
    const prev = task.status;
    start(() => setTaskStatus(task.id, projectId, next));
    undo.register({
      label: `Marked “${task.title}” ${TASK_STATUSES.find((s) => s.value === next)?.label ?? next}`,
      undo: () => setTaskStatus(task.id, projectId, prev),
    });
  }

  return (
    <li className="px-3 py-2.5">
      <div className="flex items-center gap-3">
        <select
          value={task.status}
          disabled={pending}
          onChange={(e) => changeStatus(e.target.value as TaskStatus)}
          className="rounded-md border border-slate-200 bg-white px-1.5 py-1 text-xs text-slate-600 outline-none focus:border-teal"
          aria-label="Task status"
        >
          {TASK_STATUSES.map((s) => (
            <option key={s.value} value={s.value}>
              {s.label}
            </option>
          ))}
        </select>

        <span className={`flex-1 text-sm ${task.status === 'done' ? 'text-slate-400 line-through' : 'text-ink'}`}>
          {task.title}
        </span>

        {/* Who's on it — team members with logins (Slice B1). */}
        {showAssignee && (
          <select
            value={task.assignee_id ?? ''}
            disabled={pending}
            onChange={(e) => start(() => setTaskAssignee(task.id, projectId, e.target.value || null))}
            className="max-w-32 rounded-md border border-slate-200 bg-white px-1.5 py-1 text-xs text-slate-500 outline-none focus:border-teal"
            aria-label="Assignee"
          >
            <option value="">Unassigned</option>
            {assignees.map((a) => (
              <option key={a.id} value={a.id}>{a.name}</option>
            ))}
            {/* Keep a stale assignment visible even if that person lost their login. */}
            {task.assignee_id && !assignees.some((a) => a.id === task.assignee_id) && (
              <option value={task.assignee_id}>Assigned</option>
            )}
          </select>
        )}

        <span className={`rounded-full px-2 py-0.5 text-[11px] ${prio.pill}`}>{prio.label}</span>
        {due && <span className="text-[11px] text-slate-400">{due}</span>}

        {!confirming ? (
          <button
            type="button"
            onClick={() => setConfirming(true)}
            className="text-sm text-slate-400 transition-colors hover:text-red-600"
          >
            Delete
          </button>
        ) : (
          <form action={deleteTask} className="flex items-center gap-2">
            <input type="hidden" name="id" value={task.id} />
            <input type="hidden" name="project_id" value={projectId} />
            <button type="submit" className="text-sm font-medium text-red-600">
              Confirm
            </button>
            <button type="button" onClick={() => setConfirming(false)} className="text-sm text-slate-400">
              Cancel
            </button>
          </form>
        )}
      </div>

      {/* A note the assignee left from their My Work view. */}
      {task.worker_note && (
        <p className="mt-1 pl-1 text-xs text-slate-500">📝 {task.worker_note}</p>
      )}
    </li>
  );
}
