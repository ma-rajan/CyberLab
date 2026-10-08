import { describe, expect, it } from 'vitest';
import '../helpers/lab-test-setup.js';
import request from 'supertest';
import { app } from '../../src/app.js';
import { createCsrfChallenge, authenticatedAgent } from '../helpers/lab-test-fixtures.js';

describe('lab API: csrf', () => {
  it('keeps the CSRF target session-isolated while accepting the intended tokenless request', async () => {
    await createCsrfChallenge();
    await request(app)
      .post('/api/labs/csrf/target/settings')
      .type('form')
      .send({ notificationsEnabled: 'false' })
      .expect(401);
    const { agent, token } = await authenticatedAgent('learner', 'learner@example.test');
    await agent.get('/api/labs/csrf/target/settings').expect(404);
    await agent.post('/api/labs/csrf/start').set('X-CSRF-Token', token).send({}).expect(200);
    await agent
      .post('/api/labs/csrf/target/settings/secure')
      .send({ notificationsEnabled: false })
      .expect(403);
    const protectedChange = await agent
      .post('/api/labs/csrf/target/settings/secure')
      .set('X-CSRF-Token', token)
      .send({ notificationsEnabled: false })
      .expect(200);
    expect(protectedChange.body.data).toMatchObject({
      notificationsEnabled: false,
      lastChangeUsedValidCsrfToken: true,
      completionToken: null,
    });
    const forged = await agent
      .post('/api/labs/csrf/target/settings')
      .type('form')
      .send({ notificationsEnabled: 'false' })
      .expect(200);
    expect(forged.body.data).toMatchObject({
      notificationsEnabled: false,
      lastChangeUsedValidCsrfToken: false,
      completionToken: 'CSRF_NOTIFICATION_CHANGE_CONFIRMED',
    });
  });

  it('completes CSRF only after the tokenless target interaction', async () => {
    await createCsrfChallenge();
    const { agent, token } = await authenticatedAgent('learner', 'learner@example.test');
    await agent.post('/api/labs/csrf/start').set('X-CSRF-Token', token).send({}).expect(200);
    const premature = await agent
      .post('/api/labs/csrf/submit')
      .set('X-CSRF-Token', token)
      .send({ submission: { flag: 'CSRF_NOTIFICATION_CHANGE_CONFIRMED' } })
      .expect(200);
    expect(premature.body.data.completed).toBe(false);
    await agent
      .post('/api/labs/csrf/target/settings')
      .type('form')
      .send({ notificationsEnabled: 'false' })
      .expect(200);
    const completed = await agent
      .post('/api/labs/csrf/submit')
      .set('X-CSRF-Token', token)
      .send({ submission: { flag: 'CSRF_NOTIFICATION_CHANGE_CONFIRMED' } })
      .expect(200);
    expect(completed.body.data).toMatchObject({
      completed: true,
      progress: { status: 'COMPLETED' },
    });
  });
});
