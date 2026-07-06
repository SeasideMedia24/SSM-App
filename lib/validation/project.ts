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

export const TASK_PRIORITY_VALUES = ['low', 'medium', 'high'] as const;

// A date input is either empty ('') or a YYYY-MM-DD string.
const optionalDate = z.union([z.literal(''), z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Use a valid date')]).optional();

export const projectSchema = z.object({
  title: z.string().trim().min(1, 'Title is required').max(200),
  client_id: z.string().uuid('Choose a client'),
  description: z.string().trim().max(5000).optional(),
  status: z.enum(PROJECT_STATUS_VALUES).optional(),
  priority: z.enum(TASK_PRIORITY_VALUES).optional(),
  project_type: z.string().max(50).optional(),
  start_date: optionalDate,
  due_date: optionalDate,
});

export type ProjectInput = z.infer<typeof projectSchema>;

export function emptyDateToNull(value: string | undefined): string | null {
  return value && value.trim() !== '' ? value.trim() : null;
}
