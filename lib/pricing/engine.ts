// The pricing engine — a faithful port of the "Price Calculator - SSM" Google
// Sheet's formulas. Pure functions only (no imports, no server/browser deps):
// the client uses it for live totals as you click, and the server action
// re-runs the SAME math against rates fetched from the database, so the stored
// numbers never trust the browser (CLAUDE.md rule #3).
//
// Sheet logic recap:
//   production = (Σ crew costs) × markup + rental tier (rental NOT marked up)
//   pre        = pageMinutes × (Σ selected pre services)  × markup
//   post       = [pageMinutes × (Σ post services) + aboutUsFee + shorts×shortRate] × markup
//   overall    = production + pre + post + travel   (travel NOT marked up)
//   total      = overall × (1 − Σ selected discount %)   ← discounts stack

export type RoleRates = {
  id: string;
  name: string;
  kind: 'standard' | 'photographer' | 'drone';
  day_rate: number;
  half_rate: number;
  hour_rate: number;
  has_quantity: boolean;
};

export type PageService = {
  id: string;
  name: string;
  phase: 'pre' | 'post';
  page_rate: number;
};

export type PricingConfig = Record<string, number>; // keyed by pricing_config.key

export type RentalTier = 'none' | 'low' | 'medium_low' | 'medium' | 'high';
export type PhotographerBooking = 'day' | 'half' | 'hourly';
export type DiscountKey = 'referral' | 'first_time' | 'military';

// Everything the owner picks in the calculator. Saved to quotes.calculator_state.
export type CalculatorSelections = {
  pageMinutes: number;
  fullDays: number;
  halfDays: number;
  hours: number;
  droneHours: number;
  shorts: number;
  travel: number;
  rental: RentalTier;
  aboutUs: boolean;
  // roleId → selection. quantity ≥1; booking only meaningful for photographers.
  roles: Record<string, { quantity: number; booking?: PhotographerBooking }>;
  serviceIds: string[]; // selected pre/post page-service ids
  discounts: DiscountKey[];
};

export type QuoteLine = { label: string; quantity: number; unit: string | null; rate: number; amount: number };

export type QuoteBreakdown = {
  lines: QuoteLine[];
  production: number;
  pre: number;
  post: number;
  travel: number;
  overall: number; // pre-discount ("Overall Total" on the sheet)
  discountPct: number; // 0..1
  total: number; // after discounts ("Discount Total" on the sheet)
};

const r2 = (n: number) => Math.round(n * 100) / 100;

export function emptySelections(): CalculatorSelections {
  return {
    pageMinutes: 0, fullDays: 0, halfDays: 0, hours: 0, droneHours: 0, shorts: 0,
    travel: 0, rental: 'none', aboutUs: false, roles: {}, serviceIds: [], discounts: [],
  };
}

// Cost of one crew role BEFORE markup (the sheet's C10..C13 pieces).
function roleCost(role: RoleRates, sel: { quantity: number; booking?: PhotographerBooking }, s: CalculatorSelections): number {
  const qty = role.has_quantity ? Math.max(1, sel.quantity) : 1;
  if (role.kind === 'drone') return s.droneHours * role.hour_rate * qty;
  if (role.kind === 'photographer') {
    const booking = sel.booking ?? 'half';
    const rate = booking === 'day' ? role.day_rate : booking === 'hourly' ? role.hour_rate : role.half_rate;
    return rate * qty;
  }
  return (s.fullDays * role.day_rate + s.halfDays * role.half_rate + s.hours * role.hour_rate) * qty;
}

// Human label for the quote line, e.g. "DP — 2 days, 1 half day".
function roleLineLabel(role: RoleRates, sel: { quantity: number; booking?: PhotographerBooking }, s: CalculatorSelections): string {
  const qty = role.has_quantity && sel.quantity > 1 ? ` ×${sel.quantity}` : '';
  if (role.kind === 'drone') return `${role.name}${qty} — ${s.droneHours} drone hr${s.droneHours === 1 ? '' : 's'}`;
  if (role.kind === 'photographer') {
    const b = sel.booking ?? 'half';
    return `${role.name}${qty} — ${b === 'day' ? 'full day' : b === 'hourly' ? 'hourly' : 'half day'}`;
  }
  const parts = [
    s.fullDays > 0 ? `${s.fullDays} day${s.fullDays === 1 ? '' : 's'}` : null,
    s.halfDays > 0 ? `${s.halfDays} half day${s.halfDays === 1 ? '' : 's'}` : null,
    s.hours > 0 ? `${s.hours} hr${s.hours === 1 ? '' : 's'}` : null,
  ].filter(Boolean);
  return `${role.name}${qty} — ${parts.join(', ') || 'no time set'}`;
}

export const RENTAL_LABELS: Record<Exclude<RentalTier, 'none'>, string> = {
  low: 'Low', medium_low: 'Medium Low', medium: 'Medium', high: 'High',
};

export const DISCOUNT_LABELS: Record<DiscountKey, string> = {
  referral: 'Referral', first_time: 'First Time', military: 'Military/Veteran',
};

export function computeQuote(
  s: CalculatorSelections,
  roles: RoleRates[],
  services: PageService[],
  config: PricingConfig,
): QuoteBreakdown {
  const markup = config['markup'] ?? 2.5;
  const lines: QuoteLine[] = [];

  // ---- Production crew (marked up per line; distributes over the sum) ----
  let crewTotal = 0;
  for (const role of roles) {
    const sel = s.roles[role.id];
    if (!sel) continue;
    const cost = roleCost(role, sel, s);
    if (cost <= 0) continue;
    const amount = r2(cost * markup);
    crewTotal += amount;
    lines.push({ label: roleLineLabel(role, sel, s), quantity: 1, unit: null, rate: amount, amount });
  }

  // Rental gear — added at list price, no markup (matches the sheet).
  let rentalAmount = 0;
  if (s.rental !== 'none') {
    rentalAmount = r2(config[`rental_${s.rental}`] ?? 0);
    if (rentalAmount > 0) {
      lines.push({ label: `Equipment rental — ${RENTAL_LABELS[s.rental]}`, quantity: 1, unit: null, rate: rentalAmount, amount: rentalAmount });
    }
  }
  const production = r2(crewTotal + rentalAmount);

  // ---- Pre / Post page-minute services ----
  let pre = 0;
  let post = 0;
  const selected = new Set(s.serviceIds);
  for (const svc of services) {
    if (!selected.has(svc.id)) continue;
    const cost = s.pageMinutes * svc.page_rate;
    if (cost <= 0) continue;
    const amount = r2(cost * markup);
    lines.push({
      label: `${svc.name} — ${s.pageMinutes} page/min`,
      quantity: s.pageMinutes, unit: 'page/min', rate: r2(svc.page_rate * markup), amount,
    });
    if (svc.phase === 'pre') pre += amount; else post += amount;
  }

  // "About Us" flat fee and Shorts — post-production, marked up (sheet C16).
  if (s.aboutUs) {
    const amount = r2((config['about_us_fee'] ?? 0) * markup);
    if (amount > 0) { lines.push({ label: '“About Us” video', quantity: 1, unit: null, rate: amount, amount }); post += amount; }
  }
  if (s.shorts > 0) {
    const rate = r2((config['short_rate'] ?? 0) * markup);
    const amount = r2(s.shorts * rate);
    if (amount > 0) { lines.push({ label: `Shorts ×${s.shorts} (incl. editing)`, quantity: s.shorts, unit: 'short', rate, amount }); post += amount; }
  }
  pre = r2(pre);
  post = r2(post);

  // ---- Travel/Food — direct pass-through ----
  const travel = r2(Math.max(0, s.travel));
  if (travel > 0) lines.push({ label: 'Travel / Food', quantity: 1, unit: null, rate: travel, amount: travel });

  const overall = r2(production + pre + post + travel);

  // ---- Discounts stack additively (sheet C20) ----
  let discountPct = 0;
  for (const d of s.discounts) discountPct += (config[`discount_${d}`] ?? 0) / 100;
  const total = r2(overall * (1 - discountPct));

  return { lines, production, pre, post, travel, overall, discountPct, total };
}
