'use server';

// Server-side auth actions. Running these on the server keeps the flow simple
// and means the session cookie is set by the server client.

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';

export type LoginState = { error: string | null };

// Used with React's useActionState in the login form (see login-form.tsx).
export async function login(_prev: LoginState, formData: FormData): Promise<LoginState> {
  const email = String(formData.get('email') ?? '').trim();
  const password = String(formData.get('password') ?? '');

  // Server-side validation (never trust the browser alone — CLAUDE.md rule #3).
  if (!email || !password) {
    return { error: 'Enter both your email and password.' };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    // Keep the message generic so we don't reveal whether an email exists.
    return { error: 'That email and password combination didn’t work.' };
  }

  // Refresh any cached layouts now that we're signed in, then go to the app.
  revalidatePath('/', 'layout');
  redirect('/dashboard');
}

export async function logout() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  revalidatePath('/', 'layout');
  redirect('/login');
}
