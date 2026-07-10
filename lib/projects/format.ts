// Small formatting helpers shared by client panels and server pages.

export function money(n: number | null | undefined): string {
  const v = n ?? 0;
  return '$' + v.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 });
}

export function fmtDate(d: string | null | undefined): string | null {
  return d ? new Date(d + 'T00:00:00').toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) : null;
}

// Compact summary of a contractor's set rates, e.g. "$500/day · $65/hr".
export function contractorRatesSummary(r: {
  rate_full?: number | null;
  rate_half?: number | null;
  rate_hourly?: number | null;
}): string {
  const parts: string[] = [];
  if (r.rate_full != null) parts.push(`${money(r.rate_full)}/day`);
  if (r.rate_half != null) parts.push(`${money(r.rate_half)}/half`);
  if (r.rate_hourly != null) parts.push(`${money(r.rate_hourly)}/hr`);
  return parts.length ? parts.join(' · ') : '—';
}
