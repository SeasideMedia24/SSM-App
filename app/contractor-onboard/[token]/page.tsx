// Per-contractor invite. The owner generates a private link
// (/contractor-onboard/<token>) from a contractor's page; this pre-fills what we
// know and fills in the blanks on submit. The token lookup uses the admin client
// because the visitor is anonymous.

import { createAdminClient } from '@/lib/supabase/admin';
import { ContractorOnboardingForm } from '@/components/contractor-onboarding-form';

export const metadata = { title: 'Confirm your details — Seaside Media' };

function Card({ title, body }: { title: string; body: string }) {
  return (
    <div className="rounded-2xl bg-white/95 p-8 text-center shadow-2xl ring-1 ring-white/50">
      <h2 className="text-lg font-semibold text-ink">{title}</h2>
      <p className="mt-2 text-sm text-slate-500">{body}</p>
    </div>
  );
}

export default async function ContractorOnboardTokenPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const admin = createAdminClient();
  const { data: contractor } = await admin
    .from('contractors')
    .select('name, email, phone, role, rate_full, rate_half, rate_hourly, onboarded_at')
    .eq('onboard_token', token)
    .single();

  if (!contractor) {
    return <Card title="This link isn’t active" body="It may have already been used or expired. Please reach out to Seaside Media for a fresh link." />;
  }
  if (contractor.onboarded_at) {
    return <Card title="All set" body="You’ve already completed your details. Thanks! Reach out to Seaside Media if anything needs changing." />;
  }

  return <ContractorOnboardingForm token={token} prefill={contractor} />;
}
