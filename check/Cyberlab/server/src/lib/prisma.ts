import { PrismaClient } from '@prisma/client';
import { env } from '../config/env.js';

// Pass the validated default through to Prisma as well. Without an .env file,
// Prisma otherwise cannot resolve DATABASE_URL even though application config
// has a safe local default.
export const prisma = new PrismaClient({
  datasources: { db: { url: env.DATABASE_URL } },
});
