// Simple, consistent page heading used across the app.
// Titles render in Bebas Neue (the Seaside Media display font) and type in
// via the Typewriter, so every tab's text populates on arrival.

import { Typewriter } from '@/components/ui/typewriter';

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
        <Typewriter
          as="h1"
          text={title}
          className="font-display text-3xl tracking-wide text-ink"
          startDelay={90}
        />
        {description && (
          <Typewriter
            as="p"
            text={description}
            className="mt-1 text-sm text-slate-500"
            startDelay={280}
            cursor={false}
          />
        )}
      </div>
      {action}
    </div>
  );
}

// A gentle "not built yet" note for sections that land in a later phase.
export function ComingSoon({ phase }: { phase: string }) {
  return (
    <div className="rounded-2xl border border-dashed border-slate-300 bg-white/60 px-6 py-14 text-center">
      <Typewriter
        as="p"
        text={`This section is coming in ${phase}.`}
        className="text-sm text-slate-500"
        startDelay={360}
        cursor={false}
      />
    </div>
  );
}
