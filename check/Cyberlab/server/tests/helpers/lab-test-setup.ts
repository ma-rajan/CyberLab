import { promises as fs } from 'node:fs';
import path from 'node:path';
import { beforeEach } from 'vitest';
import { prisma } from '../../src/lib/prisma.js';
import { authRateLimitStore } from '../../src/middleware/auth-rate-limit.js';
import { resetTrainingCsrfSettings } from '../../src/modules/labs/isolated-targets/csrf-settings.target.js';

beforeEach(async () => {
  authRateLimitStore.resetAll();
  resetTrainingCsrfSettings();
  await prisma.labSession.deleteMany();
  await prisma.labProgress.deleteMany();
  await prisma.lab.deleteMany();
  await prisma.session.deleteMany();
  await prisma.auditLog.deleteMany();
  await prisma.user.deleteMany();
  await fs.rm(path.resolve(process.cwd(), '.lab-storage', 'file-upload'), {
    recursive: true,
    force: true,
  });
});
