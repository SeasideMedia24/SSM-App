// Per-client invite. The owner generates a private link (/onboard/<token>) from
// a client's page; this pre-fills what we know and updates that client on submit.
// The token lookup uses the admin client because the visitor is anonymous.

import { createAdminClient } from '@/lib/supabase/admin';
import { OnboardingForm } from '@/components/onboarding-form';

export const metadata = { title: 'Complete your onboarding — Seaside Media' };

export default async function OnboardTokenPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const admin = createAdminClient();
  const { data: client } = await admin
    .from('clients')
    .select('name, company, email, phone')
    .eq('onboard_token', token)
    .single();

  if (!client) {
    return (
      <div className="rounded-2xl bg-white/95 p-8 text-center shadow-2xl ring-1 ring-white/50">
        <h2 className="text-lg font-semibold text-ink">This link isn’t active</h2>
        <p className="mt-2 text-sm text-slate-500">
          It may have already been used or expired. Please reach out to Seaside Media for a fresh link.
        </p>
      </div>
    );
  }

  return <OnboardingForm token={token} prefill={client} />;
}
