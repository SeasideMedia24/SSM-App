import { createClient } from '@/lib/supabase/server';
import { BoardMenu } from '@/components/brainstorm/board-menu';

export const metadata = { title: 'Brainstorming — Seaside Media' };

// The Brainstorming hub: four kinds of boards, each its own tab. Full-screen,
// outside the app chrome.
export default async function BrainstormHub() {
  const supabase = await createClient();
  const { data: boards } = await supabase
    .from('boards')
    .select('id, kind, title, updated_at')
    .order('updated_at', { ascending: false });

  return <BoardMenu boards={boards ?? []} />;
}
