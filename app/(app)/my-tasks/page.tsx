import { createClient } from '@/lib/supabase/server';
import { PageHeader } from '@/components/page-header';
import { NewTaskForm } from '@/components/tasks/new-task-form';
import { MyTasksManager, type ManagerTask } from '@/components/tasks/my-tasks-manager';
import type { TaskStatus, TaskPriority } from '@/types/database.types';

type Rel = { id: string; title?: string; name?: string } | { id: string; title?: string; name?: string }[] | null;
function one(p: Rel): { id: string; title?: string; name?: string } | null {
  if (!p) return null;
  return Array.isArray(p) ? (p[0] ?? null) : p;
}

export default async function MyTasksPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Tasks assigned to me (live + archived — the manager filters), plus the
  // projects and clients that back the "new task" form's pickers.
  const [{ data: tasks }, { data: projects }, { data: clients }] = await Promise.all([
    supabase
      .from('tasks')
      .select('id, title, status, priority, due_date, archived_at, projects(id, title), clients(id, name)')
      .eq('assignee_id', user?.id ?? '')
      .order('due_date', { ascending: true, nullsFirst: false }),
    supabase.from('projects').select('id, title').neq('status', 'archived').order('title'),
    supabase.from('clients').select('id, name').order('name'),
  ]);

  const projectOptions = (projects ?? []).map((p) => ({ id: p.id, label: p.title }));
  const clientOptions = (clients ?? []).map((c) => ({ id: c.id, label: c.name }));

  // Normalize the joined project/client (Supabase returns object-or-array) into
  // the flat shape the client manager expects.
  const managerTasks: ManagerTask[] = (tasks ?? []).map((t) => {
    const proj = one(t.projects as Rel);
    const client = one(t.clients as Rel);
    return {
      id: t.id,
      title: t.title,
      status: t.status as TaskStatus,
      priority: t.priority as TaskPriority,
      due_date: t.due_date,
      archived: t.archived_at != null,
      project: proj ? { id: proj.id, title: proj.title ?? '' } : null,
      client: client ? { id: client.id, name: client.name ?? '' } : null,
    };
  });

  return (
    <>
      <PageHeader title="My Tasks" description="Everything assigned to you — attach a task to a project, a client, or neither." />

      <NewTaskForm projects={projectOptions} clients={clientOptions} />

      <MyTasksManager tasks={managerTasks} projects={projectOptions.map((p) => ({ id: p.id, title: p.label }))} />
    </>
  );
}
