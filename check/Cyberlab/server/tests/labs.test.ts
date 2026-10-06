import bcrypt from 'bcryptjs';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import request from 'supertest';
import { beforeEach, describe, expect, it } from 'vitest';
import { app } from '../src/app.js';
import { prisma } from '../src/lib/prisma.js';
import { authRateLimitStore } from '../src/middleware/auth-rate-limit.js';
import { resetTrainingCsrfSettings } from '../src/modules/labs/isolated-targets/csrf-settings.target.js';

const password = 'SecurePassphrase1!';

async function createUser(username: string, email: string) {
  return prisma.user.create({
    data: { username, email, passwordHash: await bcrypt.hash(password, 12) },
  });
}

async function createPublishedLab(slug = 'secure-lab') {
  return prisma.lab.create({
    data: {
      slug,
      title: 'Secure Lab Metadata',
      description: 'Placeholder metadata only.',
      category: 'WEB_SECURITY',
      difficulty: 'BEGINNER',
      estimatedMinutes: 20,
      points: 100,
      isPublished: true,
    },
  });
}

async function createSqlInjectionChallenge() {
  return prisma.lab.create({
    data: {
      slug: 'sql-injection-basics',
      title: 'SQL Injection Basics',
      description: 'Product search challenge.',
      category: 'INJECTION',
      difficulty: 'BEGINNER',
      estimatedMinutes: 30,
      points: 100,
      isPublished: true,
      objective: 'Understand unsafe query construction.',
      instructions: 'Use Product Search.',
      hints: JSON.stringify(['Inspect the query preview.', 'Try a tautology.']),
      target: 'Product Search',
      challengeType: 'SQL_INJECTION_PRODUCT_SEARCH',
      validatorType: 'FLAG',
      flagHash: await bcrypt.hash('CYBERLAB{product_search_tautology}', 12),
    },
  });
}

async function createXssChallenge(isPublished = true) {
  return prisma.lab.create({
    data: {
      slug: 'xss-fundamentals', title: 'Reflected XSS Basics', description: 'Feedback search challenge.',
      category: 'CLIENT_SIDE_SECURITY', difficulty: 'BEGINNER', estimatedMinutes: 20, points: 100, isPublished,
      objective: 'Understand reflected XSS.', instructions: 'Use Feedback Search.',
      hints: JSON.stringify(['Inspect the preview.', 'Try harmless HTML.']), target: 'Feedback Search',
      challengeType: 'XSS_FEEDBACK_SEARCH', validatorType: 'FLAG',
      flagHash: await bcrypt.hash('XSS_PREVIEW_CONFIRMED', 12),
    },
  });
}

async function createIdorChallenge(isPublished = true) {
  return prisma.lab.create({
    data: {
      slug: 'idor-fundamentals', title: 'Profile Access — IDOR Basics', description: 'Profile access challenge.',
      category: 'ACCESS_CONTROL', difficulty: 'BEGINNER', estimatedMinutes: 25, points: 100, isPublished,
      objective: 'Understand object-level authorization.', instructions: 'Use Profile Access.',
      hints: JSON.stringify(['Inspect the profile ID.', 'Change the ID.']), target: 'Profile Access',
      challengeType: 'IDOR_PROFILE_ACCESS', validatorType: 'FLAG',
      flagHash: await bcrypt.hash('IDOR_PROFILE_ACCESS_CONFIRMED', 12),
    },
  });
}

async function createAuthenticationBypassChallenge(isPublished = true) {
  return prisma.lab.create({
    data: {
      slug: 'authentication-bypass-basics', title: 'Authentication Bypass Basics', description: 'Synthetic login challenge.',
      category: 'AUTHENTICATION', difficulty: 'BEGINNER', estimatedMinutes: 20, points: 100, isPublished,
      objective: 'Understand flawed authentication logic.', instructions: 'Use Training Login.',
      hints: JSON.stringify(['Inspect the login decision.', 'Try unexpected values.']), target: 'Training Login',
      challengeType: 'AUTHENTICATION_BYPASS', validatorType: 'FLAG',
      flagHash: await bcrypt.hash('AUTH_BYPASS_CONFIRMED', 12),
    },
  });
}

async function createBrokenFunctionAccessChallenge(isPublished = true) {
  return prisma.lab.create({
    data: {
      slug: 'broken-access-control', title: 'Broken Function-Level Authorization', description: 'Training workspace challenge.',
      category: 'ACCESS_CONTROL', difficulty: 'BEGINNER', estimatedMinutes: 35, points: 150, isPublished,
      objective: 'Understand function-level authorization.', instructions: 'Use Training Workspace.',
      hints: JSON.stringify(['Open the learner workspace.', 'Request the administrator report.']), target: 'Training Workspace',
      challengeType: 'BROKEN_FUNCTION_ACCESS', validatorType: 'FLAG',
      flagHash: await bcrypt.hash('BROKEN_FUNCTION_ACCESS_CONFIRMED', 12),
    },
  });
}

async function createSsrfChallenge(isPublished = true) {
  return prisma.lab.create({
    data: {
      slug: 'ssrf', title: 'Server-Side Request Forgery', description: 'Mock fetch challenge.',
      category: 'WEB_SECURITY', difficulty: 'BEGINNER', estimatedMinutes: 25, points: 100, isPublished,
      objective: 'Understand controlled server-side fetching.', instructions: 'Use Mock Fetch Service.',
      hints: JSON.stringify(['Fetch the public mock path.', 'Consider the internal mock path.']), target: 'Mock Fetch Service',
      challengeType: 'SSRF_MOCK_FETCH', validatorType: 'FLAG',
      flagHash: await bcrypt.hash('SSRF_INTERNAL_CONFIG_CONFIRMED', 12),
    },
  });
}

async function createSqliChallenge(isPublished = true) {
  return prisma.lab.create({ data: {
    slug: 'sqli', title: 'SQL Injection', description: 'Mock user directory challenge.',
    category: 'INJECTION', difficulty: 'BEGINNER', estimatedMinutes: 25, points: 100, isPublished,
    objective: 'Understand unsafe query construction.', instructions: 'Use Mock User Directory.',
    hints: JSON.stringify(['Search for alice.', 'Inspect the preview.']), target: 'Mock User Directory',
    challengeType: 'SQLI_USER_DIRECTORY', validatorType: 'FLAG',
    flagHash: await bcrypt.hash('SQLI_DIRECTORY_ACCESS_CONFIRMED', 12),
  } });
}

async function createFileUploadChallenge(isPublished = true) {
  return prisma.lab.create({ data: {
    slug: 'file-upload-validation', title: 'Unrestricted File Upload', description: 'Profile upload challenge.',
    category: 'WEB_SECURITY', difficulty: 'BEGINNER', estimatedMinutes: 30, points: 125, isPublished,
    objective: 'Understand server-side upload validation.', instructions: 'Use Profile Image Upload.',
    hints: JSON.stringify(['Upload a normal image first.']), target: 'Profile Image Upload',
    challengeType: 'FILE_UPLOAD_VALIDATION', validatorType: 'FILE_UPLOAD',
    flagHash: await bcrypt.hash('FILE_UPLOAD_MISMATCH_CONFIRMED', 12),
  } });
}
async function createCsrfChallenge() { return prisma.lab.create({ data: { slug: 'csrf', title: 'CSRF', description: 'Training notification settings challenge.', category: 'WEB_SECURITY', difficulty: 'BEGINNER', estimatedMinutes: 20, points: 100, isPublished: true, objective: 'Understand missing CSRF validation.', instructions: 'Use Training Profile Settings.', hints: '[]', target: 'Training Profile Settings', challengeType: 'CSRF', validatorType: 'CSRF', flagHash: await bcrypt.hash('CSRF_NOTIFICATION_CHANGE_CONFIRMED', 12) } }); }

async function csrf(agent: ReturnType<typeof request.agent>) {
  return (await agent.get('/api/auth/csrf')).body.data.csrfToken as string;
}

async function authenticatedAgent(username: string, email: string) {
  await createUser(username, email);
  const agent = request.agent(app);
  const token = await csrf(agent);
  await agent
    .post('/api/auth/login')
    .set('X-CSRF-Token', token)
    .send({ email, password })
    .expect(200);
  return { agent, token };
}

async function loginAgent(email: string) {
  const agent = request.agent(app);
  const token = await csrf(agent);
  await agent
    .post('/api/auth/login')
    .set('X-CSRF-Token', token)
    .send({ email, password })
    .expect(200);
  return { agent, token };
}

beforeEach(async () => {
  authRateLimitStore.resetAll();
  resetTrainingCsrfSettings();
  await prisma.labSession.deleteMany();
  await prisma.labProgress.deleteMany();
  await prisma.lab.deleteMany();
  await prisma.session.deleteMany();
  await prisma.auditLog.deleteMany();
  await prisma.user.deleteMany();
  await fs.rm(path.resolve(process.cwd(), '.lab-storage', 'file-upload'), { recursive: true, force: true });
});

describe('lab API', () => {
  it('returns only published labs with public metadata', async () => {
    await createPublishedLab('published-lab');
    await prisma.lab.create({
      data: {
        slug: 'unpublished-lab',
        title: 'Private',
        description: 'Private metadata.',
        category: 'OTHER',
        difficulty: 'ADVANCED',
        estimatedMinutes: 10,
        points: 1,
        isPublished: false,
      },
    });
    const response = await request(app).get('/api/labs').expect(200);
    expect(response.body.data.labs).toHaveLength(1);
    expect(response.body.data.labs[0]).toMatchObject({ slug: 'published-lab', points: 100 });
    expect(JSON.stringify(response.body)).not.toContain('isPublished');
  });

  it('returns a published lab and hides missing or unpublished labs', async () => {
    await createPublishedLab('published-lab');
    await prisma.lab.create({
      data: {
        slug: 'unpublished-lab',
        title: 'Private',
        description: 'Private metadata.',
        category: 'OTHER',
        difficulty: 'ADVANCED',
        estimatedMinutes: 10,
        points: 1,
        isPublished: false,
      },
    });
    await request(app).get('/api/labs/published-lab').expect(200);
    await request(app).get('/api/labs/missing-lab').expect(404);
    await request(app).get('/api/labs/unpublished-lab').expect(404);
  });

  it('returns challenge metadata without private flag validation data', async () => {
    await createSqlInjectionChallenge();
    const response = await request(app).get('/api/labs/sql-injection-basics').expect(200);
    expect(response.body.data.lab).toMatchObject({
      challengeType: 'SQL_INJECTION_PRODUCT_SEARCH',
      target: 'Product Search',
    });
    expect(JSON.stringify(response.body)).not.toContain('flagHash');
    expect(JSON.stringify(response.body)).not.toContain('CYBERLAB{product_search_tautology}');
    expect(JSON.stringify(response.body)).not.toContain('validatorType');
  });

  it('returns published XSS metadata without its validator data and hides drafts', async () => {
    await createXssChallenge();
    const response = await request(app).get('/api/labs/xss-fundamentals').expect(200);
    expect(response.body.data.lab).toMatchObject({ title: 'Reflected XSS Basics', challengeType: 'XSS_FEEDBACK_SEARCH' });
    expect(JSON.stringify(response.body)).not.toContain('flagHash');
    expect(JSON.stringify(response.body)).not.toContain('validatorType');
    expect(JSON.stringify(response.body)).not.toContain('XSS_PREVIEW_CONFIRMED');
    await prisma.lab.update({ where: { slug: 'xss-fundamentals' }, data: { isPublished: false } });
    await request(app).get('/api/labs/xss-fundamentals').expect(404);
  });

  it('returns published IDOR metadata without private validator data and hides drafts', async () => {
    await createIdorChallenge();
    const response = await request(app).get('/api/labs/idor-fundamentals').expect(200);
    expect(response.body.data.lab).toMatchObject({ title: 'Profile Access — IDOR Basics', challengeType: 'IDOR_PROFILE_ACCESS' });
    expect(JSON.stringify(response.body)).not.toContain('flagHash');
    expect(JSON.stringify(response.body)).not.toContain('validatorType');
    expect(JSON.stringify(response.body)).not.toContain('IDOR_PROFILE_ACCESS_CONFIRMED');
    await prisma.lab.update({ where: { slug: 'idor-fundamentals' }, data: { isPublished: false } });
    await request(app).get('/api/labs/idor-fundamentals').expect(404);
  });

  it('returns published authentication challenge metadata without private validator data and hides drafts', async () => {
    await createAuthenticationBypassChallenge();
    const response = await request(app).get('/api/labs/authentication-bypass-basics').expect(200);
    expect(response.body.data.lab).toMatchObject({ title: 'Authentication Bypass Basics', challengeType: 'AUTHENTICATION_BYPASS' });
    expect(JSON.stringify(response.body)).not.toContain('flagHash');
    expect(JSON.stringify(response.body)).not.toContain('validatorType');
    expect(JSON.stringify(response.body)).not.toContain('AUTH_BYPASS_CONFIRMED');
    await prisma.lab.update({ where: { slug: 'authentication-bypass-basics' }, data: { isPublished: false } });
    await request(app).get('/api/labs/authentication-bypass-basics').expect(404);
  });

  it('returns published function authorization metadata without private validator data and hides drafts', async () => {
    await createBrokenFunctionAccessChallenge();
    const response = await request(app).get('/api/labs/broken-access-control').expect(200);
    expect(response.body.data.lab).toMatchObject({ title: 'Broken Function-Level Authorization', challengeType: 'BROKEN_FUNCTION_ACCESS' });
    expect(JSON.stringify(response.body)).not.toContain('flagHash');
    expect(JSON.stringify(response.body)).not.toContain('validatorType');
    expect(JSON.stringify(response.body)).not.toContain('BROKEN_FUNCTION_ACCESS_CONFIRMED');
    await prisma.lab.update({ where: { slug: 'broken-access-control' }, data: { isPublished: false } });
    await request(app).get('/api/labs/broken-access-control').expect(404);
  });

  it('returns published SSRF metadata without private validator data and hides drafts', async () => {
    await createSsrfChallenge();
    const response = await request(app).get('/api/labs/ssrf').expect(200);
    expect(response.body.data.lab).toMatchObject({ title: 'Server-Side Request Forgery', challengeType: 'SSRF_MOCK_FETCH' });
    expect(JSON.stringify(response.body)).not.toContain('flagHash');
    expect(JSON.stringify(response.body)).not.toContain('validatorType');
    expect(JSON.stringify(response.body)).not.toContain('SSRF_INTERNAL_CONFIG_CONFIRMED');
    await prisma.lab.update({ where: { slug: 'ssrf' }, data: { isPublished: false } });
    await request(app).get('/api/labs/ssrf').expect(404);
  });

  it('returns published SQLi metadata without private validator data and hides drafts', async () => {
    await createSqliChallenge();
    const response = await request(app).get('/api/labs/sqli').expect(200);
    expect(response.body.data.lab).toMatchObject({ title: 'SQL Injection', challengeType: 'SQLI_USER_DIRECTORY' });
    expect(JSON.stringify(response.body)).not.toContain('flagHash');
    expect(JSON.stringify(response.body)).not.toContain('SQLI_DIRECTORY_ACCESS_CONFIRMED');
    await prisma.lab.update({ where: { slug: 'sqli' }, data: { isPublished: false } });
    await request(app).get('/api/labs/sqli').expect(404);
  });

  it('requires authentication for progress actions', async () => {
    await createPublishedLab();
    await request(app).get('/api/labs/progress').expect(401);
    await request(app).post('/api/labs/secure-lab/start').expect(401);
    await request(app).post('/api/labs/secure-lab/complete').expect(401);
  });

  it('starts a published lab once without duplicate progress', async () => {
    const lab = await createPublishedLab();
    const { agent, token } = await authenticatedAgent('learner', 'learner@example.test');
    const first = await agent
      .post('/api/labs/secure-lab/start')
      .set('X-CSRF-Token', token)
      .send({})
      .expect(200);
    const second = await agent
      .post('/api/labs/secure-lab/start')
      .set('X-CSRF-Token', token)
      .send({})
      .expect(200);
    expect(first.body.data.progress.status).toBe('IN_PROGRESS');
    expect(second.body.data.progress.id).toBe(first.body.data.progress.id);
    expect(await prisma.labProgress.count({ where: { labId: lab.id } })).toBe(1);
  });

  it('isolates progress to the authenticated user and ignores client user IDs', async () => {
    const lab = await createPublishedLab();
    const userA = await createUser('learner_a', 'a@example.test');
    const userB = await createUser('learner_b', 'b@example.test');
    const { agent: agentA, token: tokenA } = await loginAgent(userA.email);
    const { agent: agentB, token: tokenB } = await loginAgent(userB.email);
    await agentA
      .post('/api/labs/secure-lab/start')
      .set('X-CSRF-Token', tokenA)
      .send({ userId: userB.id })
      .expect(400);
    await agentA
      .post('/api/labs/secure-lab/start')
      .set('X-CSRF-Token', tokenA)
      .send({})
      .expect(200);
    await agentB
      .post('/api/labs/secure-lab/start')
      .set('X-CSRF-Token', tokenB)
      .send({})
      .expect(200);
    const aProgress = await agentA.get('/api/labs/progress').expect(200);
    const bProgress = await agentB.get('/api/labs/progress').expect(200);
    expect(aProgress.body.data.progress).toHaveLength(1);
    expect(bProgress.body.data.progress).toHaveLength(1);
    expect(aProgress.body.data.progress[0].id).not.toBe(bProgress.body.data.progress[0].id);
    expect(
      await prisma.labProgress.findUnique({
        where: { userId_labId: { userId: userA.id, labId: lab.id } },
      }),
    ).not.toBeNull();
    expect(
      await prisma.labProgress.findUnique({
        where: { userId_labId: { userId: userB.id, labId: lab.id } },
      }),
    ).not.toBeNull();
  });

  it('completes only the current user session and progress', async () => {
    const lab = await createPublishedLab();
    const { agent: agentA, token: tokenA } = await authenticatedAgent(
      'learner_a',
      'a@example.test',
    );
    const { agent: agentB, token: tokenB } = await authenticatedAgent(
      'learner_b',
      'b@example.test',
    );
    await agentA
      .post('/api/labs/secure-lab/start')
      .set('X-CSRF-Token', tokenA)
      .send({})
      .expect(200);
    await agentB
      .post('/api/labs/secure-lab/start')
      .set('X-CSRF-Token', tokenB)
      .send({})
      .expect(200);
    const completed = await agentA
      .post('/api/labs/secure-lab/submit')
      .set('X-CSRF-Token', tokenA)
      .send({ submission: { confirmation: 'CYBERLAB_READY' } })
      .expect(200);
    expect(completed.body.data.progress.status).toBe('COMPLETED');
    expect(completed.body.data.progress.completedAt).toBeTruthy();
    expect(completed.body.data.session.status).toBe('COMPLETED');
    const [aEntry, bEntry] = await prisma.labProgress.findMany({
      where: { labId: lab.id },
      orderBy: { userId: 'asc' },
    });
    expect([aEntry.status, bEntry.status].sort()).toEqual(['COMPLETED', 'IN_PROGRESS']);
  });

  it('creates one owned session and returns it idempotently', async () => {
    await createPublishedLab();
    const { agent, token } = await authenticatedAgent('learner', 'learner@example.test');
    const first = await agent
      .post('/api/labs/secure-lab/start')
      .set('X-CSRF-Token', token)
      .send({})
      .expect(200);
    const second = await agent
      .post('/api/labs/secure-lab/start')
      .set('X-CSRF-Token', token)
      .send({})
      .expect(200);
    expect(first.body.data.session.id).toBe(second.body.data.session.id);
    expect(await prisma.labSession.count()).toBe(1);
    await agent.get('/api/labs/secure-lab/session').expect(200);
  });

  it('does not expose another user session or accept client points', async () => {
    await createPublishedLab();
    const { agent: agentA, token: tokenA } = await authenticatedAgent(
      'learner_a',
      'a@example.test',
    );
    const { agent: agentB } = await authenticatedAgent('learner_b', 'b@example.test');
    await agentA
      .post('/api/labs/secure-lab/start')
      .set('X-CSRF-Token', tokenA)
      .send({})
      .expect(200);
    await agentB.get('/api/labs/secure-lab/session').expect(404);
    const response = await agentA
      .post('/api/labs/secure-lab/submit')
      .set('X-CSRF-Token', tokenA)
      .send({ submission: { confirmation: 'wrong' }, points: 9999 });
    expect(response.status).toBe(400);
    expect(await prisma.labProgress.count({ where: { status: 'COMPLETED' } })).toBe(0);
  });

  it('rejects invalid submissions and accepts only the safe placeholder validator', async () => {
    await createPublishedLab();
    const { agent, token } = await authenticatedAgent('learner', 'learner@example.test');
    await agent.post('/api/labs/secure-lab/start').set('X-CSRF-Token', token).send({}).expect(200);
    const invalid = await agent
      .post('/api/labs/secure-lab/submit')
      .set('X-CSRF-Token', token)
      .send({ submission: { confirmation: 'wrong' } })
      .expect(200);
    expect(invalid.body.data.completed).toBe(false);
    expect(await prisma.labProgress.findFirstOrThrow()).toMatchObject({ status: 'IN_PROGRESS' });
    const valid = await agent
      .post('/api/labs/secure-lab/submit')
      .set('X-CSRF-Token', token)
      .send({ submission: { confirmation: 'CYBERLAB_READY' } })
      .expect(200);
    expect(valid.body.data.completed).toBe(true);
    expect(await prisma.labProgress.findFirstOrThrow()).toMatchObject({ status: 'COMPLETED' });
  });

  it('keeps the Product Search target session-scoped and exposes its hidden data only through the lab interaction', async () => {
    await createSqlInjectionChallenge();
    await request(app)
      .get('/api/labs/sql-injection-basics/target/products?search=signal')
      .expect(401);
    const { agent, token } = await authenticatedAgent('learner', 'learner@example.test');
    await agent.get('/api/labs/sql-injection-basics/target/products?search=signal').expect(404);
    await agent
      .post('/api/labs/sql-injection-basics/start')
      .set('X-CSRF-Token', token)
      .send({})
      .expect(200);
    const normal = await agent
      .get('/api/labs/sql-injection-basics/target/products?search=signal')
      .expect(200);
    expect(JSON.stringify(normal.body)).not.toContain('CYBERLAB{product_search_tautology}');
    const injected = await agent
      .get('/api/labs/sql-injection-basics/target/products?search=%27%20OR%20%271%27%3D%271%27--')
      .expect(200);
    expect(JSON.stringify(injected.body)).toContain('CYBERLAB{product_search_tautology}');
  });

  it('validates a discovered flag on the server and completes progress idempotently', async () => {
    const lab = await createSqlInjectionChallenge();
    const { agent, token } = await authenticatedAgent('learner', 'learner@example.test');
    await agent
      .post('/api/labs/sql-injection-basics/start')
      .set('X-CSRF-Token', token)
      .send({})
      .expect(200);
    const wrong = await agent
      .post('/api/labs/sql-injection-basics/submit')
      .set('X-CSRF-Token', token)
      .send({ submission: { flag: 'wrong' } })
      .expect(200);
    expect(wrong.body.data.completed).toBe(false);
    const completed = await agent
      .post('/api/labs/sql-injection-basics/submit')
      .set('X-CSRF-Token', token)
      .send({ submission: { flag: 'CYBERLAB{product_search_tautology}' } })
      .expect(200);
    expect(completed.body.data).toMatchObject({
      completed: true,
      progress: { status: 'COMPLETED' },
      session: { status: 'COMPLETED' },
    });
    const repeated = await agent
      .post('/api/labs/sql-injection-basics/submit')
      .set('X-CSRF-Token', token)
      .send({ submission: { flag: 'wrong' } })
      .expect(200);
    expect(repeated.body.data).toMatchObject({
      completed: true,
      message: 'This lab is already completed.',
    });
    expect(await prisma.labProgress.count({ where: { labId: lab.id, status: 'COMPLETED' } })).toBe(
      1,
    );
  });

  it('isolates the Feedback Search XSS target behind authentication and an owned session', async () => {
    await createXssChallenge();
    await request(app).get('/api/labs/xss-fundamentals/target/feedback?feedback=hello').expect(401);
    const { agent, token } = await authenticatedAgent('learner', 'learner@example.test');
    await agent.get('/api/labs/xss-fundamentals/target/feedback?feedback=hello').expect(404);
    await agent.post('/api/labs/xss-fundamentals/start').set('X-CSRF-Token', token).send({}).expect(200);
    const normal = await agent.get('/api/labs/xss-fundamentals/target/feedback?feedback=hello').expect(200);
    expect(normal.body.data.document).toContain('hello');
    expect(normal.body.data.completionToken).toBeNull();
    const payload = "<script>document.getElementById('xss-status').textContent='Training script executed'</script>";
    const reflected = await agent.get('/api/labs/xss-fundamentals/target/feedback').query({ feedback: payload }).expect(200);
    expect(reflected.body.data.document).toContain(payload);
    expect(reflected.body.data.completionToken).toBe('XSS_PREVIEW_CONFIRMED');
    expect(JSON.stringify(reflected.body)).not.toContain('CYBERLAB{');
  });

  it('validates the XSS completion value with the existing server-side flow', async () => {
    const lab = await createXssChallenge();
    const { agent, token } = await authenticatedAgent('learner', 'learner@example.test');
    await agent.post('/api/labs/xss-fundamentals/start').set('X-CSRF-Token', token).send({}).expect(200);
    await agent.post('/api/labs/xss-fundamentals/submit').set('X-CSRF-Token', token).send({ submission: { flag: 'wrong' } }).expect(200);
    const completed = await agent.post('/api/labs/xss-fundamentals/submit').set('X-CSRF-Token', token).send({ submission: { flag: 'XSS_PREVIEW_CONFIRMED' } }).expect(200);
    expect(completed.body.data).toMatchObject({ completed: true, progress: { status: 'COMPLETED' }, session: { status: 'COMPLETED' } });
    const repeated = await agent.post('/api/labs/xss-fundamentals/submit').set('X-CSRF-Token', token).send({ submission: { flag: 'wrong' } }).expect(200);
    expect(repeated.body.data).toMatchObject({ completed: true, message: 'This lab is already completed.' });
    expect(await prisma.labProgress.count({ where: { labId: lab.id, status: 'COMPLETED' } })).toBe(1);
  });

  it('isolates the Profile Access IDOR target behind authentication and an owned session', async () => {
    await createIdorChallenge();
    await request(app).get('/api/labs/idor-fundamentals/target/profile?id=101').expect(401);
    const { agent, token } = await authenticatedAgent('platform_learner', 'learner@example.test');
    await agent.get('/api/labs/idor-fundamentals/target/profile?id=101').expect(404);
    await agent.post('/api/labs/idor-fundamentals/start').set('X-CSRF-Token', token).send({}).expect(200);
    const own = await agent.get('/api/labs/idor-fundamentals/target/profile?id=101').expect(200);
    expect(own.body.data).toMatchObject({ profile: { id: 101, owner: 'CURRENT_TRAINING_LEARNER' }, completionToken: null });
    expect(JSON.stringify(own.body)).not.toContain('platform_learner');
    const other = await agent.get('/api/labs/idor-fundamentals/target/profile?id=102').expect(200);
    expect(other.body.data).toMatchObject({ profile: { id: 102, owner: 'OTHER_TRAINING_USER' }, completionToken: 'IDOR_PROFILE_ACCESS_CONFIRMED' });
    expect(JSON.stringify(other.body)).not.toContain('CYBERLAB{');
    await agent.get('/api/labs/idor-fundamentals/target/profile?id=999').expect(404);
  });

  it('uses the existing validator and completion flow for the IDOR challenge', async () => {
    const lab = await createIdorChallenge();
    const { agent, token } = await authenticatedAgent('learner', 'learner@example.test');
    await agent.post('/api/labs/idor-fundamentals/start').set('X-CSRF-Token', token).send({}).expect(200);
    await agent.post('/api/labs/idor-fundamentals/submit').set('X-CSRF-Token', token).send({ submission: { flag: 'wrong' } }).expect(200);
    const completed = await agent.post('/api/labs/idor-fundamentals/submit').set('X-CSRF-Token', token).send({ submission: { flag: 'IDOR_PROFILE_ACCESS_CONFIRMED' } }).expect(200);
    expect(completed.body.data).toMatchObject({ completed: true, progress: { status: 'COMPLETED' }, session: { status: 'COMPLETED' } });
    const repeated = await agent.post('/api/labs/idor-fundamentals/submit').set('X-CSRF-Token', token).send({ submission: { flag: 'wrong' } }).expect(200);
    expect(repeated.body.data).toMatchObject({ completed: true, message: 'This lab is already completed.' });
    expect(await prisma.labProgress.count({ where: { labId: lab.id, status: 'COMPLETED' } })).toBe(1);
  });

  it('isolates the synthetic authentication target behind authentication and an owned lab session', async () => {
    await createAuthenticationBypassChallenge();
    await request(app).post('/api/labs/authentication-bypass-basics/target/login').send({ username: 'trainee', password: 'wrong' }).expect(401);
    const { agent, token } = await authenticatedAgent('platform_learner', 'learner@example.test');
    await agent.post('/api/labs/authentication-bypass-basics/target/login').set('X-CSRF-Token', token).send({ username: 'trainee', password: 'wrong' }).expect(404);
    await agent.post('/api/labs/authentication-bypass-basics/start').set('X-CSRF-Token', token).send({}).expect(200);
    const platformSession = await prisma.session.findFirstOrThrow();
    const normal = await agent.post('/api/labs/authentication-bypass-basics/target/login').set('X-CSRF-Token', token).send({ username: 'trainee', password: 'training-demo' }).expect(200);
    expect(normal.body.data).toMatchObject({ authenticated: true, role: 'learner', completionToken: null });
    const invalid = await agent.post('/api/labs/authentication-bypass-basics/target/login').set('X-CSRF-Token', token).send({ username: 'visitor', password: 'wrong' }).expect(200);
    expect(invalid.body.data).toMatchObject({ authenticated: false, completionToken: null });
    const bypassed = await agent.post('/api/labs/authentication-bypass-basics/target/login').set('X-CSRF-Token', token).send({ username: 'trainee', password: 'wrong' }).expect(200);
    expect(bypassed.body.data).toMatchObject({ authenticated: true, completionToken: 'AUTH_BYPASS_CONFIRMED' });
    expect(JSON.stringify(bypassed.body)).not.toContain('CYBERLAB{');
    expect(await prisma.session.findUnique({ where: { id: platformSession.id } })).not.toBeNull();
    expect(await prisma.session.count()).toBe(1);
  });

  it('uses the existing validator and completion flow for the authentication challenge', async () => {
    const lab = await createAuthenticationBypassChallenge();
    const { agent, token } = await authenticatedAgent('learner', 'learner@example.test');
    await agent.post('/api/labs/authentication-bypass-basics/start').set('X-CSRF-Token', token).send({}).expect(200);
    await agent.post('/api/labs/authentication-bypass-basics/submit').set('X-CSRF-Token', token).send({ submission: { flag: 'wrong' } }).expect(200);
    const completed = await agent.post('/api/labs/authentication-bypass-basics/submit').set('X-CSRF-Token', token).send({ submission: { flag: 'AUTH_BYPASS_CONFIRMED' } }).expect(200);
    expect(completed.body.data).toMatchObject({ completed: true, progress: { status: 'COMPLETED' }, session: { status: 'COMPLETED' } });
    const repeated = await agent.post('/api/labs/authentication-bypass-basics/submit').set('X-CSRF-Token', token).send({ submission: { flag: 'wrong' } }).expect(200);
    expect(repeated.body.data).toMatchObject({ completed: true, message: 'This lab is already completed.' });
    expect(await prisma.labProgress.count({ where: { labId: lab.id, status: 'COMPLETED' } })).toBe(1);
  });

  it('isolates the function authorization target behind authentication and an owned lab session', async () => {
    await createBrokenFunctionAccessChallenge();
    await request(app).get('/api/labs/broken-access-control/target/report?section=overview').expect(401);
    const { agent, token } = await authenticatedAgent('platform_learner', 'learner@example.test');
    await agent.get('/api/labs/broken-access-control/target/report?section=overview').expect(404);
    await agent.post('/api/labs/broken-access-control/start').set('X-CSRF-Token', token).send({}).expect(200);
    const overview = await agent.get('/api/labs/broken-access-control/target/report?section=overview').expect(200);
    expect(overview.body.data).toMatchObject({ section: 'overview', completionToken: null });
    const audit = await agent.get('/api/labs/broken-access-control/target/report?section=admin-audit').expect(200);
    expect(audit.body.data).toMatchObject({ section: 'admin-audit', completionToken: 'BROKEN_FUNCTION_ACCESS_CONFIRMED' });
    expect(JSON.stringify(audit.body)).not.toContain('platform_learner');
    await agent.get('/api/labs/broken-access-control/target/report?section=invalid').expect(400);
  });

  it('uses the existing validator and completion flow for the function authorization challenge', async () => {
    const lab = await createBrokenFunctionAccessChallenge();
    const { agent, token } = await authenticatedAgent('learner', 'learner@example.test');
    await agent.post('/api/labs/broken-access-control/start').set('X-CSRF-Token', token).send({}).expect(200);
    const wrong = await agent.post('/api/labs/broken-access-control/submit').set('X-CSRF-Token', token).send({ submission: { flag: 'wrong' } }).expect(200);
    expect(wrong.body.data.completed).toBe(false);
    const completed = await agent.post('/api/labs/broken-access-control/submit').set('X-CSRF-Token', token).send({ submission: { flag: 'BROKEN_FUNCTION_ACCESS_CONFIRMED' } }).expect(200);
    expect(completed.body.data).toMatchObject({ completed: true, progress: { status: 'COMPLETED' }, session: { status: 'COMPLETED' } });
    expect(await prisma.labProgress.count({ where: { labId: lab.id, status: 'COMPLETED' } })).toBe(1);
  });

  it('isolates the SSRF mock fetch target behind authentication and an owned lab session', async () => {
    await createSsrfChallenge();
    await request(app).get('/api/labs/ssrf/fetch?url=%2Fpublic%2Fstatus').expect(401);
    const { agent, token } = await authenticatedAgent('platform_learner', 'learner@example.test');
    await agent.get('/api/labs/ssrf/fetch?url=%2Fpublic%2Fstatus').expect(404);
    await agent.post('/api/labs/ssrf/start').set('X-CSRF-Token', token).send({}).expect(200);
    const publicResponse = await agent.get('/api/labs/ssrf/fetch?url=%2Fpublic%2Fstatus').expect(200);
    expect(publicResponse.body.data).toMatchObject({ path: '/public/status', completionToken: null });
    const internalResponse = await agent.get('/api/labs/ssrf/fetch?url=%2Finternal%2Fadmin-config').expect(200);
    expect(internalResponse.body.data).toMatchObject({ path: '/internal/admin-config', completionToken: 'SSRF_INTERNAL_CONFIG_CONFIRMED' });
    expect(JSON.stringify(internalResponse.body)).not.toContain('platform_learner');
    expect(JSON.stringify(internalResponse.body)).not.toContain('DATABASE_URL');
  });

  it('rejects network destinations and non-mock paths in the SSRF target', async () => {
    await createSsrfChallenge();
    const { agent, token } = await authenticatedAgent('learner', 'learner@example.test');
    await agent.post('/api/labs/ssrf/start').set('X-CSRF-Token', token).send({}).expect(200);
    for (const url of [
      'http://example.com', 'https://example.com', '//example.com', 'http://localhost:3000',
      'localhost', '127.0.0.1', '::1', '10.0.0.5', '172.16.0.5', '192.168.1.10',
      '169.254.169.254', 'http://127.0.0.1', 'http://[::1]', 'http://169.254.169.254',
      '/public/status:8080', 'external-host', '/not-a-mock-resource',
    ]) {
      await agent.get('/api/labs/ssrf/fetch').query({ url }).expect(400);
    }
  });

  it('uses the existing validator and completion flow for the SSRF challenge', async () => {
    const lab = await createSsrfChallenge();
    const { agent, token } = await authenticatedAgent('learner', 'learner@example.test');
    await agent.post('/api/labs/ssrf/start').set('X-CSRF-Token', token).send({}).expect(200);
    const wrong = await agent.post('/api/labs/ssrf/submit').set('X-CSRF-Token', token).send({ submission: { flag: 'wrong' } }).expect(200);
    expect(wrong.body.data.completed).toBe(false);
    const completed = await agent.post('/api/labs/ssrf/submit').set('X-CSRF-Token', token).send({ submission: { flag: 'SSRF_INTERNAL_CONFIG_CONFIRMED' } }).expect(200);
    expect(completed.body.data).toMatchObject({ completed: true, progress: { status: 'COMPLETED' }, session: { status: 'COMPLETED' } });
    expect(await prisma.labProgress.count({ where: { labId: lab.id, status: 'COMPLETED' } })).toBe(1);
  });

  it('isolates the SQLi directory target behind authentication and an owned lab session', async () => {
    await createSqliChallenge();
    await request(app).get('/api/labs/sqli/search?q=alice').expect(401);
    const { agent, token } = await authenticatedAgent('platform_learner', 'learner@example.test');
    await agent.get('/api/labs/sqli/search?q=alice').expect(404);
    await agent.post('/api/labs/sqli/start').set('X-CSRF-Token', token).send({}).expect(200);
    const normal = await agent.get('/api/labs/sqli/search?q=alice').expect(200);
    expect(normal.body.data.records).toEqual([{ id: 1, username: 'alice', role: 'student' }]);
    expect(JSON.stringify(normal.body)).not.toContain('SQLI_DIRECTORY_ACCESS_CONFIRMED');
    const injected = await agent.get('/api/labs/sqli/search').query({ q: "alice' OR '1'='1" }).expect(200);
    expect(injected.body.data.records).toEqual(expect.arrayContaining([expect.objectContaining({ username: 'auditor', role: 'admin', status: 'internal-review', flag: 'SQLI_DIRECTORY_ACCESS_CONFIRMED' })]));
    expect(JSON.stringify(injected.body)).not.toContain('platform_learner');
    expect(JSON.stringify(injected.body)).not.toContain('DATABASE_URL');
  });

  it('rejects unsupported SQL constructs in the SQLi directory target', async () => {
    await createSqliChallenge();
    const { agent, token } = await authenticatedAgent('learner', 'learner@example.test');
    await agent.post('/api/labs/sqli/start').set('X-CSRF-Token', token).send({}).expect(200);
    for (const q of ['alice; DROP TABLE users', 'UNION SELECT * FROM users', 'alice -- comment', 'PRAGMA database_list']) {
      await agent.get('/api/labs/sqli/search').query({ q }).expect(400);
    }
  });

  it('uses the existing validator and completion flow for the SQLi challenge', async () => {
    const lab = await createSqliChallenge();
    const { agent, token } = await authenticatedAgent('learner', 'learner@example.test');
    await agent.post('/api/labs/sqli/start').set('X-CSRF-Token', token).send({}).expect(200);
    const wrong = await agent.post('/api/labs/sqli/submit').set('X-CSRF-Token', token).send({ submission: { flag: 'wrong' } }).expect(200);
    expect(wrong.body.data.completed).toBe(false);
    const completed = await agent.post('/api/labs/sqli/submit').set('X-CSRF-Token', token).send({ submission: { flag: 'SQLI_DIRECTORY_ACCESS_CONFIRMED' } }).expect(200);
    expect(completed.body.data).toMatchObject({ completed: true, progress: { status: 'COMPLETED' }, session: { status: 'COMPLETED' } });
    expect(await prisma.labProgress.count({ where: { labId: lab.id, status: 'COMPLETED' } })).toBe(1);
  });

  it('keeps profile uploads isolated, serves normal images only as downloads, and accepts the intended weak-validation mismatch', async () => {
    await createFileUploadChallenge();
    await request(app).post('/api/labs/file-upload-validation/target/upload').expect(401);
    const { agent, token } = await authenticatedAgent('platform_learner', 'learner@example.test');
    await agent.post('/api/labs/file-upload-validation/target/upload')
      .set('X-CSRF-Token', token).set('Content-Type', 'application/octet-stream')
      .set('X-Upload-Filename', 'portrait.png').set('X-Upload-Mime-Type', 'image/png')
      .send(Buffer.from('fixture')).expect(404);
    await agent.post('/api/labs/file-upload-validation/start').set('X-CSRF-Token', token).send({}).expect(200);

    const rejected = await agent.post('/api/labs/file-upload-validation/target/upload')
      .set('X-CSRF-Token', token).set('Content-Type', 'application/octet-stream')
      .set('X-Upload-Filename', 'notes.txt').set('X-Upload-Mime-Type', 'image/png')
      .send(Buffer.from('harmless plain text')).expect(200);
    expect(rejected.body.data).toMatchObject({ accepted: false, completionToken: null });

    const normal = await agent.post('/api/labs/file-upload-validation/target/upload')
      .set('X-CSRF-Token', token).set('Content-Type', 'application/octet-stream')
      .set('X-Upload-Filename', 'portrait.png').set('X-Upload-Mime-Type', 'image/png')
      .send(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])).expect(200);
    expect(normal.body.data).toMatchObject({ accepted: true, filename: 'portrait.png', completionToken: null });
    const normalDownload = await agent.get(`/api/labs/file-upload-validation/target/files/${normal.body.data.id}`).expect(200);
    expect(normalDownload.headers['content-type']).toContain('application/octet-stream');
    expect(normalDownload.headers['content-disposition']).toContain('attachment');
    expect(normalDownload.headers['x-content-type-options']).toBe('nosniff');
    expect(normalDownload.body).toEqual(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));

    const mismatch = await agent.post('/api/labs/file-upload-validation/target/upload')
      .set('X-CSRF-Token', token).set('Content-Type', 'application/octet-stream')
      .set('X-Upload-Filename', 'notes.png').set('X-Upload-Mime-Type', 'image/png')
      .send(Buffer.from('harmless plain text, never executed')).expect(200);
    expect(mismatch.body.data).toMatchObject({ accepted: true, filename: 'notes.png', completionToken: 'FILE_UPLOAD_MISMATCH_CONFIRMED' });
    expect(JSON.stringify(mismatch.body)).not.toContain('platform_learner');
    await agent.get('/api/labs/file-upload-validation/target/files/../../package.json').expect(404);

    const otherLearner = await authenticatedAgent('other_learner', 'other@example.test');
    await otherLearner.agent.post('/api/labs/file-upload-validation/start').set('X-CSRF-Token', otherLearner.token).send({}).expect(200);
    await otherLearner.agent.get(`/api/labs/file-upload-validation/target/files/${mismatch.body.data.id}`).expect(404);
  });

  it('validates File Upload only after the intended mismatched target interaction', async () => {
    const lab = await createFileUploadChallenge();
    const { agent, token } = await authenticatedAgent('learner', 'learner@example.test');
    await agent.post('/api/labs/file-upload-validation/start').set('X-CSRF-Token', token).send({}).expect(200);
    const premature = await agent.post('/api/labs/file-upload-validation/submit').set('X-CSRF-Token', token).send({ submission: { flag: 'FILE_UPLOAD_MISMATCH_CONFIRMED' } }).expect(200);
    expect(premature.body.data.completed).toBe(false);
    await agent.post('/api/labs/file-upload-validation/target/upload')
      .set('X-CSRF-Token', token).set('Content-Type', 'application/octet-stream')
      .set('X-Upload-Filename', 'proof.gif').set('X-Upload-Mime-Type', 'image/gif')
      .send(Buffer.from('safe text fixture')).expect(200);
    const completed = await agent.post('/api/labs/file-upload-validation/submit').set('X-CSRF-Token', token).send({ submission: { flag: 'FILE_UPLOAD_MISMATCH_CONFIRMED' } }).expect(200);
    expect(completed.body.data).toMatchObject({ completed: true, progress: { status: 'COMPLETED' }, session: { status: 'COMPLETED' } });
    expect(await prisma.labProgress.count({ where: { labId: lab.id, status: 'COMPLETED' } })).toBe(1);
  });

  it('keeps the CSRF target session-isolated while accepting the intended tokenless request', async () => {
    await createCsrfChallenge();
    await request(app).post('/api/labs/csrf/target/settings').type('form').send({ notificationsEnabled: 'false' }).expect(401);
    const { agent, token } = await authenticatedAgent('learner', 'learner@example.test');
    await agent.get('/api/labs/csrf/target/settings').expect(404);
    await agent.post('/api/labs/csrf/start').set('X-CSRF-Token', token).send({}).expect(200);
    await agent.post('/api/labs/csrf/target/settings/secure').send({ notificationsEnabled: false }).expect(403);
    const protectedChange = await agent.post('/api/labs/csrf/target/settings/secure').set('X-CSRF-Token', token).send({ notificationsEnabled: false }).expect(200);
    expect(protectedChange.body.data).toMatchObject({ notificationsEnabled: false, lastChangeUsedValidCsrfToken: true, completionToken: null });
    const forged = await agent.post('/api/labs/csrf/target/settings').type('form').send({ notificationsEnabled: 'false' }).expect(200);
    expect(forged.body.data).toMatchObject({ notificationsEnabled: false, lastChangeUsedValidCsrfToken: false, completionToken: 'CSRF_NOTIFICATION_CHANGE_CONFIRMED' });
  });

  it('completes CSRF only after the tokenless target interaction', async () => {
    await createCsrfChallenge(); const { agent, token } = await authenticatedAgent('learner', 'learner@example.test');
    await agent.post('/api/labs/csrf/start').set('X-CSRF-Token', token).send({}).expect(200);
    const premature = await agent.post('/api/labs/csrf/submit').set('X-CSRF-Token', token).send({ submission: { flag: 'CSRF_NOTIFICATION_CHANGE_CONFIRMED' } }).expect(200);
    expect(premature.body.data.completed).toBe(false);
    await agent.post('/api/labs/csrf/target/settings').type('form').send({ notificationsEnabled: 'false' }).expect(200);
    const completed = await agent.post('/api/labs/csrf/submit').set('X-CSRF-Token', token).send({ submission: { flag: 'CSRF_NOTIFICATION_CHANGE_CONFIRMED' } }).expect(200);
    expect(completed.body.data).toMatchObject({ completed: true, progress: { status: 'COMPLETED' } });
  });

  it('does not allow direct completion before validation', async () => {
    await createPublishedLab();
    const { agent, token } = await authenticatedAgent('learner', 'learner@example.test');
    await agent.post('/api/labs/secure-lab/start').set('X-CSRF-Token', token).send({}).expect(200);
    const response = await agent
      .post('/api/labs/secure-lab/complete')
      .set('X-CSRF-Token', token)
      .send({});
    expect(response.status).toBe(409);
    expect(response.body.error.code).toBe('LAB_NOT_VALIDATED');
  });

  it('enforces one progress record per user and lab with working relations', async () => {
    const lab = await createPublishedLab();
    const user = await createUser('learner', 'learner@example.test');
    await prisma.labProgress.create({
      data: { userId: user.id, labId: lab.id, status: 'IN_PROGRESS', startedAt: new Date() },
    });
    await expect(
      prisma.labProgress.create({
        data: { userId: user.id, labId: lab.id, status: 'IN_PROGRESS', startedAt: new Date() },
      }),
    ).rejects.toMatchObject({ code: 'P2002' });
    const entry = await prisma.labProgress.findUniqueOrThrow({
      where: { userId_labId: { userId: user.id, labId: lab.id } },
      include: { user: true, lab: true },
    });
    expect(entry.user.id).toBe(user.id);
    expect(entry.lab.id).toBe(lab.id);
  });

  it('enforces unique challenge slugs and retains published/draft state', async () => {
    const challenge = await createSqlInjectionChallenge();
    await expect(
      prisma.lab.create({ data: { ...challenge, id: undefined } }),
    ).rejects.toMatchObject({ code: 'P2002' });
    await prisma.lab.update({ where: { id: challenge.id }, data: { isPublished: false } });
    await request(app).get('/api/labs/sql-injection-basics').expect(404);
  });
});
