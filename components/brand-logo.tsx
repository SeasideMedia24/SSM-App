// The real Seaside Media logo (assets pulled from seasidemedia.co), used on
// every client-facing surface. Two variants matched to the brand files:
//
//   "color" (light backgrounds): brand.png — the dark navy shutter emblem —
//           beside the styled wordmark + tagline.
//   "white" (dark backgrounds):  logo.svg — the full white lockup, which
//           already CONTAINS the "SEASIDE MEDIA" lettering — used alone.
//
// Plain <img> on purpose — small static brand assets in /public.

export function BrandLogo({
  variant = 'color',
  size = 'md',
  tagline = true,
  className = '',
}: {
  variant?: 'color' | 'white';
  size?: 'sm' | 'md' | 'lg';
  tagline?: boolean;
  className?: string;
}) {
  if (variant === 'white') {
    // Full white lockup (emblem + lettering baked in) for dark backgrounds.
    const h = { sm: 'h-16', md: 'h-24', lg: 'h-32' }[size];
    return (
      <div className={`flex items-center justify-center ${className}`}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/brand/logo.svg" alt="Seaside Media" className={`${h} w-auto object-contain`} />
      </div>
    );
  }

  const img = { sm: 'h-9 w-9', md: 'h-12 w-12', lg: 'h-16 w-16' }[size];
  const word = { sm: 'text-xl', md: 'text-2xl', lg: 'text-3xl' }[size];
  return (
    <div className={`flex items-center gap-3 ${className}`}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/brand/brand.png" alt="Seaside Media" className={`${img} shrink-0 object-contain`} />
      <div className="text-left">
        <p className={`font-display ${word} leading-none tracking-wide text-ink`}>SEASIDE MEDIA</p>
        {tagline && (
          <p className="mt-1 text-[10px] font-medium uppercase tracking-[0.25em] text-sea">Video Production</p>
        )}
      </div>
    </div>
  );
}
