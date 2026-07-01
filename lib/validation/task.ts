// Server-side validation for tasks.

import { z } from 'zod';

export const TASK_STATUS_VALUES = ['not_started', 'in_progress', 'done'] as const;
export const TASK_PRIORITY_VALUES = ['low', 'medium', 'high'] as const;

export const taskSchema = z.object({
  title: z.string().trim().min(1, 'Task title is required').max(300),
  priority: z.enum(TASK_PRIORITY_VALUES).optional(),
  due_date: z
    .union([z.literal(''), z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Use a valid date')])
    .optional(),
});

export type TaskInput = z.infer<typeof taskSchema>;
