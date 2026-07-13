// A contractor's own profile: contact details + rates, nothing else. RLS shows
// them exactly one contractors row — their own.

import { createClient } from '@/lib/supabase/server';
import { PageHeader } from '@/components/page-header';
import { MyProfileForm } from '@/components/work/my-profile-form';

export default async function MyProfilePage() {
  const supabase = await createClient();
  const { data: me } = await supabase
    .from('contractors')
    .select('name, email, phone, role, rate_full, rate_half, rate_hourly')
    .maybeSingle();

  return (
    <>
      <PageHeader title="My Profile" description="Your contact details and rates — only you and Seaside Media can see these." />
      {!me ? (
        <p className="rounded-2xl border border-dashed border-slate-300 bg-white/60 px-6 py-10 text-center text-sm text-slate-500">
          Your team record isn’t linked yet — ask Seaside Media to re-send your invite.
        </p>
      ) : (
        <MyProfileForm me={me} />
      )}
    </>
  );
}
