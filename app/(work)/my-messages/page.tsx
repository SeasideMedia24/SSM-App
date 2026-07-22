import { createClient } from '@/lib/supabase/server';
import { MessagesPanel } from '@/components/messages/messages-panel';
import { listThreads, getThreadMessages } from '@/lib/messages/queries';

// Team Messages — the same panel the owner uses, scoped by RLS: a team member
// sees their projects' threads and any DMs they're part of. This works even
// with no project assigned (internal-only view: DMs with the owner).

export const metadata = { title: 'Messages — Seaside Media Team' };

export default async function MyMessagesPage({
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
      <h1 className="mb-4 text-lg font-semibold text-ink">Messages</h1>
      <MessagesPanel
        threads={threads}
        selectedId={selectedId}
        messages={messages}
        basePath="/my-messages"
        emptyHint="No conversations yet — they’ll appear when you’re added to a project or someone messages you."
      />
    </>
  );
}
