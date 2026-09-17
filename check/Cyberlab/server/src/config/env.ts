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
});

const parsed = schema.safeParse(process.env);

if (!parsed.success) {
  console.error('Invalid environment configuration:', parsed.error.flatten().fieldErrors);
  throw new Error('Invalid environment configuration');
}

export const env = parsed.data;
