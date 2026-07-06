// Server-side validation for client records (CLAUDE.md rule #3: never trust the
// browser alone). Used by the client server actions.

import { z } from 'zod';

export const CLIENT_TYPE_VALUES = ['recurring', 'one_time', 'campaign'] as const;

export const clientSchema = z.object({
  name: z.string().trim().min(1, 'Name is required').max(200),
  // Optional fields: allow empty string in the form; the action converts "" to null.
  company: z.string().trim().max(200).optional(),
  email: z.union([z.literal(''), z.string().trim().email('Enter a valid email address')]).optional(),
  phone: z.string().trim().max(50).optional(),
  notes: z.string().trim().max(5000).optional(),
  client_type: z.enum(CLIENT_TYPE_VALUES).optional(),
});

export type ClientInput = z.infer<typeof clientSchema>;

// Turn a validated value into what we store: empty strings become null so the
// database holds clean data.
export function emptyToNull(value: string | undefined): string | null {
  if (value === undefined) return null;
  const trimmed = value.trim();
  return trimmed === '' ? null : trimmed;
}
