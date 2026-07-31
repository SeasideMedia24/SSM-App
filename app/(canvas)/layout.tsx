// Full-screen shell for the Brainstorming canvas — deliberately OUTSIDE the app
// sidebar chrome so the board can fill the screen. Auth-gated; RLS then scopes
// what each viewer sees: the owner reaches every board, a team member only the
// boards of projects they're assigned to (view at L1, edit at L2+). See
// migration 20260731000001_boards_projects.sql.

import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';

export default async function CanvasLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  return <div className="min-h-screen bg-white">{children}</div>;
}
