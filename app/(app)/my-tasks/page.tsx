import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { PageHeader } from '@/components/page-header';
import { CollapsibleTaskSection } from '@/components/tasks/collapsible-section';
import { TASK_STATUSES, taskPriorityMeta } from '@/lib/projects/status';
import type { TaskStatus, TaskPriority } from '@/types/database.types';

type ProjectRel = { id: string; title: string } | { id: string; title: string }[] | null;
function project(p: ProjectRel): { id: string; title: string } | null {
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

  const { data: tasks } = await supabase
    .from('tasks')
    .select('id, title, status, priority, due_date, projects(id, title)')
    .eq('assignee_id', user?.id ?? '')
    .order('due_date', { ascending: true, nullsFirst: false });

  const list = tasks ?? [];

  return (
    <>
      <PageHeader title="My Tasks" description="Everything assigned to you, across every project." />

      {list.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white/60 px-6 py-14 text-center">
          <p className="text-sm text-slate-500">No tasks assigned to you yet.</p>
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
                    const proj = project(t.projects as ProjectRel);
                    const prio = taskPriorityMeta(t.priority as TaskPriority);
                    const due = fmtDue(t.due_date);
                    return (
                      <li key={t.id} className="flex items-center gap-3 px-4 py-2.5">
                        <span className={`text-sm ${t.status === 'done' ? 'text-slate-400 line-through' : 'text-ink'}`}>
                          {t.title}
                        </span>
                        {proj && (
                          <Link href={`/projects/${proj.id}?view=tasks`} className="text-xs text-slate-500 hover:text-sea hover:underline">
                            {proj.title}
                          </Link>
                        )}
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
