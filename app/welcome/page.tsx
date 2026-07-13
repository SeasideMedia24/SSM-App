// Set-your-password page — where an invited team member lands after clicking
// the email invite (via /auth/confirm, which created their session). Public in
// the proxy, but it verifies the session itself: no session → login.

import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { SetPasswordForm } from '@/components/auth/set-password-form';

export const metadata = { title: 'Welcome — Seaside Media' };

export default async function WelcomePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  return (
    <main className="brand-gradient-deep flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="mb-6 text-center">
          <p className="font-display text-3xl tracking-wide text-white">SEASIDE MEDIA</p>
          <p className="mt-1 text-[11px] font-medium uppercase tracking-[0.25em] text-aqua">Team</p>
        </div>
        <SetPasswordForm email={user.email ?? ''} />
      </div>
    </main>
  );
}
