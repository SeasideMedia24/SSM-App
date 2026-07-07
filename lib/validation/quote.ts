// Server-side validation for quotes from the Price Calculator (CLAUDE.md rule
// #3: never trust the browser alone). The builder UI serializes its line-item
// rows into a single JSON field; this schema is the real gate for that data.

import { z } from 'zod';

// One line on the quote: "Full shoot day × 2 @ $1500/day".
export const lineItemSchema = z.object({
  label: z.string().trim().min(1, 'Every line item needs a description').max(200),
  quantity: z.coerce.number().min(0, 'Quantity can’t be negative').max(999999),
  unit: z.string().trim().max(50).optional(),
  rate: z.coerce.number().min(0, 'Rate can’t be negative').max(99999999),
});

export const quoteSchema = z.object({
  title: z.string().trim().min(1, 'Give the quote a title').max(200),
  client_id: z.string().uuid('Pick a client for this quote'),
  project_id: z.union([z.literal(''), z.string().uuid()]).optional(),
  notes: z.string().trim().max(5000).optional(),
  items: z.array(lineItemSchema).min(1, 'Add at least one line item'),
});

export type QuoteInput = z.infer<typeof quoteSchema>;
export type LineItemInput = z.infer<typeof lineItemSchema>;
