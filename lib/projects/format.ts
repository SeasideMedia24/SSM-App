// Small formatting helpers shared by client panels and server pages.

export function money(n: number | null | undefined): string {
  const v = n ?? 0;
  return '$' + v.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 });
}

export function fmtDate(d: string | null | undefined): string | null {
  return d ? new Date(d + 'T00:00:00').toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) : null;
}
