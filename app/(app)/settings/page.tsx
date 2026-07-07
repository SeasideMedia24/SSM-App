import { createClient } from '@/lib/supabase/server';
import { PageHeader, ComingSoon } from '@/components/page-header';
import { PublicOnboardLink } from '@/components/settings/public-onboard-link';
import { RatePresets } from '@/components/settings/rate-presets';

export default async function SettingsPage() {
  const supabase = await createClient();
  const { data: presets } = await supabase
    .from('rate_presets')
    .select('id, label, unit, default_rate')
    .order('label');

  return (
    <>
      <PageHeader title="Settings" description="Manage onboarding, rate presets, and team members." />

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
        <h2 className="mb-3 text-sm font-semibold text-slate-900">Rate presets</h2>
        <RatePresets presets={presets ?? []} />
      </section>

      <section>
        <h2 className="mb-3 text-sm font-semibold text-slate-900">Team</h2>
        <ComingSoon phase="Phase 7" />
      </section>
    </>
  );
}
