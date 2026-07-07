'use client';

// "Print / Save PDF" on the shared quote page. Hidden when actually printing.

export function PrintButton() {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className="brand-gradient rounded-xl px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-deep/20 transition hover:brightness-110 print:hidden"
    >
      Print / Save PDF
    </button>
  );
}
