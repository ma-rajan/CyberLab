import { describe, expect, it } from 'vitest';
import '../helpers/lab-test-setup.js';
import request from 'supertest';
import { app } from '../../src/app.js';
import { prisma } from '../../src/lib/prisma.js';
import {
  createAuthenticationBypassChallenge,
  authenticatedAgent,
} from '../helpers/lab-test-fixtures.js';

describe('lab API: authentication-bypass', () => {
  it('returns published authentication challenge metadata without private validator data and hides drafts', async () => {
    await createAuthenticationBypassChallenge();
    const response = await request(app).get('/api/labs/authentication-bypass-basics').expect(200);
    expect(response.body.data.lab).toMatchObject({
      title: 'Authentication Bypass Basics',
      challengeType: 'AUTHENTICATION_BYPASS',
    });
    expect(JSON.stringify(response.body)).not.toContain('flagHash');
    expect(JSON.stringify(response.body)).not.toContain('validatorType');
    expect(JSON.stringify(response.body)).not.toContain('AUTH_BYPASS_CONFIRMED');
    await prisma.lab.update({
      where: { slug: 'authentication-bypass-basics' },
      data: { isPublished: false },
    });
    await request(app).get('/api/labs/authentication-bypass-basics').expect(404);
  });

  it('isolates the synthetic authentication target behind authentication and an owned lab session', async () => {
    await createAuthenticationBypassChallenge();
    await request(app)
      .post('/api/labs/authentication-bypass-basics/target/login')
      .send({ username: 'trainee', password: 'wrong' })
      .expect(401);
    const { agent, token } = await authenticatedAgent('platform_learner', 'learner@example.test');
    await agent
      .post('/api/labs/authentication-bypass-basics/target/login')
      .set('X-CSRF-Token', token)
      .send({ username: 'trainee', password: 'wrong' })
      .expect(404);
    await agent
      .post('/api/labs/authentication-bypass-basics/start')
      .set('X-CSRF-Token', token)
      .send({})
      .expect(200);
    const platformSession = await prisma.session.findFirstOrThrow();
    const normal = await agent
      .post('/api/labs/authentication-bypass-basics/target/login')
      .set('X-CSRF-Token', token)
      .send({ username: 'trainee', password: 'training-demo' })
      .expect(200);
    expect(normal.body.data).toMatchObject({
      authenticated: true,
      role: 'learner',
      completionToken: null,
    });
    const invalid = await agent
      .post('/api/labs/authentication-bypass-basics/target/login')
      .set('X-CSRF-Token', token)
      .send({ username: 'visitor', password: 'wrong' })
      .expect(200);
    expect(invalid.body.data).toMatchObject({ authenticated: false, completionToken: null });
    const bypassed = await agent
      .post('/api/labs/authentication-bypass-basics/target/login')
      .set('X-CSRF-Token', token)
      .send({ username: 'trainee', password: 'wrong' })
      .expect(200);
    expect(bypassed.body.data).toMatchObject({
      authenticated: true,
      completionToken: 'AUTH_BYPASS_CONFIRMED',
    });
    expect(JSON.stringify(bypassed.body)).not.toContain('CYBERLAB{');
    expect(await prisma.session.findUnique({ where: { id: platformSession.id } })).not.toBeNull();
    expect(await prisma.session.count()).toBe(1);
  });

  it('uses the existing validator and completion flow for the authentication challenge', async () => {
    const lab = await createAuthenticationBypassChallenge();
    const { agent, token } = await authenticatedAgent('learner', 'learner@example.test');
    await agent
      .post('/api/labs/authentication-bypass-basics/start')
      .set('X-CSRF-Token', token)
      .send({})
      .expect(200);
    await agent
      .post('/api/labs/authentication-bypass-basics/submit')
      .set('X-CSRF-Token', token)
      .send({ submission: { flag: 'wrong' } })
      .expect(200);
    const completed = await agent
      .post('/api/labs/authentication-bypass-basics/submit')
      .set('X-CSRF-Token', token)
      .send({ submission: { flag: 'AUTH_BYPASS_CONFIRMED' } })
      .expect(200);
    expect(completed.body.data).toMatchObject({
      completed: true,
      progress: { status: 'COMPLETED' },
      session: { status: 'COMPLETED' },
    });
    const repeated = await agent
      .post('/api/labs/authentication-bypass-basics/submit')
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
});
