import { describe, expect, it } from 'vitest';
import '../helpers/lab-test-setup.js';
import request from 'supertest';
import { app } from '../../src/app.js';
import { prisma } from '../../src/lib/prisma.js';
import { authenticatedAgent, createPathTraversalChallenge } from '../helpers/lab-test-fixtures.js';

describe('lab API: path traversal', () => {
  it('publishes safe challenge metadata without exposing validator data', async () => {
    await createPathTraversalChallenge();
    const response = await request(app).get('/api/labs/path-traversal').expect(200);
    expect(response.body.data.lab).toMatchObject({
      title: 'Path Traversal',
      challengeType: 'PATH_TRAVERSAL',
      objective: expect.any(String),
      instructions: expect.any(String),
      hints: expect.arrayContaining([expect.any(String)]),
    });
    expect(JSON.stringify(response.body)).not.toContain('flagHash');
    expect(JSON.stringify(response.body)).not.toContain('validatorType');
    expect(JSON.stringify(response.body)).not.toContain('PATH_TRAVERSAL_CONFIRMED');
    await prisma.lab.update({ where: { slug: 'path-traversal' }, data: { isPublished: false } });
    await request(app).get('/api/labs/path-traversal').expect(404);
  });

  it('gates virtual file reads behind authentication and the learner owned lab session', async () => {
    await createPathTraversalChallenge();
    await request(app).get('/api/labs/path-traversal/read?file=readme.txt').expect(401);
    const { agent, token } = await authenticatedAgent('path_learner', 'path@example.test');
    await agent.get('/api/labs/path-traversal/read?file=readme.txt').expect(404);
    await agent.post('/api/labs/path-traversal/start').set('X-CSRF-Token', token).send({}).expect(200);

    const publicFile = await agent.get('/api/labs/path-traversal/read?file=readme.txt').expect(200);
    expect(publicFile.body.data).toMatchObject({
      resolvedPath: '/public/readme.txt',
      completionToken: null,
    });
    expect(publicFile.body.data.content).toContain('Training document');

    const traversed = await agent
      .get('/api/labs/path-traversal/read')
      .query({ file: '../private/maintenance.txt' })
      .expect(200);
    expect(traversed.body.data).toMatchObject({
      resolvedPath: '/private/maintenance.txt',
      completionToken: 'PATH_TRAVERSAL_CONFIRMED',
    });
    expect(JSON.stringify(traversed.body)).not.toContain('path_learner');
  });

  it('rejects invalid or unmapped paths and never reveals real system files', async () => {
    await createPathTraversalChallenge();
    const { agent, token } = await authenticatedAgent('path_reader', 'reader@example.test');
    await agent.post('/api/labs/path-traversal/start').set('X-CSRF-Token', token).send({}).expect(200);

    for (const file of [
      '',
      'missing.txt',
      '../../etc/passwd',
      '../../../etc/hosts',
      '/etc/passwd',
      'x'.repeat(161),
    ]) {
      const response = await agent.get('/api/labs/path-traversal/read').query({ file });
      expect([400, 404]).toContain(response.status);
      expect(JSON.stringify(response.body)).not.toContain('root:');
    }
  });

  it('requires each learner to perform their own restricted read before completion', async () => {
    await createPathTraversalChallenge();
    const first = await authenticatedAgent('path_first', 'first-path@example.test');
    const second = await authenticatedAgent('path_second', 'second-path@example.test');
    for (const learner of [first, second]) {
      await learner.agent.post('/api/labs/path-traversal/start').set('X-CSRF-Token', learner.token).send({}).expect(200);
    }
    await first.agent.get('/api/labs/path-traversal/read').query({ file: '../private/maintenance.txt' }).expect(200);

    const secondAttempt = await second.agent
      .post('/api/labs/path-traversal/submit')
      .set('X-CSRF-Token', second.token)
      .send({ submission: { flag: 'PATH_TRAVERSAL_CONFIRMED' } })
      .expect(200);
    expect(secondAttempt.body.data.completed).toBe(false);

    await second.agent.get('/api/labs/path-traversal/read').query({ file: '../private/maintenance.txt' }).expect(200);
    const completion = await second.agent
      .post('/api/labs/path-traversal/submit')
      .set('X-CSRF-Token', second.token)
      .send({ submission: { flag: 'PATH_TRAVERSAL_CONFIRMED' } })
      .expect(200);
    expect(completion.body.data).toMatchObject({
      completed: true,
      progress: { status: 'COMPLETED' },
      session: { status: 'COMPLETED' },
    });
    expect(await prisma.labProgress.count({ where: { status: 'COMPLETED' } })).toBe(1);
  });
});
