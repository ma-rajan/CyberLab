import { promises as fs } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach } from 'vitest';
import { prisma } from '../../src/lib/prisma.js';
import { authRateLimitStore } from '../../src/middleware/auth-rate-limit.js';
import { resetTrainingCsrfSettings } from '../../src/modules/labs/isolated-targets/csrf-settings.target.js';
import { resetTrainingFileReads } from '../../src/modules/labs/isolated-targets/path-traversal.target.js';
import { resetSstiExerciseState } from '../../src/modules/labs/isolated-targets/ssti-preview.target.js';

let testUploadRoot: string | undefined;

beforeEach(async () => {
  authRateLimitStore.resetAll();
  resetTrainingCsrfSettings();
  resetTrainingFileReads();
  resetSstiExerciseState();
  await prisma.labSession.deleteMany();
  await prisma.labProgress.deleteMany();
  await prisma.lab.deleteMany();
  await prisma.session.deleteMany();
  await prisma.auditLog.deleteMany();
  await prisma.user.deleteMany();
  testUploadRoot = await fs.mkdtemp(path.join(tmpdir(), 'cyberlab-upload-test-'));
  process.env.CYBERLAB_TEST_FILE_UPLOAD_ROOT = testUploadRoot;
});

afterEach(async () => {
  if (testUploadRoot) await fs.rm(testUploadRoot, { recursive: true, force: true });
  delete process.env.CYBERLAB_TEST_FILE_UPLOAD_ROOT;
  testUploadRoot = undefined;
});
