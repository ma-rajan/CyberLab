import { describe, expect, it } from 'vitest';
import '../helpers/lab-test-setup.js';
import request from 'supertest';
import { readFile } from 'node:fs/promises';
import { app } from '../../src/app.js';
import { prisma } from '../../src/lib/prisma.js';
import { simulateCouponWorkflow } from '../../src/modules/labs/isolated-targets/business-logic-race.target.js';
import { authenticatedAgent, createBusinessLogicRaceChallenge } from '../helpers/lab-test-fixtures.js';

const targetPath = '/api/labs/business-logic-race/target/business-logic/simulate';
const prepareA = { action: 'prepare', attemptId: 'attempt-a' };
const prepareB = { action: 'prepare', attemptId: 'attempt-b' };
const recordA = { action: 'record', attemptId: 'attempt-a' };
const recordB = { action: 'record', attemptId: 'attempt-b' };

describe('lab API: business-logic-race', () => {
  it('publishes safe instructions without validator or completion secrets', async () => {
    await createBusinessLogicRaceChallenge();
    const detail = await request(app).get('/api/labs/business-logic-race').expect(200);
    const catalog = await request(app).get('/api/labs').expect(200);
    for (const body of [detail.body, catalog.body]) {
      expect(JSON.stringify(body)).not.toContain('flagHash');
      expect(JSON.stringify(body)).not.toContain('validatorType');
      expect(JSON.stringify(body)).not.toContain('BUSINESS_LOGIC_RACE_CONFIRMED');
    }
    expect(detail.body.data.lab.challengeType).toBe('BUSINESS_LOGIC_RACE_SIMULATOR');
    expect(detail.body.data.lab.instructions).toContain('not real database concurrency');
  });

  it('requires authentication, CSRF, and an active learner-owned lab session', async () => {
    await createBusinessLogicRaceChallenge();
    await request(app).post(targetPath).send({ action: 'inspect' }).expect(401);
    const learner = await authenticatedAgent('race_gate', 'race-gate@example.test');
    await learner.agent.post(targetPath).set('X-CSRF-Token', learner.token).send({ action: 'inspect' }).expect(404);
    await learner.agent.post('/api/labs/business-logic-race/start').set('X-CSRF-Token', learner.token).send({}).expect(200);
    await learner.agent.post(targetPath).send({ action: 'inspect' }).expect(403);
    await learner.agent.post('/api/labs/business-logic-race/start').set('X-CSRF-Token', learner.token).send({}).expect(200);
    const session = await prisma.labSession.findFirstOrThrow();
    await prisma.labSession.update({ where: { id: session.id }, data: { status: 'EXPIRED' } });
    await learner.agent.post(targetPath).set('X-CSRF-Token', learner.token).send({ action: 'inspect' }).expect(409);
  });

  it('deterministically records two attempts that both checked the same stale eligibility state', async () => {
    await createBusinessLogicRaceChallenge();
    const learner = await authenticatedAgent('race_vulnerable', 'race-vulnerable@example.test');
    await learner.agent.post('/api/labs/business-logic-race/start').set('X-CSRF-Token', learner.token).send({}).expect(200);

    const initial = await learner.agent.post(targetPath).set('X-CSRF-Token', learner.token).send({ action: 'inspect' }).expect(200);
    expect(initial.body.data).toMatchObject({ product: { name: 'Training Desk Lamp' }, coupon: { code: 'SAVE-ONCE', maximumRedemptions: 1 }, redemptionCount: 0 });
    const firstCheck = await learner.agent.post(targetPath).set('X-CSRF-Token', learner.token).send(prepareA).expect(200);
    const secondCheck = await learner.agent.post(targetPath).set('X-CSRF-Token', learner.token).send(prepareB).expect(200);
    expect(firstCheck.body.data.preparedEligibility).toBe(true);
    expect(secondCheck.body.data.preparedEligibility).toBe(true);
    expect(firstCheck.body.data.redemptionCount).toBe(0);
    expect(secondCheck.body.data.redemptionCount).toBe(0);

    const firstRecord = await learner.agent.post(targetPath).set('X-CSRF-Token', learner.token).send(recordA).expect(200);
    const secondRecord = await learner.agent.post(targetPath).set('X-CSRF-Token', learner.token).send(recordB).expect(200);
    expect(firstRecord.body.data.redemptionCount).toBe(1);
    expect(secondRecord.body.data).toMatchObject({ redemptionCount: 2, invariantPreserved: false, completionReady: false });
    expect(secondRecord.body.data.outcomes[0].accepted).toBe(true);

    await learner.agent.post(targetPath).set('X-CSRF-Token', learner.token).send(recordA).expect(400);
    await learner.agent.post(targetPath).set('X-CSRF-Token', learner.token).send(prepareA).expect(400);
  });

  it('uses an atomic deterministic batch to preserve the one-redemption invariant on repeated attempts', async () => {
    await createBusinessLogicRaceChallenge();
    const learner = await authenticatedAgent('race_secure', 'race-secure@example.test');
    await learner.agent.post('/api/labs/business-logic-race/start').set('X-CSRF-Token', learner.token).send({}).expect(200);
    const first = await learner.agent.post(targetPath).set('X-CSRF-Token', learner.token).send({ action: 'secure-batch' }).expect(200);
    expect(first.body.data).toMatchObject({ redemptionCount: 1, invariantPreserved: true });
    expect(first.body.data.outcomes.map((attempt: { accepted: boolean }) => attempt.accepted)).toEqual([true, false]);
    expect(first.body.data.note).toContain('does not prove database transaction isolation');
    const repeated = await learner.agent.post(targetPath).set('X-CSRF-Token', learner.token).send({ action: 'secure-batch' }).expect(200);
    expect(repeated.body.data.redemptionCount).toBe(1);
    expect(repeated.body.data.outcomes).toEqual(first.body.data.outcomes);
  });

  it('validates inputs and rejects unsupported coupon transitions', async () => {
    await createBusinessLogicRaceChallenge();
    const learner = await authenticatedAgent('race_invalid', 'race-invalid@example.test');
    await learner.agent.post('/api/labs/business-logic-race/start').set('X-CSRF-Token', learner.token).send({}).expect(200);
    await learner.agent.post(targetPath).set('X-CSRF-Token', learner.token).send(recordA).expect(400);
    for (const body of [
      { action: 'prepare', attemptId: 'attempt-c' },
      { action: 'prepare' },
      { action: 'secure-batch', attemptId: 'attempt-a' },
      { action: 'transfer', attemptId: 'attempt-a' },
      { action: 'inspect', unexpected: true },
    ]) {
      await learner.agent.post(targetPath).set('X-CSRF-Token', learner.token).send(body).expect(400);
    }
  });

  it('isolates learners and requires both workflows plus valid verification to complete', async () => {
    const lab = await createBusinessLogicRaceChallenge();
    const first = await authenticatedAgent('race_first', 'race-first@example.test');
    const second = await authenticatedAgent('race_second', 'race-second@example.test');
    for (const learner of [first, second]) {
      await learner.agent.post('/api/labs/business-logic-race/start').set('X-CSRF-Token', learner.token).send({}).expect(200);
    }
    const firstUserBefore = await prisma.user.findFirstOrThrow({ where: { username: 'race_first' } });
    const firstSessionBefore = await prisma.session.findFirstOrThrow({ where: { userId: firstUserBefore.id } });

    const premature = await first.agent.post('/api/labs/business-logic-race/submit').set('X-CSRF-Token', first.token)
      .send({ submission: { confirmation: true } }).expect(200);
    expect(premature.body.data.completed).toBe(false);
    await first.agent.post(targetPath).set('X-CSRF-Token', first.token).send(prepareA).expect(200);
    const secondLearnerState = await second.agent.post(targetPath).set('X-CSRF-Token', second.token).send({ action: 'inspect' }).expect(200);
    expect(secondLearnerState.body.data.redemptionCount).toBe(0);
    const isolatedCompletion = await second.agent.post('/api/labs/business-logic-race/submit').set('X-CSRF-Token', second.token)
      .send({ submission: { confirmation: true } }).expect(200);
    expect(isolatedCompletion.body.data.completed).toBe(false);

    for (const input of [prepareB, recordA, recordB, { action: 'secure-batch' }]) {
      await first.agent.post(targetPath).set('X-CSRF-Token', first.token).send(input).expect(200);
    }
    const wrong = await first.agent.post('/api/labs/business-logic-race/submit').set('X-CSRF-Token', first.token)
      .send({ submission: { confirmation: 'verify' } }).expect(200);
    expect(wrong.body.data.completed).toBe(false);
    const done = await first.agent.post('/api/labs/business-logic-race/submit').set('X-CSRF-Token', first.token)
      .send({ submission: { confirmation: true } }).expect(200);
    expect(done.body.data).toMatchObject({ completed: true, session: { status: 'COMPLETED' }, progress: { status: 'COMPLETED' } });
    expect(await prisma.labProgress.count({ where: { labId: lab.id, status: 'COMPLETED' } })).toBe(1);

    const firstUserAfter = await prisma.user.findUniqueOrThrow({ where: { id: firstUserBefore.id } });
    const firstSessionAfter = await prisma.session.findUniqueOrThrow({ where: { id: firstSessionBefore.id } });
    expect(firstUserAfter).toEqual(firstUserBefore);
    expect(firstSessionAfter).toEqual(firstSessionBefore);
  });

  it('keeps the isolated target free of platform database, account, payment, and network integrations', async () => {
    expect(simulateCouponWorkflow('synthetic-session', { action: 'inspect' })?.redemptionCount).toBe(0);
    const source = await readFile(new URL('../../src/modules/labs/isolated-targets/business-logic-race.target.ts', import.meta.url), 'utf8');
    expect(source).not.toMatch(/@prisma|node:(?:child_process|fs|http|https|net|dns)|\bfetch\s*\(/);
    expect(source).not.toMatch(/payment|customer|credential|process\s*\./i);
  });
});
