// Project budget = the project's quotes.
//
// A project's budget is derived entirely from the quotes linked to it (built in
// the Price Calculator). For each quote we report:
//   • charge — the client price (quote.total, after discounts)
//   • cost   — the cost basis recomputed from the quote's calculator selections
//              against the current rates (crew/services before markup + rental +
//              travel), so margin reflects real cost, not the client price
//   • margin — charge − cost
//
// A project can have many quotes; they are all kept and all counted. The maths
// lives here so the per-project view and the all-projects Budgets page agree.

import { computeCost, computeCostLines, type CalculatorSelections, type PricingConfig, type LineDetail } from '@/lib/pricing/engine';
import type { QuoteStatus } from '@/types/database.types';

// The pricing rate tables, passed straight through to computeCost. Typed off
// computeCost's own signature so we don't restate the row shapes here.
export type PricingContext = {
  roles: Parameters<typeof computeCost>[1];
  services: Parameters<typeof computeCost>[2];
  config: PricingConfig;
};

// The minimal quote shape the budget maths needs.
export type BudgetQuote = {
  id: string;
  title: string;
  status: QuoteStatus;
  total: number | null;
  calculator_state: unknown;
  created_at: string;
};

// One line of the cost breakdown, ready to render. `detail` carries the
// structured units (days / half days / hours / page-min / qty) so the budget
// table can show them as flush columns instead of one crammed label.
export type BudgetCostLine = { label: string; amount: number; detail?: LineDetail };

export type QuoteBudgetRow = {
  id: string;
  title: string;
  status: QuoteStatus;
  createdAt: string;
  charge: number;
  cost: number | null; // null when the quote has no saved selections to cost
  margin: number | null;
  costLines: BudgetCostLine[]; // itemised cost (no markup/discount); empty if no basis
};

export function quoteBudgetRow(quote: BudgetQuote, ctx: PricingContext): QuoteBudgetRow {
  const charge = quote.total ?? 0;
  let cost: number | null = null;
  let margin: number | null = null;
  let costLines: BudgetCostLine[] = [];

  const state = quote.calculator_state as CalculatorSelections | null;
  if (state) {
    cost = computeCost(state, ctx.roles, ctx.services, ctx.config).total;
    margin = charge - cost;
    costLines = computeCostLines(state, ctx.roles, ctx.services, ctx.config).lines.map((l) => ({
      label: l.label,
      amount: l.amount,
      detail: l.detail,
    }));
  }
  return { id: quote.id, title: quote.title, status: quote.status, createdAt: quote.created_at, charge, cost, margin, costLines };
}

// Roll several quote rows up into a project (or all-projects) total. Cost/margin
// stay null unless at least one quote actually has a cost basis.
export function sumBudget(rows: QuoteBudgetRow[]): { charge: number; cost: number | null; margin: number | null } {
  const charge = rows.reduce((s, r) => s + r.charge, 0);
  const anyCost = rows.some((r) => r.cost != null);
  const cost = anyCost ? rows.reduce((s, r) => s + (r.cost ?? 0), 0) : null;
  const margin = cost != null ? charge - cost : null;
  return { charge, cost, margin };
}
