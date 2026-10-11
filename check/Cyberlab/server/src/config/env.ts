import 'dotenv/config';
import { z } from 'zod';

const schema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().min(1).max(65535).default(3001),
  DATABASE_URL: z.string().min(1).default('file:./dev.db'),
  CLIENT_ORIGIN: z
    .string()
    .url()
    .refine((value) => ['localhost', '127.0.0.1'].includes(new URL(value).hostname), {
      message: 'CLIENT_ORIGIN must be a local origin.',
    })
    .default('http://localhost:5173'),
  SESSION_TTL_DAYS: z.coerce.number().int().min(1).max(30).default(7),
  LAB_UPLOAD_MAX_FILES_PER_LEARNER: z.coerce.number().int().min(1).max(1000).default(10),
  LAB_UPLOAD_MAX_BYTES_PER_LEARNER: z.coerce.number().int().min(1).max(1024 * 1024 * 1024).default(256 * 1024),
  LAB_UPLOAD_MAX_BYTES_GLOBAL: z.coerce.number().int().min(1).max(10 * 1024 * 1024 * 1024).default(16 * 1024 * 1024),
  LAB_UPLOAD_TTL_HOURS: z.coerce.number().int().min(1).max(24 * 30).default(24),
}).superRefine((values, context) => {
  if (values.LAB_UPLOAD_MAX_BYTES_GLOBAL < values.LAB_UPLOAD_MAX_BYTES_PER_LEARNER) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['LAB_UPLOAD_MAX_BYTES_GLOBAL'],
      message: 'LAB_UPLOAD_MAX_BYTES_GLOBAL must be at least LAB_UPLOAD_MAX_BYTES_PER_LEARNER.',
    });
  }
});

const parsed = schema.safeParse(process.env);

if (!parsed.success) {
  console.error('Invalid environment configuration:', parsed.error.flatten().fieldErrors);
  throw new Error('Invalid environment configuration');
}

export const env = parsed.data;
