import { describe, expect, it } from 'vitest';
import '../helpers/lab-test-setup.js';
import request from 'supertest';
import { app } from '../../src/app.js';
import { prisma } from '../../src/lib/prisma.js';
import { createSqliChallenge, authenticatedAgent } from '../helpers/lab-test-fixtures.js';

describe('lab API: sqli-directory', () => {
  it('isolates the SQLi directory target behind authentication and an owned lab session', async () => {
    await createSqliChallenge();
    await request(app).get('/api/labs/sqli/search?q=alice').expect(401);
    const { agent, token } = await authenticatedAgent('platform_learner', 'learner@example.test');
    await agent.get('/api/labs/sqli/search?q=alice').expect(404);
    await agent.post('/api/labs/sqli/start').set('X-CSRF-Token', token).send({}).expect(200);
    const normal = await agent.get('/api/labs/sqli/search?q=alice').expect(200);
    expect(normal.body.data.records).toEqual([{ id: 1, username: 'alice', role: 'student' }]);
    expect(JSON.stringify(normal.body)).not.toContain('SQLI_DIRECTORY_ACCESS_CONFIRMED');
    const injected = await agent
      .get('/api/labs/sqli/search')
      .query({ q: "alice' OR '1'='1" })
      .expect(200);
    expect(injected.body.data.records).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          username: 'auditor',
          role: 'admin',
          status: 'internal-review',
          flag: 'SQLI_DIRECTORY_ACCESS_CONFIRMED',
        }),
      ]),
    );
    expect(JSON.stringify(injected.body)).not.toContain('platform_learner');
    expect(JSON.stringify(injected.body)).not.toContain('DATABASE_URL');
  });

  it('rejects unsupported SQL constructs in the SQLi directory target', async () => {
    await createSqliChallenge();
    const { agent, token } = await authenticatedAgent('learner', 'learner@example.test');
    await agent.post('/api/labs/sqli/start').set('X-CSRF-Token', token).send({}).expect(200);
    for (const q of [
      'alice; DROP TABLE users',
      'UNION SELECT * FROM users',
      'alice -- comment',
      'PRAGMA database_list',
    ]) {
      await agent.get('/api/labs/sqli/search').query({ q }).expect(400);
    }
  });

  it('uses the existing validator and completion flow for the SQLi challenge', async () => {
    const lab = await createSqliChallenge();
    const { agent, token } = await authenticatedAgent('learner', 'learner@example.test');
    await agent.post('/api/labs/sqli/start').set('X-CSRF-Token', token).send({}).expect(200);
    const wrong = await agent
      .post('/api/labs/sqli/submit')
      .set('X-CSRF-Token', token)
      .send({ submission: { flag: 'wrong' } })
      .expect(200);
    expect(wrong.body.data.completed).toBe(false);
    const completed = await agent
      .post('/api/labs/sqli/submit')
      .set('X-CSRF-Token', token)
      .send({ submission: { flag: 'SQLI_DIRECTORY_ACCESS_CONFIRMED' } })
      .expect(200);
    expect(completed.body.data).toMatchObject({
      completed: true,
      progress: { status: 'COMPLETED' },
      session: { status: 'COMPLETED' },
    });
    expect(await prisma.labProgress.count({ where: { labId: lab.id, status: 'COMPLETED' } })).toBe(
      1,
    );
  });
});
