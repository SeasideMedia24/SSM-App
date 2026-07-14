// Tests for the cost basis used by calculator-derived project budgets. The key
// property: for every marked-up piece, cost × markup === charge, so
// margin = quote.overall − cost.total is exactly the markup on crew + services,
// while rental and travel (never marked up) contribute no margin.

import { describe, it, expect } from 'vitest';
import {
  computeQuote,
  computeCost,
  computeCostLines,
  emptySelections,
  type RoleRates,
  type PageService,
  type PricingConfig,
} from './engine';

const roles: RoleRates[] = [
  { id: 'dp', name: 'DP', kind: 'standard', day_rate: 1000, half_rate: 600, hour_rate: 150, has_quantity: false },
];
const services: PageService[] = [
  { id: 'edit', name: 'Editing', phase: 'post', page_rate: 50 },
];
const config: PricingConfig = { markup: 2.5, rental_low: 300, about_us_fee: 400, short_rate: 200 };

describe('computeCost', () => {
  it('sums the pre-markup cost of crew, services, rental, and travel', () => {
    const s = { ...emptySelections(), fullDays: 2, pageMinutes: 3, serviceIds: ['edit'], rental: 'low' as const, travel: 250, roles: { dp: { quantity: 1 } } };
    const cost = computeCost(s, roles, services, config);
    expect(cost.crew).toBe(2000); // 2 days × 1000
    expect(cost.post).toBe(150); // 3 page/min × 50
    expect(cost.rental).toBe(300); // list price, no markup
    expect(cost.travel).toBe(250);
    expect(cost.total).toBe(2700); // 2000 + 150 + 300 + 250
  });

  it('margin (charge − cost) equals the markup on crew + services only', () => {
    const s = { ...emptySelections(), fullDays: 2, pageMinutes: 3, serviceIds: ['edit'], rental: 'low' as const, travel: 250, roles: { dp: { quantity: 1 } } };
    const quote = computeQuote(s, roles, services, config);
    const cost = computeCost(s, roles, services, config);
    const margin = quote.overall - cost.total;
    // Marked-up pieces are crew (2000) + services (150) = 2150; at 2.5× that's a
    // 1.5× uplift => margin 3225. Rental and travel add nothing to margin.
    expect(margin).toBe(3225);
  });

  it('is zero for an empty selection', () => {
    expect(computeCost(emptySelections(), roles, services, config).total).toBe(0);
  });
});

describe('permits', () => {
  const cfg: PricingConfig = { markup: 2.5, permit: 200 };

  it('bills permits at cost (pass-through, no markup)', () => {
    const s = { ...emptySelections(), permits: 3 };
    const q = computeQuote(s, roles, services, cfg);
    // Permits cost = 3×200 = 600, pass-through (no markup, no production).
    expect(q.production).toBe(0);
    expect(q.overall).toBe(600);
  });

  it('folds permits into the pass-through (travel) cost with no margin', () => {
    const s = { ...emptySelections(), permits: 3 };
    const cost = computeCost(s, roles, services, cfg);
    expect(cost.travel).toBe(600); // permits fold into pass-through
    expect(cost.total).toBe(600);
    const q = computeQuote(s, roles, services, cfg);
    expect(q.overall - cost.total).toBe(0); // pass-through adds no margin
  });

  it('itemises the permit cost line', () => {
    const s = { ...emptySelections(), permits: 2 };
    const { lines, total } = computeCostLines(s, roles, services, cfg);
    const labels = lines.map((l) => l.label);
    expect(labels.some((l) => l.startsWith('Permits ×2'))).toBe(true);
    expect(total).toBe(400); // 2 permits @200
  });
});
