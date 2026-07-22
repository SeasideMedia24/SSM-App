// Best-effort email notification for a new message. Called from postMessage; it
// NEVER throws into the caller (failures are swallowed). Uses the admin client
// because it resolves recipient emails (auth.users) and stamps notified_at.
//
// Debounce: email a participant only if they haven't read the thread in the last
// ~5 minutes AND we haven't already emailed them since their last read — so an
// active chat doesn't spam inboxes, but someone who's away gets a nudge.

import 'server-only';
import { createAdminClient } from '@/lib/supabase/admin';
import { sendMessageEmail, emailConfigured } from '@/lib/email/send';

const STALE_MS = 5 * 60 * 1000;

export async function notifyThreadByEmail(threadId: string, senderId: string, preview: string, origin: string): Promise<void> {
  if (!emailConfigured()) return;
  const admin = createAdminClient();

  const [{ data: parts }, senderUser] = await Promise.all([
    admin.from('thread_participants').select('user_id, last_read_at, notified_at').eq('thread_id', threadId),
    admin.auth.admin.getUserById(senderId),
  ]);
  if (!parts) return;
  const senderName =
    (senderUser.data.user?.user_metadata?.full_name as string | undefined) ||
    senderUser.data.user?.email?.split('@')[0] || 'A teammate';

  const now = Date.now();
  const threadUrl = `${origin}/messages?t=${threadId}`; // owner path; team members reach the same thread via their own nav

  await Promise.all(
    parts
      .filter((p) => p.user_id !== senderId)
      .filter((p) => {
        const readMs = p.last_read_at ? new Date(p.last_read_at).getTime() : 0;
        const stale = now - readMs > STALE_MS;
        const notifiedMs = p.notified_at ? new Date(p.notified_at).getTime() : 0;
        const notNotifiedSinceRead = notifiedMs <= readMs; // reset each time they read
        return stale && notNotifiedSinceRead;
      })
      .map(async (p) => {
        const u = await admin.auth.admin.getUserById(p.user_id);
        const to = u.data.user?.email;
        if (!to) return;
        const recipientName = (u.data.user?.user_metadata?.full_name as string | undefined) || '';
        const res = await sendMessageEmail({ origin, to, recipientName, senderName, preview: preview.slice(0, 300), threadUrl });
        if (res.ok) {
          await admin.from('thread_participants').update({ notified_at: new Date().toISOString() }).eq('thread_id', threadId).eq('user_id', p.user_id);
        }
      }),
  );
}
