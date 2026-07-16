'use client';

// The brand & asset collection step in the client portal. Structured brand +
// logistics fields, paste-your-own share links for big files, and direct-to-
// Storage uploads for logos/docs (signed upload URL → browser PUTs the file,
// bypassing the serverless body limit). Saves as the client works; Submit tells
// the owner it's ready.

import { useState, useTransition } from 'react';
import { createClient } from '@/lib/supabase/client';
import {
  requestAssetUpload, recordUploadedAsset, removeAsset, saveIntake, submitIntake,
} from '@/app/portal/[token]/actions';

const field =
  'w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-ink outline-none transition-shadow focus:border-teal focus:ring-2 focus:ring-aqua/40';
const MAX_MB = 25;

export type Brand = { primaryColor?: string; secondaryColor?: string; fonts?: string; voice?: string; pastWork?: string };
export type Tech = { location?: string; access?: string; interviewees?: string; notes?: string };
export type PortalAsset = { id: string; filename: string };

export function BrandAssets({
  token, initialBrand, initialTech, initialLinks, initialAssets, submittedAt,
}: {
  token: string;
  initialBrand: Brand;
  initialTech: Tech;
  initialLinks: string[];
  initialAssets: PortalAsset[];
  submittedAt: string | null;
}) {
  const [brand, setBrand] = useState<Brand>(initialBrand);
  const [tech, setTech] = useState<Tech>(initialTech);
  const [links, setLinks] = useState<string[]>(initialLinks.length ? initialLinks : ['']);
  const [assets, setAssets] = useState<PortalAsset[]>(initialAssets);
  const [submitted, setSubmitted] = useState(!!submittedAt);
  const [uploading, setUploading] = useState(false);
  const [note, setNote] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  const setBrandField = (k: keyof Brand, v: string) => setBrand((b) => ({ ...b, [k]: v }));
  const setTechField = (k: keyof Tech, v: string) => setTech((t) => ({ ...t, [k]: v }));

  const cleanLinks = () => links.map((l) => l.trim()).filter(Boolean);

  function save(alsoSubmit = false) {
    start(async () => {
      setError(null); setNote(null);
      const res = await saveIntake(token, { brand, tech, links: cleanLinks() });
      if (!res.ok) { setError(res.error); return; }
      if (alsoSubmit) {
        const sub = await submitIntake(token);
        if (!sub.ok) { setError(sub.error); return; }
        setSubmitted(true);
      }
      setNote(alsoSubmit ? 'Sent to Seaside Media — thank you!' : 'Saved.');
    });
  }

  async function onFiles(files: FileList | null) {
    if (!files || files.length === 0) return;
    setError(null); setNote(null); setUploading(true);
    const supabase = createClient();
    try {
      for (const file of Array.from(files)) {
        if (file.size > MAX_MB * 1024 * 1024) {
          setError(`${file.name} is over ${MAX_MB}MB — please share it via a link below instead.`);
          continue;
        }
        const ticket = await requestAssetUpload(token, file.name);
        if (!ticket.ok) { setError(ticket.error); continue; }
        const up = await supabase.storage.from('client-assets').uploadToSignedUrl(ticket.path, ticket.token, file);
        if (up.error) { setError(`Couldn’t upload ${file.name}.`); continue; }
        const rec = await recordUploadedAsset(token, { path: ticket.path, filename: file.name, size: file.size, contentType: file.type || null });
        if (!rec.ok) { setError(rec.error); continue; }
        setAssets((a) => [...a, { id: rec.id, filename: file.name }]);
      }
    } finally {
      setUploading(false);
    }
  }

  function remove(id: string) {
    start(async () => {
      const res = await removeAsset(token, id);
      if (res.ok) setAssets((a) => a.filter((x) => x.id !== id));
      else setError(res.error);
    });
  }

  return (
    <div className="flex flex-col gap-5">
      {submitted && (
        <p className="rounded-xl bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
          You’ve shared your brand details — thank you! You can still update anything below and save again.
        </p>
      )}

      {/* Brand */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Labeled label="Primary brand color (hex)"><input value={brand.primaryColor ?? ''} onChange={(e) => setBrandField('primaryColor', e.target.value)} placeholder="#0EA5A4" className={field} /></Labeled>
        <Labeled label="Secondary color (hex)"><input value={brand.secondaryColor ?? ''} onChange={(e) => setBrandField('secondaryColor', e.target.value)} placeholder="#123B4F" className={field} /></Labeled>
        <Labeled label="Fonts"><input value={brand.fonts ?? ''} onChange={(e) => setBrandField('fonts', e.target.value)} placeholder="e.g. Poppins, Georgia" className={field} /></Labeled>
        <Labeled label="Brand voice / vibe"><input value={brand.voice ?? ''} onChange={(e) => setBrandField('voice', e.target.value)} placeholder="e.g. warm, confident, playful" className={field} /></Labeled>
      </div>
      <Labeled label="Links to past work you love (yours or others)">
        <textarea rows={2} value={brand.pastWork ?? ''} onChange={(e) => setBrandField('pastWork', e.target.value)} className={field} />
      </Labeled>

      {/* Upload */}
      <div>
        <p className="text-xs font-medium text-slate-500">Logos & brand files</p>
        <p className="mb-2 text-xs text-slate-400">Up to {MAX_MB}MB each. Big videos? Use a link below.</p>
        <input type="file" multiple onChange={(e) => onFiles(e.target.files)} disabled={uploading} className="block w-full text-sm text-slate-600 file:mr-3 file:rounded-lg file:border-0 file:bg-slate-900 file:px-3 file:py-1.5 file:text-xs file:font-medium file:text-white hover:file:bg-slate-700" />
        {uploading && <p className="mt-1 text-xs text-slate-400">Uploading…</p>}
        {assets.length > 0 && (
          <ul className="mt-2 flex flex-col gap-1">
            {assets.map((a) => (
              <li key={a.id} className="flex items-center justify-between rounded-lg border border-slate-200 px-3 py-1.5 text-sm text-slate-700">
                <span className="truncate">📎 {a.filename}</span>
                <button type="button" onClick={() => remove(a.id)} disabled={pending} className="text-xs text-slate-400 hover:text-red-600">Remove</button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* External links */}
      <div>
        <p className="text-xs font-medium text-slate-500">Share links (Google Drive, Dropbox, Frame.io…)</p>
        <div className="mt-1.5 flex flex-col gap-2">
          {links.map((l, i) => (
            <input
              key={i}
              value={l}
              onChange={(e) => setLinks((arr) => arr.map((x, j) => (j === i ? e.target.value : x)))}
              placeholder="https://…"
              className={field}
            />
          ))}
          <button type="button" onClick={() => setLinks((a) => [...a, ''])} className="self-start text-xs font-medium text-sea hover:underline">+ Add another link</button>
        </div>
      </div>

      {/* Tech / logistics */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Labeled label="Filming location(s)"><input value={tech.location ?? ''} onChange={(e) => setTechField('location', e.target.value)} className={field} /></Labeled>
        <Labeled label="Parking / building access"><input value={tech.access ?? ''} onChange={(e) => setTechField('access', e.target.value)} className={field} /></Labeled>
        <Labeled label="On-camera interviewees"><input value={tech.interviewees ?? ''} onChange={(e) => setTechField('interviewees', e.target.value)} className={field} /></Labeled>
        <Labeled label="Anything else we should know"><input value={tech.notes ?? ''} onChange={(e) => setTechField('notes', e.target.value)} className={field} /></Labeled>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <button type="button" onClick={() => save(false)} disabled={pending || uploading} className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 hover:border-teal hover:text-sea disabled:opacity-60">
          {pending ? 'Saving…' : 'Save'}
        </button>
        <button type="button" onClick={() => save(true)} disabled={pending || uploading} className="brand-gradient rounded-lg px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:brightness-110 disabled:opacity-60">
          Send to Seaside Media
        </button>
        {note && <span className="text-sm text-emerald-700">{note}</span>}
        {error && <span className="text-sm text-red-600">{error}</span>}
      </div>
    </div>
  );
}

function Labeled({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1 text-xs font-medium text-slate-500">
      {label}
      {children}
    </label>
  );
}
