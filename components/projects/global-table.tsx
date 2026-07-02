// Presentational table shell for the global cross-project views. Server-safe.

export function GlobalTable({ headers, children }: { headers: string[]; children: React.ReactNode }) {
  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-slate-200 text-left text-xs uppercase tracking-wide text-slate-500">
            {headers.map((h) => (
              <th key={h} className="px-4 py-3 font-medium">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>{children}</tbody>
      </table>
    </div>
  );
}

export function GlobalEmpty({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-dashed border-slate-300 bg-white/60 px-6 py-14 text-center">
      <p className="text-sm text-slate-500">{children}</p>
    </div>
  );
}

// Normalizes the embedded project relation (PostgREST can return object or array).
export type ProjRel = { id: string; title: string } | { id: string; title: string }[] | null;
export function proj(p: ProjRel): { id: string; title: string } | null {
  if (!p) return null;
  return Array.isArray(p) ? (p[0] ?? null) : p;
}
