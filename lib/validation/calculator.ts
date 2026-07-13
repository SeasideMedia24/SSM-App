// Server-side validation for the Production Price Calculator's selections
// (CLAUDE.md rule #3). The UI serializes CalculatorSelections into one JSON
// field; this schema is the real gate before the server recomputes the quote.

import { z } from 'zod';

const count = z.coerce.number().min(0).max(9999);

export const selectionsSchema = z.object({
  pageMinutes: count,
  fullDays: count,
  halfDays: count,
  hours: count,
  droneHours: count,
  shorts: count,
  travel: z.coerce.number().min(0).max(9999999),
  rental: z.enum(['none', 'low', 'medium_low', 'medium', 'high']),
  aboutUs: z.boolean(),
  roles: z.record(
    z.string().uuid(),
    z.object({
      quantity: z.coerce.number().min(1).max(999),
      booking: z.enum(['day', 'half', 'hourly']).optional(),
    }),
  ),
  serviceIds: z.array(z.string().uuid()).max(100),
  discounts: z.array(z.enum(['referral', 'first_time', 'military'])).max(3),
  // Actors/models per tier + permit count. Defaulted so quotes saved before
  // these fields existed still validate.
  actors: z
    .object({ high: count, medium: count, low: count })
    .default({ high: 0, medium: 0, low: 0 }),
  permits: count.default(0),
});

export const calculatorQuoteSchema = z.object({
  title: z.string().trim().min(1, 'Give the quote a title').max(200),
  client_id: z.string().uuid('Pick a client for this quote'),
  project_id: z.union([z.literal(''), z.string().uuid()]).optional(),
  notes: z.string().trim().max(5000).optional(),
  selections: selectionsSchema,
});

export type CalculatorQuoteInput = z.infer<typeof calculatorQuoteSchema>;
