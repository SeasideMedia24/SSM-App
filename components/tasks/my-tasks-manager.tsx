'use client';

// The My Tasks manager — everything assigned to the owner, as a working list:
// filter by status / project / archived, change status inline, archive (hide
// without deleting) or restore, and delete (two-step confirm — CLAUDE.md #4).
// All mutations go through the shared task server actions, which revalidate
// /my-tasks so the list re-renders with fresh data.

import { useMemo, useState, useTransition } from 'react';
import Link from 'next/link';
import { setTaskStatus, setTaskArchived, deleteTask } from '@/app/(app)/tasks/actions';
import { CollapsibleTaskSection } from './collapsible-section';
import { TASK_STATUSES, taskPriorityMeta } from '@/lib/projects/status';
import type { TaskStatus, TaskPriority } from '@/types/database.types';

export type ManagerTask = {
  id: string;
  title: string;
  status: TaskStatus;
  priority: TaskPriority;
  due_date: string | null;
  archived: boolean;
  project: { id: string; title: string } | null;
  client: { id: string; name: string } | null;
};

export type ProjectRef = { id: string; title: string };

function fmtDue(date: string | null) {
  return date ? new Date(date + 'T00:00:00').toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) : null;
}

const selectCls =
  'rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-sm text-slate-700 outline-none focus:border-teal';

export function MyTasksManager({ tasks, projects }: { tasks: ManagerTask[]; projects: ProjectRef[] }) {
  const [statusFilter, setStatusFilter] = useState<'all' | TaskStatus>('all');
  const [projectFilter, setProjectFilter] = useState<'all' | 'none' | string>('all');
  const [showArchived, setShowArchived] = useState(false);

  const filtered = useMemo(
    () =>
      tasks.filter((t) => {
        if (!showArchived && t.archived) return false;
        if (statusFilter !== 'all' && t.status !== statusFilter) return false;
        if (projectFilter === 'none' && t.project) return false;
        if (projectFilter !== 'all' && projectFilter !== 'none' && t.project?.id !== projectFilter) return false;
        return true;
      }),
    [tasks, statusFilter, projectFilter, showArchived],
  );

  if (tasks.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-slate-300 bg-white/60 px-6 py-14 text-center">
        <p className="text-sm text-slate-500">No tasks yet. Add one above.</p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as 'all' | TaskStatus)}
          className={selectCls}
          aria-label="Filter by status"
        >
          <option value="all">All statuses</option>
          {TASK_STATUSES.map((s) => (
            <option key={s.value} value={s.value}>{s.label}</option>
          ))}
        </select>
        <select
          value={projectFilter}
          onChange={(e) => setProjectFilter(e.target.value)}
          className={selectCls}
          aria-label="Filter by project"
        >
          <option value="all">All projects</option>
          <option value="none">No project</option>
          {projects.map((p) => (
            <option key={p.id} value={p.id}>{p.title}</option>
          ))}
        </select>
        <label className="flex cursor-pointer items-center gap-2 text-sm text-slate-600">
          <input
            type="checkbox"
            checked={showArchived}
            onChange={(e) => setShowArchived(e.target.checked)}
            className="h-4 w-4 accent-teal"
          />
          Show archived
        </label>
        <span className="ml-auto text-xs text-slate-400">
          {filtered.length} task{filtered.length === 1 ? '' : 's'}
        </span>
      </div>

      {filtered.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white/60 px-6 py-10 text-center">
          <p className="text-sm text-slate-500">No tasks match these filters.</p>
        </div>
      ) : (
        TASK_STATUSES.map((col) => {
          const items = filtered.filter((t) => t.status === col.value);
          if (items.length === 0) return null;
          return (
            <CollapsibleTaskSection
              key={col.value}
              label={col.label}
              pill={col.pill}
              count={items.length}
              defaultOpen={col.value !== 'done'}
            >
              <ul className="divide-y divide-slate-100 overflow-hidden rounded-xl border border-slate-200 bg-white">
                {items.map((t) => (
                  <TaskRow key={t.id} task={t} />
                ))}
              </ul>
            </CollapsibleTaskSection>
          );
        })
      )}
    </div>
  );
}

function TaskRow({ task }: { task: ManagerTask }) {
  const [pending, start] = useTransition();
  const [confirming, setConfirming] = useState(false);
  const prio = taskPriorityMeta(task.priority);
  const due = fmtDue(task.due_date);

  return (
    <li className={`flex flex-wrap items-center gap-3 px-4 py-2.5 ${task.archived ? 'bg-slate-50/70' : ''}`}>
      <select
        value={task.status}
        disabled={pending}
        onChange={(e) => start(() => setTaskStatus(task.id, task.project?.id ?? '', e.target.value as TaskStatus))}
        className="rounded-md border border-slate-200 bg-white px-1.5 py-1 text-xs text-slate-600 outline-none focus:border-teal disabled:opacity-60"
        aria-label="Task status"
      >
        {TASK_STATUSES.map((s) => (
          <option key={s.value} value={s.value}>{s.label}</option>
        ))}
      </select>

      <span className={`text-sm ${task.status === 'done' ? 'text-slate-400 line-through' : 'text-ink'}`}>
        {task.title}
      </span>

      {task.archived && (
        <span className="rounded-full bg-slate-200 px-2 py-0.5 text-[10px] font-medium text-slate-500">Archived</span>
      )}

      {task.project ? (
        <Link href={`/projects/${task.project.id}?view=tasks`} className="text-xs text-slate-500 hover:text-sea hover:underline">
          {task.project.title}
        </Link>
      ) : task.client ? (
        <Link href={`/clients/${task.client.id}`} className="text-xs text-slate-500 hover:text-sea hover:underline">
          {task.client.name}
        </Link>
      ) : null}

      <span className={`ml-auto rounded-full px-2 py-0.5 text-[11px] ${prio.pill}`}>{prio.label}</span>
      {due && <span className="text-[11px] text-slate-400">{due}</span>}

      <button
        type="button"
        disabled={pending}
        onClick={() => start(() => setTaskArchived(task.id, !task.archived))}
        className="text-xs font-medium text-slate-400 hover:text-sea disabled:opacity-60"
      >
        {task.archived ? 'Restore' : 'Archive'}
      </button>

      {confirming ? (
        <span className="inline-flex items-center gap-2">
          <button
            type="button"
            disabled={pending}
            onClick={() =>
              start(async () => {
                const fd = new FormData();
                fd.set('id', task.id);
                if (task.project) fd.set('project_id', task.project.id);
                await deleteTask(fd);
              })
            }
            className="rounded-lg bg-red-600 px-2 py-1 text-xs font-medium text-white hover:bg-red-500 disabled:opacity-60"
          >
            Yes, delete
          </button>
          <button type="button" onClick={() => setConfirming(false)} className="text-xs text-slate-500 hover:text-slate-700">
            Cancel
          </button>
        </span>
      ) : (
        <button type="button" onClick={() => setConfirming(true)} className="text-xs font-medium text-slate-400 hover:text-red-600">
          Delete
        </button>
      )}
    </li>
  );
}
