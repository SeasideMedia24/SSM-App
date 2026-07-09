import { createClient } from '@/lib/supabase/server';
import { PageHeader } from '@/components/page-header';
import { GlobalEmpty, proj, type ProjRel } from '@/components/projects/global-table';
import { GroupedByProject } from '@/components/projects/grouped-view';
import { groupByProject } from '@/lib/projects/grouping';

export default async function AllTimelinePage() {
  const supabase = await createClient();
  const { data } = await supabase
    .from('milestones')
    .select('id, title, status, date, projects(id, title)')
    .order('date', { ascending: true, nullsFirst: false });

  const groups = groupByProject(
    (data ?? []).map((m) => ({ id: m.id, title: m.title, status: m.status, date: m.date, project: proj(m.projects as ProjRel) })),
  );

  return (
    <>
      <PageHeader title="Timeline" description="Milestones grouped by project. Use the chips to focus on specific projects." />
      {groups.length === 0 ? (
        <GlobalEmpty>No milestones yet. They’re created inside each project.</GlobalEmpty>
      ) : (
        <GroupedByProject groups={groups} itemNoun="milestone" projectView="timeline" />
      )}
    </>
  );
}
