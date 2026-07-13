'use client';

// One task row on a contractor's My Work page. Tasks assigned to THEM get a
// status select and a small note field; other tasks on the project are
// read-only context (RLS enforces that server-side regardless).

import { useActionState, useState, useTransition } from 'react';
import { useFormStatus } from 'react-dom';
import { setMyTaskStatus, saveMyTaskNote, type NoteState } from '@/app/(work)/my-work/actions';
import { TASK_STATUSES, taskPriorityMeta } from '@/lib/projects/status';
import { fmtDate } from '@/lib/projects/format';
import type { TaskStatus, TaskPriority } from '@/types/database.types';

export type MyTask = {
  id: string;
  title: string;
  status: TaskStatus;
  priority: TaskPriority;
  due_date: string | null;
  worker_note: string | null;
  mine: boolean; // assigned to the signed-in contractor
};

function SaveNoteButton() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} className="rounded-lg bg-slate-900 px-2.5 py-1 text-xs font-medium text-white hover:bg-slate-700 disabled:opacity-60">
      {pending ? 'Saving…' : 'Save note'}
    </button>
  );
}

export function MyTaskRow({ task }: { task: MyTask }) {
  const [pending, start] = useTransition();
  const [noteOpen, setNoteOpen] = useState(false);
  const [noteState, noteAction] = useActionState<NoteState, FormData>(saveMyTaskNote, { ok: false, error: null });
  const prio = taskPriorityMeta(task.priority);
  const due = fmtDate(task.due_date);

  return (
    <li className="px-3 py-2.5">
      <div className="flex items-center gap-3">
        {task.mine ? (
          <select
            value={task.status}
            disabled={pending}
            onChange={(e) => start(() => setMyTaskStatus(task.id, e.target.value as TaskStatus))}
            className="rounded-md border border-slate-200 bg-white px-1.5 py-1 text-xs text-slate-600 outline-none focus:border-teal"
            aria-label="Task status"
          >
            {TASK_STATUSES.map((s) => (
              <option key={s.value} value={s.value}>{s.label}</option>
            ))}
          </select>
        ) : (
          <span className="rounded-md bg-slate-100 px-2 py-1 text-xs text-slate-500">
            {TASK_STATUSES.find((s) => s.value === task.status)?.label ?? task.status}
          </span>
        )}

        <span className={`flex-1 text-sm ${task.status === 'done' ? 'text-slate-400 line-through' : 'text-ink'}`}>
          {task.title}
          {task.mine && <span className="ml-2 rounded-full bg-teal/10 px-1.5 py-0.5 text-[10px] font-medium text-sea">yours</span>}
        </span>

        <span className={`rounded-full px-2 py-0.5 text-[11px] ${prio.pill}`}>{prio.label}</span>
        {due && <span className="text-[11px] text-slate-400">{due}</span>}
        {task.mine && (
          <button type="button" onClick={() => setNoteOpen((o) => !o)} className="text-xs font-medium text-sea hover:underline">
            {task.worker_note ? 'Edit note' : 'Add note'}
          </button>
        )}
      </div>

      {task.worker_note && !noteOpen && (
        <p className="mt-1 pl-1 text-xs text-slate-500">📝 {task.worker_note}</p>
      )}

      {task.mine && noteOpen && (
        <form action={noteAction} className="mt-2 flex flex-wrap items-start gap-2">
          <input type="hidden" name="task_id" value={task.id} />
          <textarea
            name="note"
            rows={2}
            defaultValue={task.worker_note ?? ''}
            placeholder="e.g. Footage uploaded to the drive — two takes flagged."
            className="min-w-[240px] flex-1 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-teal"
          />
          <div className="flex flex-col gap-1">
            <SaveNoteButton />
            <button type="button" onClick={() => setNoteOpen(false)} className="text-xs text-slate-400 hover:text-slate-600">
              Close
            </button>
          </div>
          {noteState.error && <p className="w-full text-xs text-red-600">{noteState.error}</p>}
        </form>
      )}
    </li>
  );
}
