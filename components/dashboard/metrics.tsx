'use client';

// The dashboard KPI row. Each metric is a button; clicking it expands an inline
// panel that lists exactly what makes up that number (the "sub-menu" the owner
// asked for). Data is computed on the server and passed in ready to render.

import Link from 'next/link';
import { useState } from 'react';

export type MetricItem = {
  id: string;
  label: string;
  href?: string; // when set, the label links here (e.g. straight to a project)
  kind?: string; // small tag, e.g. the project status or "Task"
  project?: { id: string; title: string } | null;
  projectView?: string; // ?view= param when linking to the project
  date?: string | null; // pre-formatted
};

export type MetricDef = {
  key: string;
  label: string;
  value: number;
  tone?: 'warn';
  items: MetricItem[];
  emptyText: string;
};

export function DashboardMetrics({ metrics }: { metrics: MetricDef[] }) {
  const [openKey, setOpenKey] = useState<string | null>(null);
  const open = metrics.find((m) => m.key === openKey) ?? null;

  return (
    <div className="mb-6">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {metrics.map((m) => {
          const active = m.key === openKey;
          return (
            <button
              key={m.key}
              type="button"
              onClick={() => setOpenKey((k) => (k === m.key ? null : m.key))}
              aria-expanded={active}
              className={`rounded-2xl border p-4 text-left shadow-sm transition hover:border-teal/60 ${
                active ? 'border-teal ring-2 ring-aqua/30' : 'border-slate-200'
              } bg-white`}
            >
              <p className={`text-3xl font-semibold ${m.tone === 'warn' && m.value > 0 ? 'text-red-600' : 'text-ink'}`}>
                {m.value}
              </p>
              <p className="text-xs text-slate-500">{m.label}</p>
            </button>
          );
        })}
      </div>

      {open && (
        <div className="mt-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="mb-1 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-slate-900">{open.label}</h3>
            <button type="button" onClick={() => setOpenKey(null)} className="text-xs text-slate-400 hover:text-slate-700">
              Close
            </button>
          </div>
          {open.items.length === 0 ? (
            <p className="py-2 text-sm text-slate-400">{open.emptyText}</p>
          ) : (
            <ul className="divide-y divide-slate-100">
              {open.items.map((it) => (
                <li key={it.id} className="flex items-center gap-3 py-2 text-sm">
                  {it.kind && (
                    <span className="shrink-0 rounded-full bg-slate-100 px-2 py-0.5 text-[11px] text-slate-500">{it.kind}</span>
                  )}
                  {it.href ? (
                    <Link href={it.href} className="text-ink hover:text-sea hover:underline">{it.label}</Link>
                  ) : (
                    <span className="text-ink">{it.label}</span>
                  )}
                  {it.project && (
                    <Link
                      href={`/projects/${it.project.id}${it.projectView ? `?view=${it.projectView}` : ''}`}
                      className="text-xs text-slate-500 hover:text-sea hover:underline"
                    >
                      {it.project.title}
                    </Link>
                  )}
                  {it.date && <span className="ml-auto shrink-0 text-[11px] text-slate-400">{it.date}</span>}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
