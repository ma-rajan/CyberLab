import { z } from 'zod';

const email = z.string().trim().toLowerCase().email().max(254);
const username = z
  .string()
  .trim()
  .min(3, 'Username must be at least 3 characters long.')
  .max(32, 'Username must be at most 32 characters long.')
  .regex(/^[A-Za-z0-9_]+$/, 'Username may contain only letters, numbers, and underscores.');
const password = z
  .string()
  .min(12, 'Password must be at least 12 characters long.')
  .max(128, 'Password must be at most 128 characters long.')
  .regex(/[a-z]/, 'Password must include a lowercase letter.')
  .regex(/[A-Z]/, 'Password must include an uppercase letter.')
  .regex(/\d/, 'Password must include a number.')
  .regex(/[^A-Za-z0-9]/, 'Password must include a symbol.');

export const registerSchema = z
  .object({ username, email, password, confirmPassword: z.string().optional() })
  .strict()
  .refine((data) => data.confirmPassword === undefined || data.password === data.confirmPassword, {
    path: ['confirmPassword'],
    message: 'Passwords do not match.',
  });

export const loginSchema = z.object({ email, password: z.string().min(1).max(128) }).strict();

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
