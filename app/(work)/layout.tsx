// Layout for the CONTRACTOR surface ("My Work" / "My Profile") — the scoped
// view a team member gets. Owners are sent to their dashboard; signed-out
// visitors to login. RLS is the real wall; this routing is the polite layer.

import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { getAppRole } from '@/lib/auth/role';
import { unreadCount } from '@/lib/messages/queries';
import { logout } from '@/app/login/actions';

export default async function WorkLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const role = await getAppRole(supabase);
  if (!role) redirect('/login');
  if (role === 'owner') redirect('/dashboard');

  const unread = await unreadCount(supabase);

  return (
    <div className="flex min-h-screen flex-col bg-[#f6f9fb]">
      <div className="brand-gradient h-1.5 w-full" />
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-4xl flex-wrap items-center gap-4 px-6 py-3">
          <div className="mr-2">
            <p className="font-display text-lg leading-none tracking-wide text-ink">SEASIDE MEDIA</p>
            <p className="text-[9px] font-medium uppercase tracking-[0.25em] text-sea">Team</p>
          </div>
          <nav className="flex items-center gap-1 text-sm">
            <Link href="/my-work" className="rounded-lg px-3 py-1.5 font-medium text-slate-600 transition-colors hover:bg-slate-100 hover:text-ink">
              My Work
            </Link>
            <Link href="/my-messages" className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 font-medium text-slate-600 transition-colors hover:bg-slate-100 hover:text-ink">
              Messages
              {unread > 0 && (
                <span className="rounded-full bg-sea px-1.5 py-0.5 text-[10px] font-semibold leading-none text-white">{unread}</span>
              )}
            </Link>
            <Link href="/my-profile" className="rounded-lg px-3 py-1.5 font-medium text-slate-600 transition-colors hover:bg-slate-100 hover:text-ink">
              My Profile
            </Link>
          </nav>
          <form action={logout} className="ml-auto">
            <button type="submit" className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm text-slate-500 transition-colors hover:border-teal hover:text-sea">
              Sign out
            </button>
          </form>
        </div>
      </header>
      <main className="mx-auto w-full max-w-4xl flex-1 px-6 py-8">{children}</main>
    </div>
  );
}
