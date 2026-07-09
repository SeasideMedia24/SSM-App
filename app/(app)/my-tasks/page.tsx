import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { PageHeader } from '@/components/page-header';
import { CollapsibleTaskSection } from '@/components/tasks/collapsible-section';
import { NewTaskForm } from '@/components/tasks/new-task-form';
import { TASK_STATUSES, taskPriorityMeta } from '@/lib/projects/status';
import type { TaskStatus, TaskPriority } from '@/types/database.types';

type Rel = { id: string; title?: string; name?: string } | { id: string; title?: string; name?: string }[] | null;
function one(p: Rel): { id: string; title?: string; name?: string } | null {
  if (!p) return null;
  return Array.isArray(p) ? (p[0] ?? null) : p;
}
function fmtDue(date: string | null) {
  return date ? new Date(date + 'T00:00:00').toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) : null;
}

export default async function MyTasksPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Tasks assigned to me, plus the projects and clients that back the "new task"
  // form's pickers.
  const [{ data: tasks }, { data: projects }, { data: clients }] = await Promise.all([
    supabase
      .from('tasks')
      .select('id, title, status, priority, due_date, projects(id, title), clients(id, name)')
      .eq('assignee_id', user?.id ?? '')
      .order('due_date', { ascending: true, nullsFirst: false }),
    supabase.from('projects').select('id, title').neq('status', 'archived').order('title'),
    supabase.from('clients').select('id, name').order('name'),
  ]);

  const list = tasks ?? [];
  const projectOptions = (projects ?? []).map((p) => ({ id: p.id, label: p.title }));
  const clientOptions = (clients ?? []).map((c) => ({ id: c.id, label: c.name }));

  return (
    <>
      <PageHeader title="My Tasks" description="Everything assigned to you — attach a task to a project, a client, or neither." />

      <NewTaskForm projects={projectOptions} clients={clientOptions} />

      {list.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white/60 px-6 py-14 text-center">
          <p className="text-sm text-slate-500">No tasks yet. Add one above.</p>
        </div>
      ) : (
        <div className="space-y-5">
          {TASK_STATUSES.map((col) => {
            const items = list.filter((t) => (t.status as TaskStatus) === col.value);
            if (items.length === 0) return null;
            return (
              // "Done" starts folded so finished work stays out of the way.
              <CollapsibleTaskSection
                key={col.value}
                label={col.label}
                pill={col.pill}
                count={items.length}
                defaultOpen={col.value !== 'done'}
              >
                <ul className="divide-y divide-slate-100 overflow-hidden rounded-xl border border-slate-200 bg-white">
                  {items.map((t) => {
                    const proj = one(t.projects as Rel);
                    const client = one(t.clients as Rel);
                    const prio = taskPriorityMeta(t.priority as TaskPriority);
                    const due = fmtDue(t.due_date);
                    return (
                      <li key={t.id} className="flex items-center gap-3 px-4 py-2.5">
                        <span className={`text-sm ${t.status === 'done' ? 'text-slate-400 line-through' : 'text-ink'}`}>
                          {t.title}
                        </span>
                        {proj ? (
                          <Link href={`/projects/${proj.id}?view=tasks`} className="text-xs text-slate-500 hover:text-sea hover:underline">
                            {proj.title}
                          </Link>
                        ) : client ? (
                          <Link href={`/clients/${client.id}`} className="text-xs text-slate-500 hover:text-sea hover:underline">
                            {client.name}
                          </Link>
                        ) : null}
                        <span className={`ml-auto rounded-full px-2 py-0.5 text-[11px] ${prio.pill}`}>{prio.label}</span>
                        {due && <span className="text-[11px] text-slate-400">{due}</span>}
                      </li>
                    );
                  })}
                </ul>
              </CollapsibleTaskSection>
            );
          })}
        </div>
      )}
    </>
  );
}
