// Login screen (public route). If the visitor is already signed in, send them
// straight to the dashboard.

import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
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
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
      <div className="w-full max-w-sm rounded-xl border border-slate-200 bg-white p-8 shadow-sm">
        <div className="mb-6 text-center">
          <h1 className="text-lg font-semibold text-slate-900">Seaside Media</h1>
          <p className="mt-1 text-sm text-slate-500">Internal Ops Hub — sign in</p>
        </div>
        <LoginForm />
      </div>
    </div>
  );
}
