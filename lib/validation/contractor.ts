// Server-side validation for contractor/team records (CLAUDE.md rule #3).

import { z } from 'zod';

export const CONTRACTOR_TYPE_VALUES = ['internal', 'external', 'employee'] as const;

export const contractorSchema = z.object({
  name: z.string().trim().min(1, 'Name is required').max(200),
  email: z.union([z.literal(''), z.string().trim().email('Enter a valid email address')]).optional(),
  phone: z.string().trim().max(50).optional(),
  type: z.enum(CONTRACTOR_TYPE_VALUES).optional(),
  role: z.string().trim().max(200).optional(),
  rate_unit: z.string().trim().max(50).optional(),
  notes: z.string().trim().max(5000).optional(),
});

export type ContractorInput = z.infer<typeof contractorSchema>;

// Parse a money field from a form: blank -> null, otherwise a non-negative
// number rounded to cents. Invalid input becomes null rather than erroring.
export function parseRate(value: FormDataEntryValue | null): number | null {
  const s = String(value ?? '').trim();
  if (s === '') return null;
  const n = Number(s);
  if (!Number.isFinite(n) || n < 0) return null;
  return Math.round(n * 100) / 100;
}
