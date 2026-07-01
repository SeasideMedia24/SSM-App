// Server-side validation for project records (CLAUDE.md rule #3).

import { z } from 'zod';

export const PROJECT_STATUS_VALUES = [
  'idea_inquiry',
  'scripting_planning',
  'filming',
  'editing',
  'review_revision',
  'scheduled',
  'archived',
] as const;

export const PARA_CATEGORY_VALUES = ['project', 'area', 'resource', 'archive'] as const;

// A date input is either empty ('') or a YYYY-MM-DD string.
const optionalDate = z.union([z.literal(''), z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Use a valid date')]).optional();

export const projectSchema = z.object({
  title: z.string().trim().min(1, 'Title is required').max(200),
  client_id: z.string().uuid('Choose a client'),
  description: z.string().trim().max(5000).optional(),
  status: z.enum(PROJECT_STATUS_VALUES).optional(),
  para_category: z.enum(PARA_CATEGORY_VALUES).optional(),
  start_date: optionalDate,
  due_date: optionalDate,
  // Comma-separated in the form; parsed to a string[] in the action.
  tags: z.string().max(500).optional(),
});

export type ProjectInput = z.infer<typeof projectSchema>;

// "brand film, q3, priority" → ["brand film", "q3", "priority"]
export function parseTags(raw: string | undefined): string[] {
  if (!raw) return [];
  return raw
    .split(',')
    .map((t) => t.trim())
    .filter(Boolean)
    .slice(0, 20);
}

export function emptyDateToNull(value: string | undefined): string | null {
  return value && value.trim() !== '' ? value.trim() : null;
}
