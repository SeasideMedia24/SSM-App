// Full-screen shell for the Brainstorming canvas — deliberately OUTSIDE the app
// sidebar chrome so the board can fill the screen. Same owner-only auth gate as
// the app layout (defense in depth alongside the proxy).

import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { getAppRole } from '@/lib/auth/role';

export default async function CanvasLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/login');
  if ((await getAppRole(supabase)) === 'contractor') redirect('/my-work');

  return <div className="min-h-screen bg-white">{children}</div>;
}
