// Server-side validation for the public onboarding form. This runs on untrusted
// input from an anonymous visitor, so it's the real gate (CLAUDE.md rule #3).

import { z } from 'zod';

const optionalText = (max: number) => z.string().trim().max(max).optional();

export const onboardingSchema = z.object({
  name: z.string().trim().min(1, 'Please enter your name').max(200),
  company: optionalText(200),
  email: z.union([z.literal(''), z.string().trim().email('Enter a valid email')]).optional(),
  phone: optionalText(50),
  project_type: optionalText(50),
  project_description: optionalText(5000),
  budget_range: optionalText(100),
  desired_timeline: optionalText(100),
  heard_from: optionalText(200),
});

export type OnboardingInput = z.infer<typeof onboardingSchema>;

// Budget ranges offered on the form (kept simple; owner can refine later).
export const BUDGET_RANGES = [
  'Under $2,500',
  '$2,500 – $5,000',
  '$5,000 – $10,000',
  '$10,000 – $25,000',
  '$25,000+',
  'Not sure yet',
];

export const TIMELINE_OPTIONS = [
  'ASAP',
  'Within a month',
  '1 – 3 months',
  'Flexible',
];
