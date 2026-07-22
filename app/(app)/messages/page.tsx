import { createClient } from '@/lib/supabase/server';
import { PageHeader } from '@/components/page-header';
import { MessagesPanel } from '@/components/messages/messages-panel';
import { listThreads, getThreadMessages } from '@/lib/messages/queries';

// Owner Messages — every project thread + DMs with team members. Start a DM
// from a contractor's page ("Message" button); project threads appear as soon
// as someone is assigned to the project.

export default async function MessagesPage({
  searchParams,
}: {
  searchParams: Promise<{ t?: string }>;
}) {
  const { t } = await searchParams;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const threads = await listThreads(supabase, user?.id ?? '');
  const selectedId = t && threads.some((x) => x.id === t) ? t : (threads[0]?.id ?? null);
  const messages = selectedId ? await getThreadMessages(supabase, selectedId, user?.id ?? '') : [];

  return (
    <>
      <PageHeader
        title="Messages"
        description="Project threads with your team, and direct messages. Start a DM from a team member’s page."
      />
      <MessagesPanel
        threads={threads}
        selectedId={selectedId}
        messages={messages}
        basePath="/messages"
        emptyHint="No conversations yet — assign someone to a project, or open a team member’s page and hit Message."
      />
    </>
  );
}
