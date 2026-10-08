import { describe, expect, it } from 'vitest';
import '../helpers/lab-test-setup.js';
import request from 'supertest';
import { app } from '../../src/app.js';
import { prisma } from '../../src/lib/prisma.js';
import { createIdorChallenge, authenticatedAgent } from '../helpers/lab-test-fixtures.js';

describe('lab API: idor', () => {
  it('returns published IDOR metadata without private validator data and hides drafts', async () => {
    await createIdorChallenge();
    const response = await request(app).get('/api/labs/idor-fundamentals').expect(200);
    expect(response.body.data.lab).toMatchObject({
      title: 'Profile Access — IDOR Basics',
      challengeType: 'IDOR_PROFILE_ACCESS',
    });
    expect(JSON.stringify(response.body)).not.toContain('flagHash');
    expect(JSON.stringify(response.body)).not.toContain('validatorType');
    expect(JSON.stringify(response.body)).not.toContain('IDOR_PROFILE_ACCESS_CONFIRMED');
    await prisma.lab.update({ where: { slug: 'idor-fundamentals' }, data: { isPublished: false } });
    await request(app).get('/api/labs/idor-fundamentals').expect(404);
  });

  it('isolates the Profile Access IDOR target behind authentication and an owned session', async () => {
    await createIdorChallenge();
    await request(app).get('/api/labs/idor-fundamentals/target/profile?id=101').expect(401);
    const { agent, token } = await authenticatedAgent('platform_learner', 'learner@example.test');
    await agent.get('/api/labs/idor-fundamentals/target/profile?id=101').expect(404);
    await agent
      .post('/api/labs/idor-fundamentals/start')
      .set('X-CSRF-Token', token)
      .send({})
      .expect(200);
    const own = await agent.get('/api/labs/idor-fundamentals/target/profile?id=101').expect(200);
    expect(own.body.data).toMatchObject({
      profile: { id: 101, owner: 'CURRENT_TRAINING_LEARNER' },
      completionToken: null,
    });
    expect(JSON.stringify(own.body)).not.toContain('platform_learner');
    const other = await agent.get('/api/labs/idor-fundamentals/target/profile?id=102').expect(200);
    expect(other.body.data).toMatchObject({
      profile: { id: 102, owner: 'OTHER_TRAINING_USER' },
      completionToken: 'IDOR_PROFILE_ACCESS_CONFIRMED',
    });
    expect(JSON.stringify(other.body)).not.toContain('CYBERLAB{');
    await agent.get('/api/labs/idor-fundamentals/target/profile?id=999').expect(404);
  });

  it('uses the existing validator and completion flow for the IDOR challenge', async () => {
    const lab = await createIdorChallenge();
    const { agent, token } = await authenticatedAgent('learner', 'learner@example.test');
    await agent
      .post('/api/labs/idor-fundamentals/start')
      .set('X-CSRF-Token', token)
      .send({})
      .expect(200);
    await agent
      .post('/api/labs/idor-fundamentals/submit')
      .set('X-CSRF-Token', token)
      .send({ submission: { flag: 'wrong' } })
      .expect(200);
    const completed = await agent
      .post('/api/labs/idor-fundamentals/submit')
      .set('X-CSRF-Token', token)
      .send({ submission: { flag: 'IDOR_PROFILE_ACCESS_CONFIRMED' } })
      .expect(200);
    expect(completed.body.data).toMatchObject({
      completed: true,
      progress: { status: 'COMPLETED' },
      session: { status: 'COMPLETED' },
    });
    const repeated = await agent
      .post('/api/labs/idor-fundamentals/submit')
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
