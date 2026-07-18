'use client';

// One item on the canvas. A header strip is the drag handle (so the body stays
// interactive — typing in notes, pasting link URLs, playing embeds). A corner
// handle resizes. Rendering branches by type.

import { useState } from 'react';
import { parseEmbed, embedSrc, hostLabel } from '@/lib/brainstorm/embed';
import type { ItemType } from '@/app/(canvas)/brainstorm/actions';

export type ItemData = {
  id: string;
  type: ItemType;
  x: number; y: number; w: number; h: number; z: number; rotation: number;
  content: Record<string, unknown>;
};

const NOTE_COLORS: Record<string, { body: string; head: string }> = {
  yellow: { body: 'bg-amber-50', head: 'bg-amber-200/70' },
  blue: { body: 'bg-sky-50', head: 'bg-sky-200/70' },
  green: { body: 'bg-emerald-50', head: 'bg-emerald-200/70' },
  pink: { body: 'bg-pink-50', head: 'bg-pink-200/70' },
};

const stop = (e: React.PointerEvent) => e.stopPropagation();

export function CanvasItem({
  item, url, selected, onPointerDownMove, onPointerDownResize, onChange,
}: {
  item: ItemData;
  url: string | null;
  selected: boolean;
  onPointerDownMove: (e: React.PointerEvent) => void;
  onPointerDownResize: (e: React.PointerEvent) => void;
  onChange: (patch: Partial<ItemData>) => void;
}) {
  const setContent = (patch: Record<string, unknown>) => onChange({ content: { ...item.content, ...patch } });
  const color = typeof item.content.color === 'string' ? item.content.color : 'yellow';
  const headTint = item.type === 'note' ? NOTE_COLORS[color]?.head ?? 'bg-amber-200/70' : 'bg-slate-100';

  return (
    <div
      className={`absolute overflow-hidden rounded-xl border bg-white shadow-sm ${selected ? 'border-teal ring-2 ring-teal/30' : 'border-slate-200'}`}
      style={{ left: item.x, top: item.y, width: item.w, height: item.h, zIndex: item.z, transform: item.rotation ? `rotate(${item.rotation}deg)` : undefined }}
    >
      {/* Drag handle */}
      <div onPointerDown={onPointerDownMove} className={`flex h-6 cursor-grab items-center gap-1 px-2 active:cursor-grabbing ${headTint}`}>
        {item.type === 'note' && selected && (
          <span className="flex gap-1" onPointerDown={stop}>
            {Object.keys(NOTE_COLORS).map((c) => (
              <button key={c} type="button" onClick={() => setContent({ color: c })} className={`h-3 w-3 rounded-full ring-1 ring-black/10 ${NOTE_COLORS[c].head}`} aria-label={`${c} note`} />
            ))}
          </span>
        )}
      </div>

      {/* Body */}
      <div className="h-[calc(100%-1.5rem)] w-full">
        {item.type === 'note' && (
          <textarea
            value={String(item.content.text ?? '')}
            onChange={(e) => setContent({ text: e.target.value })}
            onPointerDown={stop}
            placeholder="Type…"
            className={`h-full w-full resize-none border-0 p-2.5 text-sm text-slate-800 outline-none ${NOTE_COLORS[color]?.body ?? 'bg-amber-50'}`}
          />
        )}

        {item.type === 'image' && (
          url ? <img src={url} alt="" draggable={false} className="h-full w-full object-cover" />
              : <div className="flex h-full items-center justify-center text-xs text-slate-400">Uploading…</div>
        )}

        {item.type === 'file' && (
          <div className="flex h-full flex-col items-center justify-center gap-2 p-3 text-center" onPointerDown={stop}>
            <span className="text-2xl">📄</span>
            <span className="line-clamp-2 text-xs text-slate-600">{String(item.content.filename ?? 'File')}</span>
            {url && <a href={url} target="_blank" rel="noreferrer" className="text-xs font-medium text-sea hover:underline">Download</a>}
          </div>
        )}

        {item.type === 'link' && <LinkBody url={String(item.content.url ?? '')} onSet={(u) => setContent({ url: u })} />}
        {item.type === 'embed' && <LinkBody url={String(item.content.url ?? '')} onSet={(u) => setContent({ url: u })} />}
      </div>

      {/* Resize handle */}
      <div
        onPointerDown={onPointerDownResize}
        className="absolute bottom-0 right-0 h-4 w-4 cursor-nwse-resize"
        style={{ background: 'linear-gradient(135deg, transparent 50%, #94a3b8 50%)' }}
      />
    </div>
  );
}

function LinkBody({ url, onSet }: { url: string; onSet: (u: string) => void }) {
  const [editing, setEditing] = useState(!url);
  const [draft, setDraft] = useState(url);

  if (editing) {
    return (
      <form
        onPointerDown={(e) => e.stopPropagation()}
        onSubmit={(e) => { e.preventDefault(); onSet(draft.trim()); setEditing(false); }}
        className="flex h-full flex-col gap-2 p-2.5"
      >
        <input
          autoFocus value={draft} onChange={(e) => setDraft(e.target.value)}
          placeholder="Paste a YouTube, Vimeo, Pinterest, or any link…"
          className="w-full rounded-lg border border-slate-200 px-2 py-1.5 text-xs outline-none focus:border-teal"
        />
        <button type="submit" className="self-start rounded-lg bg-slate-900 px-2.5 py-1 text-xs font-medium text-white hover:bg-slate-700">Add</button>
      </form>
    );
  }

  const info = parseEmbed(url);
  const src = embedSrc(info);
  if (src) {
    return <iframe src={src} title="embed" className="h-full w-full" allow="autoplay; encrypted-media; picture-in-picture" allowFullScreen onPointerDown={(e) => e.stopPropagation()} />;
  }
  return (
    <a
      href={url} target="_blank" rel="noreferrer" onPointerDown={(e) => e.stopPropagation()}
      className="flex h-full flex-col justify-center gap-1 p-3 hover:bg-slate-50"
    >
      <span className="text-lg">🔗</span>
      <span className="truncate text-xs font-medium text-sea">{hostLabel(url)}</span>
      <span className="line-clamp-2 break-all text-[11px] text-slate-400">{url}</span>
    </a>
  );
}
