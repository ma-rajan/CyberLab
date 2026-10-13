import { describe, expect, it } from 'vitest';
import '../helpers/lab-test-setup.js';
import request from 'supertest';
import { readFile } from 'node:fs/promises';
import { app } from '../../src/app.js';
import { prisma } from '../../src/lib/prisma.js';
import { simulateCommandInjection } from '../../src/modules/labs/isolated-targets/command-injection.target.js';
import { authenticatedAgent, createCommandInjectionChallenge } from '../helpers/lab-test-fixtures.js';

const targetPath = '/api/labs/command-injection/target/command-injection/simulate';
const vulnerableAudit = { mode: 'vulnerable', input: '&& audit' };
const secureAudit = { mode: 'secure', input: '&& audit' };

describe('lab API: command-injection', () => {
  it('publishes instructions without exposing validator or completion secrets', async () => {
    await createCommandInjectionChallenge();
    const detail = await request(app).get('/api/labs/command-injection').expect(200);
    const catalog = await request(app).get('/api/labs').expect(200);
    for (const body of [detail.body, catalog.body]) {
      expect(JSON.stringify(body)).not.toContain('flagHash');
      expect(JSON.stringify(body)).not.toContain('validatorType');
      expect(JSON.stringify(body)).not.toContain('COMMAND_INJECTION_CONFIRMED');
    }
    expect(detail.body.data.lab.challengeType).toBe('COMMAND_INJECTION_SIMULATOR');
    await prisma.lab.update({ where: { slug: 'command-injection' }, data: { isPublished: false } });
    await request(app).get('/api/labs/command-injection').expect(404);
  });

  it('requires authentication, an active owned lab session, and the normal CSRF token', async () => {
    await createCommandInjectionChallenge();
    await request(app).post(targetPath).send(vulnerableAudit).expect(401);
    const learner = await authenticatedAgent('cmd_gate', 'cmd-gate@example.test');
    await learner.agent.post(targetPath).set('X-CSRF-Token', learner.token).send(vulnerableAudit).expect(404);
    await learner.agent.post('/api/labs/command-injection/start').set('X-CSRF-Token', learner.token).send({}).expect(200);
    await learner.agent.post(targetPath).send(vulnerableAudit).expect(403);
    await learner.agent.post('/api/labs/unrelated/target/command-injection/simulate')
      .set('X-CSRF-Token', learner.token).send(vulnerableAudit).expect(404);

    const session = await prisma.labSession.findFirstOrThrow();
    await prisma.labSession.update({ where: { id: session.id }, data: { status: 'EXPIRED' } });
    await learner.agent.post(targetPath).set('X-CSRF-Token', learner.token).send(vulnerableAudit).expect(409);
  });

  it('interprets only the fixed vulnerable tokens and keeps secure input as data', async () => {
    await createCommandInjectionChallenge();
    const learner = await authenticatedAgent('cmd_valid', 'cmd-valid@example.test');
    await learner.agent.post('/api/labs/command-injection/start').set('X-CSRF-Token', learner.token).send({}).expect(200);

    const baseline = await learner.agent.post(targetPath).set('X-CSRF-Token', learner.token)
      .send({ mode: 'vulnerable', input: '' }).expect(200);
    expect(baseline.body.data.operations).toHaveLength(1);
    expect(baseline.body.data.operations[0].operation).toBe('status');

    const injected = await learner.agent.post(targetPath).set('X-CSRF-Token', learner.token)
      .send(vulnerableAudit).expect(200);
    expect(injected.body.data).toMatchObject({ mode: 'vulnerable', filterApplied: true });
    expect(injected.body.data.operations.map((item: { operation: string }) => item.operation)).toEqual(['status', 'audit']);
    expect(JSON.stringify(injected.body)).not.toContain('COMMAND_INJECTION_CONFIRMED');
    const filtered = await learner.agent.post(targetPath).set('X-CSRF-Token', learner.token)
      .send({ mode: 'vulnerable', input: '; && audit' }).expect(200);
    expect(filtered.body.data.operations.map((item: { operation: string }) => item.operation)).toEqual(['status', 'audit']);
    expect(filtered.body.data.inputTreatment).toContain('semicolon filter is active');

    const secure = await learner.agent.post(targetPath).set('X-CSRF-Token', learner.token)
      .send(secureAudit).expect(200);
    expect(secure.body.data).toMatchObject({ mode: 'secure', filterApplied: false });
    expect(secure.body.data.operations.map((item: { operation: string }) => item.operation)).toEqual(['status']);
    expect(secure.body.data.inputTreatment).toContain('&& audit');
    expect(secure.body.data.exerciseReady).toBe(true);
  });

  it('rejects unsupported syntax, invalid modes, malformed bodies, and oversized input', async () => {
    await createCommandInjectionChallenge();
    const learner = await authenticatedAgent('cmd_invalid', 'cmd-invalid@example.test');
    await learner.agent.post('/api/labs/command-injection/start').set('X-CSRF-Token', learner.token).send({}).expect(200);
    for (const input of ['&& nonexistent', '| audit', '$(audit)', '&& audit && status']) {
      await learner.agent.post(targetPath).set('X-CSRF-Token', learner.token)
        .send({ mode: 'vulnerable', input }).expect(400);
    }
    await learner.agent.post(targetPath).set('X-CSRF-Token', learner.token)
      .send({ mode: 'unknown', input: '' }).expect(400);
    await learner.agent.post(targetPath).set('X-CSRF-Token', learner.token)
      .send({ mode: 'secure', input: 'x'.repeat(121) }).expect(400);
    await learner.agent.post(targetPath).set('X-CSRF-Token', learner.token)
      .send({ mode: 'secure', input: '', unexpected: true }).expect(400);
  });

  it('requires both interactions and an explicit valid verification before completion', async () => {
    const lab = await createCommandInjectionChallenge();
    const first = await authenticatedAgent('cmd_first', 'cmd-first@example.test');
    const second = await authenticatedAgent('cmd_second', 'cmd-second@example.test');
    for (const learner of [first, second]) {
      await learner.agent.post('/api/labs/command-injection/start').set('X-CSRF-Token', learner.token).send({}).expect(200);
    }

    const premature = await first.agent.post('/api/labs/command-injection/submit').set('X-CSRF-Token', first.token)
      .send({ submission: { confirmation: true } }).expect(200);
    expect(premature.body.data.completed).toBe(false);

    await first.agent.post(targetPath).set('X-CSRF-Token', first.token).send(vulnerableAudit).expect(200);
    const isolated = await second.agent.post('/api/labs/command-injection/submit').set('X-CSRF-Token', second.token)
      .send({ submission: { confirmation: true } }).expect(200);
    expect(isolated.body.data.completed).toBe(false);

    await first.agent.post(targetPath).set('X-CSRF-Token', first.token).send(secureAudit).expect(200);
    const incorrect = await first.agent.post('/api/labs/command-injection/submit').set('X-CSRF-Token', first.token)
      .send({ submission: { confirmation: 'verify' } }).expect(200);
    expect(incorrect.body.data.completed).toBe(false);
    const completed = await first.agent.post('/api/labs/command-injection/submit').set('X-CSRF-Token', first.token)
      .send({ submission: { confirmation: true } }).expect(200);
    expect(completed.body.data).toMatchObject({ completed: true, progress: { status: 'COMPLETED' }, session: { status: 'COMPLETED' } });
    expect(await prisma.labProgress.count({ where: { labId: lab.id, status: 'COMPLETED' } })).toBe(1);
  });

  it('uses no process, filesystem, or network APIs in the simulator module', async () => {
    expect(simulateCommandInjection('synthetic-session', 'vulnerable', '&& audit')?.operations).toHaveLength(2);
    expect(simulateCommandInjection('synthetic-session', 'secure', '&& audit')?.operations).toHaveLength(1);
    const source = await readFile(new URL('../../src/modules/labs/isolated-targets/command-injection.target.ts', import.meta.url), 'utf8');
    expect(source).not.toMatch(/node:(?:child_process|fs|http|https|net|dns)/);
    expect(source).not.toMatch(/\b(?:exec|execFile|spawn|fetch)\s*\(/);
    expect(source).not.toMatch(/\bprocess\s*\./);
    expect(source).not.toMatch(/\b(?:readFile|writeFile|createReadStream|openSync)\s*\(/);
  });
});
