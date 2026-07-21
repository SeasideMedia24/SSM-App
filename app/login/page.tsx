// Login screen (public route). If the visitor is already signed in, send them
// straight to the dashboard. The backdrop is the animated coastal gradient.

import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { BrandLogo } from '@/components/brand-logo';
import { LoginForm } from './login-form';

export default async function LoginPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    redirect('/dashboard');
  }

  return (
    <div className="brand-gradient-animated relative flex min-h-screen items-center justify-center overflow-hidden px-4">
      {/* Floating light blobs for depth */}
      <div className="animate-float pointer-events-none absolute -left-24 top-10 h-72 w-72 rounded-full bg-aqua/30 blur-3xl" />
      <div
        className="animate-float pointer-events-none absolute -right-16 bottom-0 h-80 w-80 rounded-full bg-teal/30 blur-3xl"
        style={{ animationDelay: '2s' }}
      />

      <div className="relative w-full max-w-sm rounded-2xl bg-white/95 p-8 shadow-2xl ring-1 ring-white/50 backdrop-blur">
        <div className="mb-7 text-center">
          <BrandLogo size="lg" tagline={false} className="justify-center" />
          <p className="mt-2 text-[11px] font-medium uppercase tracking-[0.3em] text-sea">Ops Hub</p>
        </div>
        <LoginForm />
      </div>
    </div>
  );
}
