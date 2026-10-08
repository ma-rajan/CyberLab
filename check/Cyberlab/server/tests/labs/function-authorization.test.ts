import { describe, expect, it } from 'vitest';
import '../helpers/lab-test-setup.js';
import request from 'supertest';
import { app } from '../../src/app.js';
import { prisma } from '../../src/lib/prisma.js';
import {
  createBrokenFunctionAccessChallenge,
  authenticatedAgent,
} from '../helpers/lab-test-fixtures.js';

describe('lab API: function-authorization', () => {
  it('returns published function authorization metadata without private validator data and hides drafts', async () => {
    await createBrokenFunctionAccessChallenge();
    const response = await request(app).get('/api/labs/broken-access-control').expect(200);
    expect(response.body.data.lab).toMatchObject({
      title: 'Broken Function-Level Authorization',
      challengeType: 'BROKEN_FUNCTION_ACCESS',
    });
    expect(JSON.stringify(response.body)).not.toContain('flagHash');
    expect(JSON.stringify(response.body)).not.toContain('validatorType');
    expect(JSON.stringify(response.body)).not.toContain('BROKEN_FUNCTION_ACCESS_CONFIRMED');
    await prisma.lab.update({
      where: { slug: 'broken-access-control' },
      data: { isPublished: false },
    });
    await request(app).get('/api/labs/broken-access-control').expect(404);
  });

  it('isolates the function authorization target behind authentication and an owned lab session', async () => {
    await createBrokenFunctionAccessChallenge();
    await request(app)
      .get('/api/labs/broken-access-control/target/report?section=overview')
      .expect(401);
    const { agent, token } = await authenticatedAgent('platform_learner', 'learner@example.test');
    await agent.get('/api/labs/broken-access-control/target/report?section=overview').expect(404);
    await agent
      .post('/api/labs/broken-access-control/start')
      .set('X-CSRF-Token', token)
      .send({})
      .expect(200);
    const overview = await agent
      .get('/api/labs/broken-access-control/target/report?section=overview')
      .expect(200);
    expect(overview.body.data).toMatchObject({ section: 'overview', completionToken: null });
    const audit = await agent
      .get('/api/labs/broken-access-control/target/report?section=admin-audit')
      .expect(200);
    expect(audit.body.data).toMatchObject({
      section: 'admin-audit',
      completionToken: 'BROKEN_FUNCTION_ACCESS_CONFIRMED',
    });
    expect(JSON.stringify(audit.body)).not.toContain('platform_learner');
    await agent.get('/api/labs/broken-access-control/target/report?section=invalid').expect(400);
  });

  it('uses the existing validator and completion flow for the function authorization challenge', async () => {
    const lab = await createBrokenFunctionAccessChallenge();
    const { agent, token } = await authenticatedAgent('learner', 'learner@example.test');
    await agent
      .post('/api/labs/broken-access-control/start')
      .set('X-CSRF-Token', token)
      .send({})
      .expect(200);
    const wrong = await agent
      .post('/api/labs/broken-access-control/submit')
      .set('X-CSRF-Token', token)
      .send({ submission: { flag: 'wrong' } })
      .expect(200);
    expect(wrong.body.data.completed).toBe(false);
    const completed = await agent
      .post('/api/labs/broken-access-control/submit')
      .set('X-CSRF-Token', token)
      .send({ submission: { flag: 'BROKEN_FUNCTION_ACCESS_CONFIRMED' } })
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
