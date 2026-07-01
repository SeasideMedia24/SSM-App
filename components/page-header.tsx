// Simple, consistent page heading used across the app.
// Titles render in Bebas Neue (the Seaside Media display font).

export function PageHeader({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="mb-7 flex items-start justify-between gap-4">
      <div>
        <h1 className="font-display text-3xl tracking-wide text-ink">{title}</h1>
        {description && <p className="mt-1 text-sm text-slate-500">{description}</p>}
      </div>
      {action}
    </div>
  );
}

// A gentle "not built yet" note for sections that land in a later phase.
export function ComingSoon({ phase }: { phase: string }) {
  return (
    <div className="rounded-2xl border border-dashed border-slate-300 bg-white/60 px-6 py-14 text-center">
      <p className="text-sm text-slate-500">
        This section is coming in <span className="font-medium text-sea">{phase}</span>.
      </p>
    </div>
  );
}
