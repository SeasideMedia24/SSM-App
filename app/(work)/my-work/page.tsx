// A contractor's home: the projects they're assigned to, each with its tasks
// (theirs are editable: status + a note), plus deliverables and milestones as
// read-only context. Every query here runs through RLS — this page literally
// cannot see anything the permission rules don't allow.

import { createClient } from '@/lib/supabase/server';
import { PageHeader } from '@/components/page-header';
import { MyTaskRow, type MyTask } from '@/components/work/my-task-row';
import { projectStatusMeta } from '@/lib/projects/status';
import { fmtDate } from '@/lib/projects/format';
import type { ProjectStatus, TaskStatus } from '@/types/database.types';

export default async function MyWorkPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // RLS scopes every one of these to the signed-in contractor's world.
  const [{ data: assignments }, { data: projects }, { data: tasks }, { data: deliverables }, { data: milestones }] =
    await Promise.all([
      supabase.from('project_contractors').select('project_id, role'),
      supabase.from('projects').select('id, title, status, description, start_date, due_date').order('due_date', { nullsFirst: false }),
      supabase.from('tasks').select('id, project_id, title, status, priority, due_date, worker_note, assignee_id').order('due_date', { nullsFirst: false }),
      supabase.from('deliverables').select('id, project_id, title, status, due_date').order('due_date', { nullsFirst: false }),
      supabase.from('milestones').select('id, project_id, title, status, date').order('date'),
    ]);

  const roleByProject = new Map((assignments ?? []).map((a) => [a.project_id, a.role]));
  const projectList = projects ?? [];
  const my = (t: { assignee_id: string | null }) => t.assignee_id === user?.id;

  // Standalone tasks assigned directly to me (not tied to one of my projects).
  const standalone = (tasks ?? []).filter((t) => my(t) && !projectList.some((p) => p.id === t.project_id));

  return (
    <>
      <PageHeader title="My Work" description="Your projects and tasks. Flip a status or leave a note as you go." />

      {projectList.length === 0 && standalone.length === 0 && (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white/60 px-6 py-14 text-center">
          <p className="text-sm text-slate-500">Nothing assigned to you yet.</p>
          <p className="mt-1 text-sm text-slate-400">When Seaside Media puts you on a project, it shows up here.</p>
        </div>
      )}

      <div className="space-y-6">
        {standalone.length > 0 && (
          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="mb-3 text-sm font-semibold text-slate-900">Your tasks</h2>
            <ul className="divide-y divide-slate-100 overflow-hidden rounded-xl border border-slate-200">
              {standalone.map((t) => (
                <MyTaskRow key={t.id} task={toMyTask(t, true)} />
              ))}
            </ul>
          </section>
        )}

        {projectList.map((p) => {
          const meta = projectStatusMeta(p.status as ProjectStatus);
          const pTasks = (tasks ?? []).filter((t) => t.project_id === p.id);
          const pDeliv = (deliverables ?? []).filter((d) => d.project_id === p.id);
          const pMiles = (milestones ?? []).filter((m) => m.project_id === p.id);
          const myRole = roleByProject.get(p.id);

          return (
            <section key={p.id} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="mb-1 flex flex-wrap items-center gap-3">
                <h2 className="text-base font-semibold text-ink">{p.title}</h2>
                <span className={`rounded-md px-2 py-0.5 text-xs font-semibold ${meta.pill}`}>{meta.label}</span>
                {myRole && <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] text-slate-600">{myRole}</span>}
                {(fmtDate(p.start_date) || fmtDate(p.due_date)) && (
                  <span className="text-xs text-slate-400">{fmtDate(p.start_date) ?? '—'} → {fmtDate(p.due_date) ?? '—'}</span>
                )}
              </div>
              {p.description && <p className="mb-3 text-sm text-slate-500">{p.description}</p>}

              {pTasks.length > 0 && (
                <div className="mt-3">
                  <p className="mb-1.5 text-xs font-medium uppercase tracking-wide text-slate-400">Tasks</p>
                  <ul className="divide-y divide-slate-100 overflow-hidden rounded-xl border border-slate-200">
                    {pTasks.map((t) => (
                      <MyTaskRow key={t.id} task={toMyTask(t, my(t))} />
                    ))}
                  </ul>
                </div>
              )}

              {(pDeliv.length > 0 || pMiles.length > 0) && (
                <div className="mt-4 grid gap-4 sm:grid-cols-2">
                  {pDeliv.length > 0 && (
                    <div>
                      <p className="mb-1.5 text-xs font-medium uppercase tracking-wide text-slate-400">Deliverables</p>
                      <ul className="space-y-1 text-sm text-slate-600">
                        {pDeliv.map((d) => (
                          <li key={d.id} className={d.status === 'done' ? 'text-slate-400 line-through' : ''}>
                            {d.title}{fmtDate(d.due_date) ? ` · ${fmtDate(d.due_date)}` : ''}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {pMiles.length > 0 && (
                    <div>
                      <p className="mb-1.5 text-xs font-medium uppercase tracking-wide text-slate-400">Milestones</p>
                      <ul className="space-y-1 text-sm text-slate-600">
                        {pMiles.map((m) => (
                          <li key={m.id} className={m.status === 'done' ? 'text-slate-400 line-through' : ''}>
                            {m.title}{fmtDate(m.date) ? ` · ${fmtDate(m.date)}` : ''}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}
            </section>
          );
        })}
      </div>
    </>
  );
}

function toMyTask(
  t: { id: string; title: string; status: TaskStatus; priority: MyTask['priority']; due_date: string | null; worker_note: string | null },
  mine: boolean,
): MyTask {
  return { id: t.id, title: t.title, status: t.status, priority: t.priority, due_date: t.due_date, worker_note: t.worker_note, mine };
}
