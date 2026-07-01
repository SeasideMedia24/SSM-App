// Simple, consistent page heading used across the app.

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
    <div className="mb-6 flex items-start justify-between gap-4">
      <div>
        <h1 className="text-xl font-semibold text-slate-900">{title}</h1>
        {description && <p className="mt-1 text-sm text-slate-500">{description}</p>}
      </div>
      {action}
    </div>
  );
}

// A gentle "not built yet" note for sections that land in a later phase.
export function ComingSoon({ phase }: { phase: string }) {
  return (
    <div className="rounded-lg border border-dashed border-slate-300 bg-white px-6 py-12 text-center">
      <p className="text-sm text-slate-500">
        This section is coming in <span className="font-medium text-slate-700">{phase}</span>.
      </p>
    </div>
  );
}
