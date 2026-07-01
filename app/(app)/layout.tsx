// Layout for every signed-in ("app") page. This is the real auth gate: even
// though the proxy already redirects signed-out users, we re-check here right
// next to the data (defense in depth — CLAUDE.md security posture).

import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { Sidebar } from '@/components/sidebar';

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  return (
    <div className="flex min-h-screen bg-[#f6f9fb]">
      <Sidebar userEmail={user.email ?? ''} />
      <main className="relative flex-1 overflow-y-auto">
        {/* Thin coastal gradient strip that reaches across the top of the page */}
        <div className="brand-gradient h-1.5 w-full" />
        <div className="mx-auto max-w-6xl px-8 py-8">{children}</div>
      </main>
    </div>
  );
}
