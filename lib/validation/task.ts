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

// The fuller form used on My Tasks, where a task can be pointed at a project, a
// client, both, or neither. Empty selects arrive as '' and become null.
const uuidOrEmpty = z.union([z.literal(''), z.uuid()]).optional();

export const newTaskSchema = z.object({
  title: z.string().trim().min(1, 'Task title is required').max(300),
  project_id: uuidOrEmpty,
  client_id: uuidOrEmpty,
  priority: z.enum(TASK_PRIORITY_VALUES).optional(),
  status: z.enum(TASK_STATUS_VALUES).optional(),
  due_date: z
    .union([z.literal(''), z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Use a valid date')])
    .optional(),
});

export type NewTaskInput = z.infer<typeof newTaskSchema>;
