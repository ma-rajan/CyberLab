import { describe, expect, it } from 'vitest';
import '../helpers/lab-test-setup.js';
import request from 'supertest';
import { app } from '../../src/app.js';
import {
  createCsrfChallenge,
  createPublishedLab,
  authenticatedAgent,
} from '../helpers/lab-test-fixtures.js';

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

  it('rejects incorrect flags and keeps the target state isolated between learners', async () => {
    await createCsrfChallenge();
    const learnerA = await authenticatedAgent('csrf_learner_a', 'csrf-a@example.test');
    const learnerB = await authenticatedAgent('csrf_learner_b', 'csrf-b@example.test');
    await learnerA.agent
      .post('/api/labs/csrf/start')
      .set('X-CSRF-Token', learnerA.token)
      .send({})
      .expect(200);
    await learnerB.agent
      .post('/api/labs/csrf/start')
      .set('X-CSRF-Token', learnerB.token)
      .send({})
      .expect(200);

    await learnerA.agent
      .post('/api/labs/csrf/target/settings')
      .type('form')
      .send({ notificationsEnabled: 'false' })
      .expect(200);
    const incorrectFlag = await learnerA.agent
      .post('/api/labs/csrf/submit')
      .set('X-CSRF-Token', learnerA.token)
      .send({ submission: { flag: 'not-the-csrf-flag' } })
      .expect(200);
    expect(incorrectFlag.body.data).toMatchObject({
      completed: false,
      session: { status: 'ACTIVE' },
    });

    const learnerBSettings = await learnerB.agent
      .get('/api/labs/csrf/target/settings')
      .expect(200);
    expect(learnerBSettings.body.data).toMatchObject({
      notificationsEnabled: true,
      lastChangeUsedValidCsrfToken: false,
    });
    const learnerBSubmission = await learnerB.agent
      .post('/api/labs/csrf/submit')
      .set('X-CSRF-Token', learnerB.token)
      .send({ submission: { flag: 'CSRF_NOTIFICATION_CHANGE_CONFIRMED' } })
      .expect(200);
    expect(learnerBSubmission.body.data).toMatchObject({
      completed: false,
      session: { status: 'ACTIVE' },
    });

    const learnerACompletion = await learnerA.agent
      .post('/api/labs/csrf/submit')
      .set('X-CSRF-Token', learnerA.token)
      .send({ submission: { flag: 'CSRF_NOTIFICATION_CHANGE_CONFIRMED' } })
      .expect(200);
    expect(learnerACompletion.body.data.completed).toBe(true);
    const learnerBStillActive = await learnerB.agent
      .get('/api/labs/csrf/session')
      .expect(200);
    expect(learnerBStillActive.body.data.session.status).toBe('ACTIVE');
  });

  it('keeps CSRF target behavior scoped to the CSRF lab', async () => {
    await createCsrfChallenge();
    await createPublishedLab('unrelated-lab');
    const { agent, token } = await authenticatedAgent('csrf_scope_learner', 'csrf-scope@example.test');
    await agent.post('/api/labs/csrf/start').set('X-CSRF-Token', token).send({}).expect(200);
    await agent.post('/api/labs/unrelated-lab/start').set('X-CSRF-Token', token).send({}).expect(200);

    await agent
      .post('/api/labs/unrelated-lab/target/settings')
      .type('form')
      .send({ notificationsEnabled: 'false' })
      .expect(404);
    const unrelatedSubmission = await agent
      .post('/api/labs/unrelated-lab/submit')
      .set('X-CSRF-Token', token)
      .send({ submission: { flag: 'CSRF_NOTIFICATION_CHANGE_CONFIRMED' } })
      .expect(200);
    expect(unrelatedSubmission.body.data.completed).toBe(false);
    const unrelatedLabStillCompletesNormally = await agent
      .post('/api/labs/unrelated-lab/submit')
      .set('X-CSRF-Token', token)
      .send({ submission: { confirmation: 'CYBERLAB_READY' } })
      .expect(200);
    expect(unrelatedLabStillCompletesNormally.body.data.completed).toBe(true);

    const csrfWithoutInteraction = await agent
      .post('/api/labs/csrf/submit')
      .set('X-CSRF-Token', token)
      .send({ submission: { flag: 'CSRF_NOTIFICATION_CHANGE_CONFIRMED' } })
      .expect(200);
    expect(csrfWithoutInteraction.body.data.completed).toBe(false);
  });
});
