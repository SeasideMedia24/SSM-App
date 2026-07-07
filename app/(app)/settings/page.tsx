import { createClient } from '@/lib/supabase/server';
import { PageHeader, ComingSoon } from '@/components/page-header';
import { PublicOnboardLink } from '@/components/settings/public-onboard-link';
import { PricingEngine } from '@/components/settings/pricing-engine';

export default async function SettingsPage() {
  const supabase = await createClient();
  const [{ data: roles }, { data: services }, { data: configRows }] = await Promise.all([
    supabase.from('pricing_roles').select('*').order('sort'),
    supabase.from('pricing_page_services').select('*').order('sort'),
    supabase.from('pricing_config').select('*'),
  ]);
  const config = Object.fromEntries((configRows ?? []).map((c) => [c.key, c.value]));
  const ratesMissing = !roles || roles.length === 0;

  return (
    <>
      <PageHeader title="Settings" description="Manage onboarding, pricing, and team members." />

      <section className="mb-8">
        <h2 className="mb-3 text-sm font-semibold text-slate-900">Client onboarding</h2>
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <p className="mb-3 text-sm text-slate-500">
            Share this public link (on your site, in an email, anywhere). Anyone who completes it becomes a new
            client with a draft project and contract, ready for you to review. For a specific client, use
            “Invite to onboard” on their page instead.
          </p>
          <PublicOnboardLink />
        </div>
      </section>

      <section className="mb-8">
        <h2 className="mb-3 text-sm font-semibold text-slate-900">Pricing engine</h2>
        {ratesMissing ? (
          <p className="rounded-xl bg-amber-50 px-3 py-2 text-sm text-amber-800">
            Pricing rates aren’t loaded yet — run the migration
            {' '}<code className="rounded bg-amber-100 px-1">20260707000001_pricing_engine.sql</code>{' '}
            in the Supabase SQL Editor (see supabase/README.md), then refresh.
          </p>
        ) : (
          <PricingEngine roles={roles ?? []} services={services ?? []} config={config} />
        )}
      </section>

      <section>
        <h2 className="mb-3 text-sm font-semibold text-slate-900">Team</h2>
        <ComingSoon phase="Phase 7" />
      </section>
    </>
  );
}
