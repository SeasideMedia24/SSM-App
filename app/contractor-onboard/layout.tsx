// Public, branded wrapper for the contractor onboarding page (outside the
// signed-in app). Mirrors the client onboarding layout.

export default function ContractorOnboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="brand-gradient-animated relative min-h-screen overflow-hidden px-4 py-12">
      <div className="animate-float pointer-events-none absolute -left-24 top-10 h-72 w-72 rounded-full bg-aqua/25 blur-3xl" />
      <div
        className="animate-float pointer-events-none absolute -right-16 bottom-0 h-80 w-80 rounded-full bg-teal/25 blur-3xl"
        style={{ animationDelay: '2s' }}
      />
      <div className="relative mx-auto max-w-2xl">
        <div className="mb-7 text-center">
          <h1 className="font-display text-4xl tracking-wide text-white">SEASIDE MEDIA</h1>
          <p className="mt-1 text-sm text-white/85">Confirm your details</p>
        </div>
        {children}
      </div>
    </div>
  );
}
