// Owner-side view of what the client filled in on their portal: brand + tech
// fields, external links, and uploaded files (with ready-to-use signed download
// URLs generated server-side). Presentational — the project page passes data in.

import { fmtDate } from '@/lib/projects/format';

type Brand = { primaryColor?: string; secondaryColor?: string; fonts?: string; voice?: string; pastWork?: string };
type Tech = { location?: string; access?: string; interviewees?: string; notes?: string };

const brandRows: [keyof Brand, string][] = [
  ['primaryColor', 'Primary color'], ['secondaryColor', 'Secondary color'],
  ['fonts', 'Fonts'], ['voice', 'Brand voice'], ['pastWork', 'Past work they love'],
];
const techRows: [keyof Tech, string][] = [
  ['location', 'Location'], ['access', 'Parking / access'],
  ['interviewees', 'Interviewees'], ['notes', 'Other notes'],
];

export function ClientSubmission({
  brand, tech, links, assets, submittedAt,
}: {
  brand: Brand;
  tech: Tech;
  links: string[];
  assets: { filename: string; url: string | null }[];
  submittedAt: string | null;
}) {
  const rows = (defs: [string, string][], obj: Record<string, unknown>) =>
    defs.filter(([k]) => obj[k]).map(([k, label]) => (
      <div key={k} className="flex gap-2 text-sm">
        <span className="w-32 flex-shrink-0 text-slate-400">{label}</span>
        <span className="text-slate-700">{String(obj[k])}</span>
      </div>
    ));

  const brandCells = rows(brandRows as [string, string][], brand as Record<string, unknown>);
  const techCells = rows(techRows as [string, string][], tech as Record<string, unknown>);

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold text-ink">Client submission</p>
        {submittedAt && (
          <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[11px] font-medium text-emerald-700">
            Submitted {fmtDate(submittedAt.slice(0, 10))}
          </span>
        )}
      </div>

      <div className="mt-3 flex flex-col gap-1.5">
        {brandCells.length > 0 ? brandCells : <p className="text-sm text-slate-400">No brand details yet.</p>}
        {techCells}
      </div>

      {links.length > 0 && (
        <div className="mt-3">
          <p className="mb-1 text-xs font-medium uppercase tracking-wide text-slate-400">Links</p>
          <ul className="flex flex-col gap-1">
            {links.map((l, i) => (
              <li key={i}><a href={l} target="_blank" rel="noreferrer" className="text-sm text-sea hover:underline break-all">{l}</a></li>
            ))}
          </ul>
        </div>
      )}

      {assets.length > 0 && (
        <div className="mt-3">
          <p className="mb-1 text-xs font-medium uppercase tracking-wide text-slate-400">Files</p>
          <ul className="flex flex-col gap-1">
            {assets.map((a, i) => (
              <li key={i}>
                {a.url ? (
                  <a href={a.url} target="_blank" rel="noreferrer" className="text-sm text-sea hover:underline">📎 {a.filename}</a>
                ) : (
                  <span className="text-sm text-slate-500">📎 {a.filename}</span>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
