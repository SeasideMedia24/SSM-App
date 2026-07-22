// A contractor's home: the projects they're assigned to, each with its tasks
// (theirs are editable: status + a note), plus deliverables and milestones as
// read-only context. Every query here runs through RLS — this page literally
// cannot see anything the permission rules don't allow.

import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { MyTaskRow, type MyTask } from '@/components/work/my-task-row';
import { TaskTimeline } from '@/components/work/task-timeline';
import { BrandLogo } from '@/components/brand-logo';
import { unreadCount } from '@/lib/messages/queries';
import { projectStatusMeta } from '@/lib/projects/status';
import { fmtDate } from '@/lib/projects/format';
import type { ProjectStatus, TaskStatus } from '@/types/database.types';

export default async function MyWorkPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // RLS scopes every one of these to the signed-in contractor's world.
  const [{ data: profile }, { data: assignments }, { data: projects }, { data: tasks }, { data: deliverables }, { data: milestones }, unread] =
    await Promise.all([
      supabase.from('profiles').select('full_name').eq('id', user?.id ?? '').maybeSingle(),
      supabase.from('project_contractors').select('project_id, role'),
      supabase.from('projects').select('id, title, status, description, start_date, due_date').order('due_date', { nullsFirst: false }),
      supabase.from('tasks').select('id, project_id, title, status, priority, due_date, worker_note, assignee_id').order('due_date', { nullsFirst: false }),
      supabase.from('deliverables').select('id, project_id, title, status, due_date, assignee_id').order('due_date', { nullsFirst: false }),
      supabase.from('milestones').select('id, project_id, title, status, date').order('date'),
      unreadCount(supabase),
    ]);

  const roleByProject = new Map((assignments ?? []).map((a) => [a.project_id, a.role]));
  const projectList = projects ?? [];
  const my = (t: { assignee_id: string | null }) => t.assignee_id === user?.id;

  // Standalone tasks assigned directly to me (not tied to one of my projects).
  const standalone = (tasks ?? []).filter((t) => my(t) && !projectList.some((p) => p.id === t.project_id));

  const firstName = profile?.full_name?.split(' ')[0] || 'there';
  const myOpenTasks = (tasks ?? []).filter((t) => my(t) && t.status !== 'done').length;
  const today = new Date().toISOString().slice(0, 10);
  const nextMilestone = (milestones ?? []).filter((m) => m.status !== 'done' && (!m.date || m.date >= today))[0] ?? null;

  return (
    <>
      {/* Home header — the team member's welcome, mirroring the client portal. */}
      <div className="mb-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <BrandLogo size="md" tagline={false} />
        <h1 className="mt-4 text-xl font-semibold text-ink">Welcome back, {firstName}</h1>
        <p className="mt-0.5 text-sm text-slate-500">Your projects, tasks, and messages — all in one place.</p>
        <div className="mt-4 flex flex-wrap gap-3">
          <Stat value={projectList.length} label={projectList.length === 1 ? 'project' : 'projects'} />
          <Stat value={myOpenTasks} label="open tasks" />
          <Link href="/my-messages" className="rounded-xl border border-slate-200 px-4 py-2 transition-colors hover:border-teal">
            <span className="text-lg font-semibold text-ink">{unread}</span>
            <span className="ml-1.5 text-xs text-slate-500">unread {unread === 1 ? 'message' : 'messages'} →</span>
          </Link>
          {nextMilestone && (
            <div className="rounded-xl border border-slate-200 px-4 py-2">
              <span className="text-xs text-slate-400">Next milestone</span>
              <p className="text-sm font-medium text-ink">{nextMilestone.title}{fmtDate(nextMilestone.date) ? ` · ${fmtDate(nextMilestone.date)}` : ''}</p>
            </div>
          )}
        </div>
      </div>

      <div className="mb-6">
        <TaskTimeline tasks={(tasks ?? []).filter((t) => my(t) && t.status !== 'done').map((t) => ({ id: t.id, title: t.title, due_date: t.due_date, priority: t.priority }))} />
      </div>

      {projectList.length === 0 && standalone.length === 0 && (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white/60 px-6 py-14 text-center">
          <p className="text-sm text-slate-500">No projects assigned yet.</p>
          <p className="mt-1 text-sm text-slate-400">
            When Seaside Media puts you on a project, it shows up here. In the meantime, you can{' '}
            <Link href="/my-messages" className="text-sea hover:underline">check messages</Link> or{' '}
            <Link href="/my-profile" className="text-sea hover:underline">update your profile</Link>.
          </p>
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
                            {d.assignee_id === user?.id && <span className="ml-1.5 rounded-full bg-teal/10 px-1.5 py-0.5 text-[10px] font-medium text-sea">yours</span>}
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

function Stat({ value, label }: { value: number; label: string }) {
  return (
    <div className="rounded-xl border border-slate-200 px-4 py-2">
      <span className="text-lg font-semibold text-ink">{value}</span>
      <span className="ml-1.5 text-xs text-slate-500">{label}</span>
    </div>
  );
}

function toMyTask(
  t: { id: string; title: string; status: TaskStatus; priority: MyTask['priority']; due_date: string | null; worker_note: string | null },
  mine: boolean,
): MyTask {
  return { id: t.id, title: t.title, status: t.status, priority: t.priority, due_date: t.due_date, worker_note: t.worker_note, mine };
}
