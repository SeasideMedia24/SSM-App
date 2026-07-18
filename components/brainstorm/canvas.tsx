'use client';

// The infinite pan/zoom canvas. Items live in world coordinates; the viewport is
// a translate+scale transform. Pointer-drag on the background pans; the wheel
// zooms around the cursor; dragging an item moves it (persisted on release).
// Deliberately unlike the rest of the app — an open Milanote-style surface.

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import {
  addItem, updateItem, deleteItem, requestMediaUpload, mediaUrl,
  type ItemType, type ItemPatch,
} from '@/app/(canvas)/brainstorm/actions';
import type { Json } from '@/types/database.types';
import { zoomAround, pan, viewportCenterWorld, type Viewport } from '@/lib/brainstorm/viewport';
import { CanvasItem, type ItemData } from './canvas-item';

type Interaction =
  | { mode: 'none' }
  | { mode: 'pan'; sx: number; sy: number; vp: Viewport }
  | { mode: 'move'; id: string; sx: number; sy: number; ix: number; iy: number }
  | { mode: 'resize'; id: string; sx: number; sy: number; iw: number; ih: number };

const NEW_NOTE = { w: 200, h: 150 };
const NEW_LINK = { w: 260, h: 150 };
const NEW_MEDIA = { w: 280, h: 200 };

export function Canvas({
  boardId, initialItems, initialUrls, timeline = false, compact = false,
}: {
  boardId: string;
  initialItems: ItemData[];
  initialUrls: Record<string, string>; // storage_path → signed url
  timeline?: boolean;
  compact?: boolean;
}) {
  const [items, setItems] = useState<ItemData[]>(initialItems);
  const [urls, setUrls] = useState<Record<string, string>>(initialUrls);
  const [vp, setVp] = useState<Viewport>({ x: 0, y: 0, scale: 1 });
  const [selected, setSelected] = useState<string | null>(null);
  const viewportRef = useRef<HTMLDivElement>(null);
  const interaction = useRef<Interaction>({ mode: 'none' });
  const fileInput = useRef<HTMLInputElement>(null);
  const fileKind = useRef<'image' | 'file'>('image');

  const patchLocal = (id: string, patch: Partial<ItemData>) =>
    setItems((prev) => prev.map((it) => (it.id === id ? { ...it, ...patch } : it)));

  const nextZ = () => items.reduce((m, it) => Math.max(m, it.z), 0) + 1;

  // ── Add items ──────────────────────────────────────────────────────────────
  const rect = () => viewportRef.current?.getBoundingClientRect();

  const centerWorld = () => {
    const r = rect();
    return viewportCenterWorld(vp, r?.width ?? 800, r?.height ?? 600);
  };

  async function add(type: ItemType, content: Record<string, unknown>, size: { w: number; h: number }) {
    const c = centerWorld();
    const x = c.x - size.w / 2;
    const y = c.y - size.h / 2;
    const z = nextZ();
    // Optimistic: show it, then reconcile the real id.
    const tempId = `tmp-${crypto.randomUUID()}`;
    setItems((prev) => [...prev, { id: tempId, type, x, y, w: size.w, h: size.h, z, rotation: 0, content }]);
    try {
      const { id } = await addItem(boardId, type, x, y, content as unknown as Json, size);
      setItems((prev) => prev.map((it) => (it.id === tempId ? { ...it, id } : it)));
      setSelected(id);
    } catch {
      setItems((prev) => prev.filter((it) => it.id !== tempId)); // roll back
    }
  }

  const addNote = () => add('note', { text: '', color: 'yellow' }, NEW_NOTE);
  const addLink = () => add('link', { url: '', title: '' }, NEW_LINK);

  function pickFile(kind: 'image' | 'file') {
    fileKind.current = kind;
    if (fileInput.current) {
      fileInput.current.accept = kind === 'image' ? 'image/*' : '';
      fileInput.current.click();
    }
  }

  async function onFileChosen(files: FileList | null) {
    if (!files || files.length === 0) return;
    const kind = fileKind.current;
    const supabase = createClient();
    for (const file of Array.from(files)) {
      const ticket = await requestMediaUpload(boardId, file.name);
      if (!ticket.ok) continue;
      const up = await supabase.storage.from('brainstorm-media').uploadToSignedUrl(ticket.path, ticket.token, file);
      if (up.error) continue;
      const url = await mediaUrl(ticket.path);
      if (url) setUrls((m) => ({ ...m, [ticket.path]: url }));
      await add(kind, { storage_path: ticket.path, filename: file.name }, NEW_MEDIA);
    }
    if (fileInput.current) fileInput.current.value = '';
  }

  // ── Item edit / delete / z ───────────────────────────────────────────────────
  const commitPatch = (id: string, patch: Partial<ItemData>) => {
    patchLocal(id, patch);
    void updateItem(id, patch as unknown as ItemPatch);
  };
  function select(id: string) {
    setSelected(id);
    const it = items.find((i) => i.id === id);
    if (it && it.z < nextZ() - 1) commitPatch(id, { z: nextZ() });
  }
  function removeSelected() {
    if (!selected) return;
    const id = selected;
    setItems((prev) => prev.filter((it) => it.id !== id));
    setSelected(null);
    void deleteItem(id);
  }

  // ── Pointer: pan / move / resize ─────────────────────────────────────────────
  const onItemPointerDown = (e: React.PointerEvent, id: string, mode: 'move' | 'resize') => {
    e.stopPropagation();
    select(id);
    const it = items.find((i) => i.id === id);
    if (!it) return;
    viewportRef.current?.setPointerCapture(e.pointerId);
    interaction.current =
      mode === 'move'
        ? { mode: 'move', id, sx: e.clientX, sy: e.clientY, ix: it.x, iy: it.y }
        : { mode: 'resize', id, sx: e.clientX, sy: e.clientY, iw: it.w, ih: it.h };
  };

  const onBackgroundPointerDown = (e: React.PointerEvent) => {
    if (e.button !== 0) return;
    setSelected(null);
    viewportRef.current?.setPointerCapture(e.pointerId);
    interaction.current = { mode: 'pan', sx: e.clientX, sy: e.clientY, vp };
  };

  const onPointerMove = (e: React.PointerEvent) => {
    const it = interaction.current;
    if (it.mode === 'pan') {
      setVp(pan(it.vp, e.clientX - it.sx, e.clientY - it.sy));
    } else if (it.mode === 'move') {
      const dx = (e.clientX - it.sx) / vp.scale;
      const dy = (e.clientY - it.sy) / vp.scale;
      patchLocal(it.id, { x: it.ix + dx, y: it.iy + dy });
    } else if (it.mode === 'resize') {
      const dw = (e.clientX - it.sx) / vp.scale;
      const dh = (e.clientY - it.sy) / vp.scale;
      patchLocal(it.id, { w: Math.max(80, it.iw + dw), h: Math.max(60, it.ih + dh) });
    }
  };

  const onPointerUp = (e: React.PointerEvent) => {
    const it = interaction.current;
    if (it.mode === 'move') {
      const cur = items.find((i) => i.id === it.id);
      if (cur) void updateItem(it.id, { x: cur.x, y: cur.y });
    } else if (it.mode === 'resize') {
      const cur = items.find((i) => i.id === it.id);
      if (cur) void updateItem(it.id, { w: cur.w, h: cur.h });
    }
    interaction.current = { mode: 'none' };
    viewportRef.current?.releasePointerCapture(e.pointerId);
  };

  // Wheel zoom (anchored at cursor). Non-passive so we can preventDefault.
  const onWheel = useCallback((e: WheelEvent) => {
    e.preventDefault();
    const r = viewportRef.current?.getBoundingClientRect();
    if (!r) return;
    const factor = e.deltaY < 0 ? 1.1 : 1 / 1.1;
    setVp((cur) => zoomAround(cur, e.clientX - r.left, e.clientY - r.top, factor));
  }, []);

  useEffect(() => {
    const el = viewportRef.current;
    if (!el) return;
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  }, [onWheel]);

  const zoomBy = (factor: number) => {
    const r = rect();
    setVp((cur) => zoomAround(cur, (r?.width ?? 800) / 2, (r?.height ?? 600) / 2, factor));
  };

  return (
    <div className="relative h-full w-full overflow-hidden">
      {/* Toolbar */}
      <div className={`absolute z-20 flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white/95 p-1.5 shadow-lg backdrop-blur ${compact ? 'left-2 top-2' : 'left-4 top-4'}`}>
        {!compact && (
          <Link href="/brainstorm" className="rounded-lg px-2.5 py-1.5 text-sm font-medium text-slate-500 hover:bg-slate-100" title="Back to boards">←</Link>
        )}
        <ToolBtn onClick={addNote} label="Note" />
        <ToolBtn onClick={() => pickFile('image')} label="Image" />
        <ToolBtn onClick={() => pickFile('file')} label="File" />
        <ToolBtn onClick={addLink} label="Link" />
        <span className="mx-1 h-5 w-px bg-slate-200" />
        <ToolBtn onClick={() => zoomBy(1 / 1.2)} label="−" />
        <span className="w-10 text-center text-xs tabular-nums text-slate-500">{Math.round(vp.scale * 100)}%</span>
        <ToolBtn onClick={() => zoomBy(1.2)} label="+" />
        {selected && <ToolBtn onClick={removeSelected} label="Delete" danger />}
      </div>

      <input ref={fileInput} type="file" multiple hidden onChange={(e) => onFileChosen(e.target.files)} />

      {/* Viewport */}
      <div
        ref={viewportRef}
        onPointerDown={onBackgroundPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        className="h-full w-full cursor-grab touch-none active:cursor-grabbing"
        style={{
          backgroundColor: '#ffffff',
          backgroundImage: 'radial-gradient(circle, #d5dee7 1.2px, transparent 1.2px)',
          backgroundSize: `${24 * vp.scale}px ${24 * vp.scale}px`,
          backgroundPosition: `${vp.x}px ${vp.y}px`,
        }}
      >
        {timeline && <TimelineOverlay vp={vp} />}
        {/* World */}
        <div className="absolute left-0 top-0 origin-top-left" style={{ transform: `translate(${vp.x}px, ${vp.y}px) scale(${vp.scale})` }}>
          {items.map((it) => (
            <CanvasItem
              key={it.id}
              item={it}
              url={typeof it.content.storage_path === 'string' ? urls[it.content.storage_path] ?? null : null}
              selected={selected === it.id}
              onPointerDownMove={(e) => onItemPointerDown(e, it.id, 'move')}
              onPointerDownResize={(e) => onItemPointerDown(e, it.id, 'resize')}
              onChange={(patch) => commitPatch(it.id, patch)}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

function ToolBtn({ onClick, label, danger }: { onClick: () => void; label: string; danger?: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-lg px-2.5 py-1.5 text-sm font-medium transition-colors ${danger ? 'text-red-500 hover:bg-red-50' : 'text-slate-600 hover:bg-slate-100'}`}
    >
      {label}
    </button>
  );
}

// A light time ruler + lane guides for storyline boards (world-space, so it
// pans/zooms with the content).
function TimelineOverlay({ vp }: { vp: Viewport }) {
  const marks = Array.from({ length: 24 }, (_, i) => i);
  return (
    <div className="pointer-events-none absolute left-0 top-0" style={{ transform: `translate(${vp.x}px, ${vp.y}px) scale(${vp.scale})` }}>
      <div className="absolute left-0 top-0 flex" style={{ top: -10 }}>
        {marks.map((i) => (
          <div key={i} className="relative" style={{ width: 320 }}>
            <div className="absolute h-[2000px] w-px bg-slate-200/70" />
            <span className="absolute -top-4 left-1 text-[10px] font-medium uppercase tracking-wide text-slate-400">Scene {i + 1}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
