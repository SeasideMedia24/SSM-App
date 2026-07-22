// Layout for every signed-in ("app") page. This is the real auth gate: even
// though the proxy already redirects signed-out users, we re-check here right
// next to the data (defense in depth — CLAUDE.md security posture).

import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';
import { createClient } from '@/lib/supabase/server';
import { getAppRole } from '@/lib/auth/role';
import { todayInTz } from '@/lib/dashboard/calendar';
import { unreadCount } from '@/lib/messages/queries';
import { Sidebar } from '@/components/sidebar';
import { UndoProvider } from '@/components/undo/undo-provider';
import { PaepaeDock } from '@/components/paepae/paepae-dock';
import { TimezoneCookie } from '@/components/util/timezone-cookie';

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  // Team members get their own scoped surface — the owner app is owner-only.
  // (RLS would blank these pages for them anyway; this routing is the polite layer.)
  if ((await getAppRole(supabase)) === 'contractor') {
    redirect('/my-work');
  }

  // Notification counts for the menu badges. head:true fetches only counts (no
  // rows), so this stays cheap. More sources (PaePae updates, team messages)
  // join this list when messaging lands.
  //
  // "Today" is computed in the VIEWER'S timezone (same as the dashboard) — with
  // plain UTC the badge flipped tasks to overdue hours early in the evening.
  // Archived tasks never count as overdue (archiving means "out of my face").
  const tz = (await cookies()).get('ssm_tz')?.value || 'America/New_York';
  const today = todayInTz(tz);
  const [{ count: newInquiries }, { count: overdueTasks }, unreadMessages] = await Promise.all([
    supabase
      .from('onboarding_submissions')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'new'),
    supabase
      .from('tasks')
      .select('id', { count: 'exact', head: true })
      .lt('due_date', today)
      .neq('status', 'done')
      .is('archived_at', null),
    unreadCount(supabase),
  ]);

  // Keyed by nav href — the sidebar shows a count pill on matching entries
  // (and rolls child counts up onto their section).
  const badges: Record<string, number> = {
    '/inquiries': newInquiries ?? 0,
    '/my-tasks': overdueTasks ?? 0,
    '/messages': unreadMessages,
  };

  return (
    <UndoProvider>
      <div className="flex min-h-screen bg-[#f6f9fb]">
        <Sidebar userEmail={user.email ?? ''} badges={badges} />
        <main className="relative flex-1 overflow-y-auto">
          {/* Thin coastal gradient strip that reaches across the top of the page */}
          <div className="brand-gradient h-1.5 w-full" />
          <div className="mx-auto max-w-6xl px-8 py-8">{children}</div>
        </main>
        {/* PaePae, reachable from every tab; records the viewer's timezone. */}
        <PaepaeDock />
        <TimezoneCookie />
      </div>
    </UndoProvider>
  );
}
