import { z } from 'zod';

export const slugSchema = z
  .string()
  .min(3)
  .max(80)
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);

export const emptyBodySchema = z.object({}).strict();

export const submissionSchema = z
  .object({ submission: z.record(z.string(), z.unknown()) })
  .strict();

export const productSearchSchema = z
  .object({
    search: z.string().max(120).default(''),
  })
  .strict();

export const feedbackSearchSchema = z
  .object({
    feedback: z.string().max(500).default(''),
  })
  .strict();
