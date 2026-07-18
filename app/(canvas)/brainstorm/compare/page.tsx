import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { Canvas } from '@/components/brainstorm/canvas';
import type { ItemData } from '@/components/brainstorm/canvas-item';
import type { ItemType } from '@/app/(canvas)/brainstorm/actions';

async function signMedia(items: { content: Record<string, unknown> }[]): Promise<Record<string, string>> {
  const paths = items.map((i) => i.content.storage_path).filter((p): p is string => typeof p === 'string');
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

// Up to three boards side by side, each a fully interactive canvas column.
export default async function ComparePage({ searchParams }: { searchParams: Promise<{ ids?: string }> }) {
  const { ids } = await searchParams;
  const idList = (ids ?? '').split(',').map((s) => s.trim()).filter(Boolean).slice(0, 3);
  if (idList.length === 0) redirect('/brainstorm');

  const supabase = await createClient();
  const loaded = await Promise.all(
    idList.map(async (id) => {
      const { data: board } = await supabase.from('boards').select('id, kind, title').eq('id', id).maybeSingle();
      if (!board) return null;
      const { data: rows } = await supabase
        .from('board_items')
        .select('id, type, x, y, w, h, z, rotation, content')
        .eq('board_id', id)
        .order('z');
      const items: ItemData[] = (rows ?? []).map((r) => ({
        id: r.id, type: r.type as ItemType,
        x: Number(r.x), y: Number(r.y), w: Number(r.w), h: Number(r.h), z: r.z, rotation: Number(r.rotation),
        content: (r.content as Record<string, unknown>) ?? {},
      }));
      return { board, items, urls: await signMedia(items) };
    }),
  );
  const boards = loaded.filter((b): b is NonNullable<typeof b> => b !== null);
  if (boards.length === 0) redirect('/brainstorm');

  return (
    <div className="flex h-screen flex-col">
      <div className="flex items-center gap-3 border-b border-slate-200 px-4 py-2">
        <Link href="/brainstorm" className="text-sm text-slate-500 hover:text-sea">← Boards</Link>
        <span className="text-sm font-semibold text-ink">Comparing {boards.length} board{boards.length === 1 ? '' : 's'}</span>
      </div>
      <div className="flex flex-1 divide-x divide-slate-200">
        {boards.map(({ board, items, urls }) => (
          <div key={board.id} className="flex min-w-0 flex-1 flex-col">
            <div className="flex items-center gap-2 border-b border-slate-100 px-3 py-1.5">
              <Link href={`/brainstorm/${board.id}`} className="truncate text-xs font-semibold text-slate-700 hover:text-sea">{board.title}</Link>
              <span className="rounded-full bg-slate-100 px-1.5 py-0.5 text-[10px] font-medium capitalize text-slate-500">{board.kind}</span>
            </div>
            <div className="relative flex-1">
              <Canvas boardId={board.id} initialItems={items} initialUrls={urls} timeline={board.kind === 'storyline'} compact />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
