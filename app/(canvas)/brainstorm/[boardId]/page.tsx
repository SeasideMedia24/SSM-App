import Link from 'next/link';
import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { Canvas } from '@/components/brainstorm/canvas';
import { BoardTitle } from '@/components/brainstorm/board-title';
import type { ItemData } from '@/components/brainstorm/canvas-item';
import type { ItemType } from '@/app/(canvas)/brainstorm/actions';

// Pre-sign download URLs for every stored media item so images/files render
// immediately (private bucket → signed URLs).
async function signMedia(items: { content: Record<string, unknown> }[]): Promise<Record<string, string>> {
  const paths = items
    .map((i) => i.content.storage_path)
    .filter((p): p is string => typeof p === 'string');
  if (paths.length === 0) return {};
  const admin = createAdminClient();
  const entries = await Promise.all(
    paths.map(async (p) => {
      const { data } = await admin.storage.from('brainstorm-media').createSignedUrl(p, 3600);
      return [p, data?.signedUrl ?? ''] as const;
    }),
  );
  return Object.fromEntries(entries.filter(([, u]) => u));
}

export default async function BoardPage({ params }: { params: Promise<{ boardId: string }> }) {
  const { boardId } = await params;
  const supabase = await createClient();

  const { data: board } = await supabase.from('boards').select('id, kind, title').eq('id', boardId).maybeSingle();
  if (!board) notFound();

  const { data: rows } = await supabase
    .from('board_items')
    .select('id, type, x, y, w, h, z, rotation, content')
    .eq('board_id', boardId)
    .order('z');

  const items: ItemData[] = (rows ?? []).map((r) => ({
    id: r.id,
    type: r.type as ItemType,
    x: Number(r.x), y: Number(r.y), w: Number(r.w), h: Number(r.h), z: r.z, rotation: Number(r.rotation),
    content: (r.content as Record<string, unknown>) ?? {},
  }));
  const urls = await signMedia(items);

  return (
    <div className="flex h-screen flex-col">
      <div className="flex items-center gap-3 border-b border-slate-200 px-4 py-2">
        <Link href="/brainstorm" className="text-sm text-slate-500 hover:text-sea">← Boards</Link>
        <BoardTitle id={board.id} initialTitle={board.title} />
        <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-medium capitalize text-slate-500">{board.kind}</span>
      </div>
      <div className="relative flex-1">
        <Canvas boardId={board.id} initialItems={items} initialUrls={urls} timeline={board.kind === 'storyline'} />
      </div>
    </div>
  );
}
