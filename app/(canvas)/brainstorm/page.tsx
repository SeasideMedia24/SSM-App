import { createClient } from '@/lib/supabase/server';
import { BoardMenu } from '@/components/brainstorm/board-menu';

export const metadata = { title: 'Brainstorming — Seaside Media' };

// The Brainstorming hub: four kinds of boards, each its own tab. Full-screen,
// outside the app chrome.
export default async function BrainstormHub() {
  const supabase = await createClient();
  const { data: boards } = await supabase
    .from('boards')
    .select('id, kind, title, updated_at, projects ( title )')
    .order('updated_at', { ascending: false });

  const list = (boards ?? []).map((b) => {
    const p = b.projects as unknown as { title: string } | { title: string }[] | null;
    const projectTitle = Array.isArray(p) ? p[0]?.title : p?.title;
    return { id: b.id, kind: b.kind, title: b.title, updated_at: b.updated_at, projectTitle: projectTitle ?? null };
  });

  return <BoardMenu boards={list} />;
}
