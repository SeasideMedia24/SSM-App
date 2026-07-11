// Onboarding — one place to grab and send onboarding links.
//
// Lists everyone who hasn't finished onboarding yet — clients and team members —
// each with their private link ready to copy or email (or a one-click "create
// link" if they don't have one). It reuses the exact controls from the client
// and contractor detail pages, just gathered together. Once someone completes
// onboarding they have onboarded_at set and drop off this list.

import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { PageHeader } from '@/components/page-header';
import { InviteControl } from '@/components/clients/invite-control';
import { OnboardLinkControl } from '@/components/contractors/onboard-link-control';
import { SelfServeLink } from '@/components/onboarding/self-serve-link';
import { contractorTypeMeta } from '@/lib/projects/status';
import type { ContractorType } from '@/types/database.types';

export default async function OnboardingPage() {
  const supabase = await createClient();

  const [{ data: clients }, { data: team }] = await Promise.all([
    supabase
      .from('clients')
      .select('id, name, email, onboard_token, onboarded_at')
      .is('onboarded_at', null)
      .order('name'),
    supabase
      .from('contractors')
      .select('id, name, type, onboard_token, onboarded_at')
      .is('onboarded_at', null)
      .order('name'),
  ]);

  const clientList = clients ?? [];
  const teamList = team ?? [];

  return (
    <>
      <PageHeader
        title="Onboarding"
        description="Send an onboarding link to a client or team member. Once they complete it, they drop off this list."
      />

      {/* Self-serve links: send either one to someone not yet in the system and
          they add their own details. */}
      <section className="mb-8">
        <h2 className="mb-3 text-sm font-semibold text-slate-900">Self-serve links</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          <SelfServeLink
            title="New client"
            description="Share with a prospective client to start their own onboarding — creates a new lead for you to review."
            path="/onboard"
          />
          <SelfServeLink
            title="New team member"
            description="Share with a new contractor or crew member to add their own details — creates a new team record."
            path="/contractor-onboard"
          />
        </div>
      </section>

      <div className="space-y-8">
        {/* Clients */}
        <Section
          title="Clients"
          count={clientList.length}
          empty={
            <>
              Every client has been onboarded. New clients appear here — add one under{' '}
              <Link href="/clients" className="text-sea underline">Clients</Link>.
            </>
          }
        >
          {clientList.map((c) => (
            <Row key={c.id} name={c.name} href={`/clients/${c.id}`}>
              <InviteControl clientId={c.id} clientName={c.name} email={c.email} token={c.onboard_token} />
            </Row>
          ))}
        </Section>

        {/* Team */}
        <Section
          title="Team"
          count={teamList.length}
          empty={
            <>
              Every team member has been onboarded. Add someone new under{' '}
              <Link href="/contractors" className="text-sea underline">Team</Link>.
            </>
          }
        >
          {teamList.map((c) => {
            const meta = contractorTypeMeta(c.type as ContractorType);
            return (
              <Row
                key={c.id}
                name={c.name}
                href={`/contractors/${c.id}`}
                tag={<span className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${meta.pill}`}>{meta.label}</span>}
              >
                <OnboardLinkControl contractorId={c.id} token={c.onboard_token} onboardedAt={c.onboarded_at} />
              </Row>
            );
          })}
        </Section>
      </div>
    </>
  );
}

function Section({
  title,
  count,
  empty,
  children,
}: {
  title: string;
  count: number;
  empty: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section>
      <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-900">
        {title}
        <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-500">{count}</span>
      </h2>
      {count === 0 ? (
        <p className="rounded-2xl border border-dashed border-slate-300 bg-white/60 px-6 py-8 text-center text-sm text-slate-400">
          {empty}
        </p>
      ) : (
        <ul className="divide-y divide-slate-100 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          {children}
        </ul>
      )}
    </section>
  );
}

function Row({
  name,
  href,
  tag,
  children,
}: {
  name: string;
  href: string;
  tag?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <li className="flex flex-col gap-3 px-4 py-3.5 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-center gap-2">
        <Link href={href} className="font-medium text-ink hover:text-sea hover:underline">{name}</Link>
        {tag}
      </div>
      <div className="sm:text-right">{children}</div>
    </li>
  );
}
