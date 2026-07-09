import { createClient } from '@/lib/supabase/server';
import { PageHeader } from '@/components/page-header';
import { GlobalEmpty, proj, type ProjRel } from '@/components/projects/global-table';
import { GroupedByProject } from '@/components/projects/grouped-view';
import { groupByProject } from '@/lib/projects/grouping';

export default async function AllDeliverablesPage() {
  const supabase = await createClient();
  const { data } = await supabase
    .from('deliverables')
    .select('id, title, status, due_date, projects(id, title)')
    .order('due_date', { ascending: true, nullsFirst: false });

  const groups = groupByProject(
    (data ?? []).map((d) => ({ id: d.id, title: d.title, status: d.status, date: d.due_date, project: proj(d.projects as ProjRel) })),
  );

  return (
    <>
      <PageHeader title="Deliverables" description="Deliverables grouped by project. Use the chips to focus on specific projects." />
      {groups.length === 0 ? (
        <GlobalEmpty>No deliverables yet. They’re created inside each project.</GlobalEmpty>
      ) : (
        <GroupedByProject groups={groups} itemNoun="deliverable" projectView="deliverables" />
      )}
    </>
  );
}
