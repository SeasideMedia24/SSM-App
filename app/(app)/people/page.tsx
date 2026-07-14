// People overview — a quick landing for everything "people": clients, inquiries,
// team, and onboarding. Each card shows a live count and links straight in.

import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { PageHeader } from '@/components/page-header';

export default async function PeoplePage() {
  const supabase = await createClient();

  // Counts only (head:true) — cheap. Tolerant of any table hiccup (→ 0).
  const [{ count: clients }, { count: newInquiries }, { count: team }, { count: pendingClients }, { count: pendingTeam }] =
    await Promise.all([
      supabase.from('clients').select('id', { count: 'exact', head: true }),
      supabase.from('onboarding_submissions').select('id', { count: 'exact', head: true }).eq('status', 'new'),
      supabase.from('contractors').select('id', { count: 'exact', head: true }),
      supabase.from('clients').select('id', { count: 'exact', head: true }).not('onboard_token', 'is', null).is('onboarded_at', null),
      supabase.from('contractors').select('id', { count: 'exact', head: true }).not('onboard_token', 'is', null).is('onboarded_at', null),
    ]);

  const cards = [
    { href: '/clients', title: 'Clients', desc: 'Everyone you work with', stat: `${clients ?? 0} total`, icon: <IconUsers /> },
    { href: '/inquiries', title: 'Inquiries', desc: 'New leads from your intake form', stat: `${newInquiries ?? 0} new`, tone: (newInquiries ?? 0) > 0 ? 'warn' : undefined, icon: <IconInbox /> },
    { href: '/contractors', title: 'Team', desc: 'Contractors, crew, and employees', stat: `${team ?? 0} people`, icon: <IconTeam /> },
    { href: '/onboarding', title: 'Onboarding', desc: 'Links to send; who still needs to finish', stat: `${(pendingClients ?? 0) + (pendingTeam ?? 0)} pending`, tone: ((pendingClients ?? 0) + (pendingTeam ?? 0)) > 0 ? 'warn' : undefined, icon: <IconLink /> },
  ];

  return (
    <>
      <PageHeader title="People" description="Clients, inquiries, team, and onboarding — all in one place." />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {cards.map((c) => (
          <Link
            key={c.href}
            href={c.href}
            className="group flex items-center gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition-all hover:-translate-y-0.5 hover:border-teal hover:shadow-md"
          >
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-teal/10 text-sea">{c.icon}</span>
            <div className="min-w-0 flex-1">
              <p className="font-medium text-ink group-hover:text-sea">{c.title}</p>
              <p className="truncate text-sm text-slate-500">{c.desc}</p>
            </div>
            <span className={`shrink-0 text-sm font-semibold ${c.tone === 'warn' ? 'text-red-600' : 'text-slate-400'}`}>{c.stat}</span>
          </Link>
        ))}
      </div>
    </>
  );
}

function IconUsers() {
  return <svg width={22} height={22} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round"><circle cx="9" cy="8" r="3" /><path d="M15 11a3 3 0 1 0-1-5.83" /><path d="M3 20a6 6 0 0 1 12 0" /><path d="M17 14a6 6 0 0 1 4 6" /></svg>;
}
function IconInbox() {
  return <svg width={22} height={22} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round"><path d="M22 12h-6l-2 3h-4l-2-3H2" /><path d="M5.45 5.11 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z" /></svg>;
}
function IconTeam() {
  return <svg width={22} height={22} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M22 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /></svg>;
}
function IconLink() {
  return <svg width={22} height={22} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" /><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" /></svg>;
}
