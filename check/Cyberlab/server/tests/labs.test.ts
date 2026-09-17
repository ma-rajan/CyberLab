import bcrypt from 'bcryptjs';
import request from 'supertest';
import { beforeEach, describe, expect, it } from 'vitest';
import { app } from '../src/app.js';
import { prisma } from '../src/lib/prisma.js';
import { authRateLimitStore } from '../src/middleware/auth-rate-limit.js';

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

async function csrf(agent: ReturnType<typeof request.agent>) {
  return (await agent.get('/api/auth/csrf')).body.data.csrfToken as string;
}

async function authenticatedAgent(username: string, email: string) {
  await createUser(username, email);
  const agent = request.agent(app);
  const token = await csrf(agent);
  await agent.post('/api/auth/login').set('X-CSRF-Token', token).send({ email, password }).expect(200);
  return { agent, token };
}

async function loginAgent(email: string) {
  const agent = request.agent(app);
  const token = await csrf(agent);
  await agent.post('/api/auth/login').set('X-CSRF-Token', token).send({ email, password }).expect(200);
  return { agent, token };
}

beforeEach(async () => {
  authRateLimitStore.resetAll();
  await prisma.labProgress.deleteMany();
  await prisma.lab.deleteMany();
  await prisma.session.deleteMany();
  await prisma.auditLog.deleteMany();
  await prisma.user.deleteMany();
});

describe('lab API', () => {
  it('returns only published labs with public metadata', async () => {
    await createPublishedLab('published-lab');
    await prisma.lab.create({
      data: {
        slug: 'unpublished-lab', title: 'Private', description: 'Private metadata.', category: 'OTHER',
        difficulty: 'ADVANCED', estimatedMinutes: 10, points: 1, isPublished: false,
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
        slug: 'unpublished-lab', title: 'Private', description: 'Private metadata.', category: 'OTHER',
        difficulty: 'ADVANCED', estimatedMinutes: 10, points: 1, isPublished: false,
      },
    });
    await request(app).get('/api/labs/published-lab').expect(200);
    await request(app).get('/api/labs/missing-lab').expect(404);
    await request(app).get('/api/labs/unpublished-lab').expect(404);
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
    const first = await agent.post('/api/labs/secure-lab/start').set('X-CSRF-Token', token).send({}).expect(200);
    const second = await agent.post('/api/labs/secure-lab/start').set('X-CSRF-Token', token).send({}).expect(200);
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
    expect(await prisma.labProgress.findUnique({ where: { userId_labId: { userId: userA.id, labId: lab.id } } })).not.toBeNull();
    expect(await prisma.labProgress.findUnique({ where: { userId_labId: { userId: userB.id, labId: lab.id } } })).not.toBeNull();
  });

  it('completes only the current user progress and preserves another user progress', async () => {
    const lab = await createPublishedLab();
    const { agent: agentA, token: tokenA } = await authenticatedAgent('learner_a', 'a@example.test');
    const { agent: agentB, token: tokenB } = await authenticatedAgent('learner_b', 'b@example.test');
    await agentA.post('/api/labs/secure-lab/start').set('X-CSRF-Token', tokenA).send({}).expect(200);
    await agentB.post('/api/labs/secure-lab/start').set('X-CSRF-Token', tokenB).send({}).expect(200);
    const completed = await agentA.post('/api/labs/secure-lab/complete').set('X-CSRF-Token', tokenA).send({}).expect(200);
    expect(completed.body.data.progress.status).toBe('COMPLETED');
    expect(completed.body.data.progress.completedAt).toBeTruthy();
    const [aEntry, bEntry] = await prisma.labProgress.findMany({ where: { labId: lab.id }, orderBy: { userId: 'asc' } });
    expect([aEntry.status, bEntry.status].sort()).toEqual(['COMPLETED', 'IN_PROGRESS']);
  });

  it('enforces one progress record per user and lab with working relations', async () => {
    const lab = await createPublishedLab();
    const user = await createUser('learner', 'learner@example.test');
    await prisma.labProgress.create({ data: { userId: user.id, labId: lab.id, status: 'IN_PROGRESS', startedAt: new Date() } });
    await expect(
      prisma.labProgress.create({ data: { userId: user.id, labId: lab.id, status: 'IN_PROGRESS', startedAt: new Date() } }),
    ).rejects.toMatchObject({ code: 'P2002' });
    const entry = await prisma.labProgress.findUniqueOrThrow({
      where: { userId_labId: { userId: user.id, labId: lab.id } }, include: { user: true, lab: true },
    });
    expect(entry.user.id).toBe(user.id);
    expect(entry.lab.id).toBe(lab.id);
  });
});
