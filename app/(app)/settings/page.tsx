import { createClient } from '@/lib/supabase/server';
import { PageHeader, ComingSoon } from '@/components/page-header';
import { PublicOnboardLink } from '@/components/settings/public-onboard-link';
import { PricingEngine } from '@/components/settings/pricing-engine';
import { GoogleCalendarSettings, type GoogleCalendarRow } from '@/components/settings/google-calendar';
import { QuickbooksSettings } from '@/components/settings/quickbooks';
import { googleConfigured } from '@/lib/google/calendar';
import { quickbooksConfigured, quickbooksEnvStatus } from '@/lib/quickbooks/config';

export default async function SettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ google?: string; quickbooks?: string }>;
}) {
  const { google: googleFlag, quickbooks: quickbooksFlag } = await searchParams;
  const supabase = await createClient();
  const [{ data: roles }, { data: services }, { data: configRows }, { data: googleAccount }, { data: googleCals }, { data: qboAccount }] = await Promise.all([
    supabase.from('pricing_roles').select('*').order('sort'),
    supabase.from('pricing_page_services').select('*').order('sort'),
    supabase.from('pricing_config').select('*'),
    supabase.from('google_accounts').select('email').maybeSingle(),
    supabase.from('google_calendars').select('id, summary, color, is_primary, included, merge_ssm').order('summary'),
    supabase.from('qbo_accounts').select('company_name').maybeSingle(),
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

      <section className="mb-8" id="google-calendar">
        <h2 className="mb-3 text-sm font-semibold text-slate-900">Google Calendar</h2>
        <GoogleCalendarSettings
          configured={googleConfigured()}
          connectedEmail={googleAccount ? (googleAccount.email ?? null) : undefined}
          calendars={(googleCals ?? []) as GoogleCalendarRow[]}
          flag={googleFlag}
        />
      </section>

      <section className="mb-8" id="quickbooks">
        <h2 className="mb-3 text-sm font-semibold text-slate-900">QuickBooks</h2>
        <QuickbooksSettings
          configured={quickbooksConfigured()}
          envStatus={quickbooksEnvStatus()}
          companyName={qboAccount ? (qboAccount.company_name ?? null) : undefined}
          flag={quickbooksFlag}
        />
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
