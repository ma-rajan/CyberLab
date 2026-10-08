import { describe, expect, it } from 'vitest';
import '../helpers/lab-test-setup.js';
import request from 'supertest';
import { app } from '../../src/app.js';
import { prisma } from '../../src/lib/prisma.js';
import { createSsrfChallenge, authenticatedAgent } from '../helpers/lab-test-fixtures.js';

describe('lab API: ssrf', () => {
  it('returns published SSRF metadata without private validator data and hides drafts', async () => {
    await createSsrfChallenge();
    const response = await request(app).get('/api/labs/ssrf').expect(200);
    expect(response.body.data.lab).toMatchObject({
      title: 'Server-Side Request Forgery',
      challengeType: 'SSRF_MOCK_FETCH',
    });
    expect(JSON.stringify(response.body)).not.toContain('flagHash');
    expect(JSON.stringify(response.body)).not.toContain('validatorType');
    expect(JSON.stringify(response.body)).not.toContain('SSRF_INTERNAL_CONFIG_CONFIRMED');
    await prisma.lab.update({ where: { slug: 'ssrf' }, data: { isPublished: false } });
    await request(app).get('/api/labs/ssrf').expect(404);
  });

  it('isolates the SSRF mock fetch target behind authentication and an owned lab session', async () => {
    await createSsrfChallenge();
    await request(app).get('/api/labs/ssrf/fetch?url=%2Fpublic%2Fstatus').expect(401);
    const { agent, token } = await authenticatedAgent('platform_learner', 'learner@example.test');
    await agent.get('/api/labs/ssrf/fetch?url=%2Fpublic%2Fstatus').expect(404);
    await agent.post('/api/labs/ssrf/start').set('X-CSRF-Token', token).send({}).expect(200);
    const publicResponse = await agent
      .get('/api/labs/ssrf/fetch?url=%2Fpublic%2Fstatus')
      .expect(200);
    expect(publicResponse.body.data).toMatchObject({
      path: '/public/status',
      completionToken: null,
    });
    const internalResponse = await agent
      .get('/api/labs/ssrf/fetch?url=%2Finternal%2Fadmin-config')
      .expect(200);
    expect(internalResponse.body.data).toMatchObject({
      path: '/internal/admin-config',
      completionToken: 'SSRF_INTERNAL_CONFIG_CONFIRMED',
    });
    expect(JSON.stringify(internalResponse.body)).not.toContain('platform_learner');
    expect(JSON.stringify(internalResponse.body)).not.toContain('DATABASE_URL');
  });

  it('rejects network destinations and non-mock paths in the SSRF target', async () => {
    await createSsrfChallenge();
    const { agent, token } = await authenticatedAgent('learner', 'learner@example.test');
    await agent.post('/api/labs/ssrf/start').set('X-CSRF-Token', token).send({}).expect(200);
    for (const url of [
      'http://example.com',
      'https://example.com',
      '//example.com',
      'http://localhost:3000',
      'localhost',
      '127.0.0.1',
      '::1',
      '10.0.0.5',
      '172.16.0.5',
      '192.168.1.10',
      '169.254.169.254',
      'http://127.0.0.1',
      'http://[::1]',
      'http://169.254.169.254',
      '/public/status:8080',
      'external-host',
      '/not-a-mock-resource',
    ]) {
      await agent.get('/api/labs/ssrf/fetch').query({ url }).expect(400);
    }
  });

  it('uses the existing validator and completion flow for the SSRF challenge', async () => {
    const lab = await createSsrfChallenge();
    const { agent, token } = await authenticatedAgent('learner', 'learner@example.test');
    await agent.post('/api/labs/ssrf/start').set('X-CSRF-Token', token).send({}).expect(200);
    const wrong = await agent
      .post('/api/labs/ssrf/submit')
      .set('X-CSRF-Token', token)
      .send({ submission: { flag: 'wrong' } })
      .expect(200);
    expect(wrong.body.data.completed).toBe(false);
    const completed = await agent
      .post('/api/labs/ssrf/submit')
      .set('X-CSRF-Token', token)
      .send({ submission: { flag: 'SSRF_INTERNAL_CONFIG_CONFIRMED' } })
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
