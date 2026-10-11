import { describe, expect, it } from 'vitest';
import '../helpers/lab-test-setup.js';
import request from 'supertest';
import { app } from '../../src/app.js';
import { prisma } from '../../src/lib/prisma.js';
import { authenticatedAgent, createCorsChallenge } from '../helpers/lab-test-fixtures.js';

const simulationPath = '/api/labs/cors-policy/target/cors/simulate';
const simpleUntrustedRequest = {
  origin: 'https://attacker.training.test', method: 'GET', headers: [], credentials: true,
};
const preflightUntrustedRequest = {
  origin: 'https://attacker.training.test', method: 'PUT',
  headers: [{ name: 'X-Training-Client', value: 'demo' }], credentials: true,
};

describe('lab API: cors-policy', () => {
  it('publishes learner guidance without exposing private validator data', async () => {
    await createCorsChallenge();
    const response = await request(app).get('/api/labs/cors-policy').expect(200);
    expect(response.body.data.lab).toMatchObject({
      title: 'CORS Policy Misconfiguration',
      challengeType: 'CORS_POLICY_SIMULATOR',
      objective: expect.any(String),
      instructions: expect.any(String),
      hints: expect.arrayContaining([expect.any(String)]),
    });
    expect(JSON.stringify(response.body)).not.toContain('flagHash');
    expect(JSON.stringify(response.body)).not.toContain('validatorType');
    expect(JSON.stringify(response.body)).not.toContain('CORS_POLICY_READ_CONFIRMED');
    await prisma.lab.update({ where: { slug: 'cors-policy' }, data: { isPublished: false } });
    await request(app).get('/api/labs/cors-policy').expect(404);
  });

  it('requires authentication, an owned lab session, and the platform CSRF token', async () => {
    await createCorsChallenge();
    await request(app).post(simulationPath).send(simpleUntrustedRequest).expect(401);
    const learner = await authenticatedAgent('cors_gate', 'cors-gate@example.test');
    await learner.agent.post(simulationPath).set('X-CSRF-Token', learner.token).send(simpleUntrustedRequest).expect(404);
    await learner.agent.post('/api/labs/cors-policy/start').set('X-CSRF-Token', learner.token).send({}).expect(200);
    await learner.agent.post(simulationPath).send(simpleUntrustedRequest).expect(403);
    await learner.agent.post('/api/labs/unrelated/target/cors/simulate')
      .set('X-CSRF-Token', learner.token).send(simpleUntrustedRequest).expect(404);
    const result = await learner.agent.post(simulationPath)
      .set('X-CSRF-Token', learner.token).send(simpleUntrustedRequest).expect(200);
    expect(result.body.data.policies.permissive.browserCanReadResponse).toBe(true);
  });

  it('reports trusted, untrusted, missing, and malformed origins without contacting them', async () => {
    await createCorsChallenge();
    const learner = await authenticatedAgent('cors_origin', 'cors-origin@example.test');
    await learner.agent.post('/api/labs/cors-policy/start').set('X-CSRF-Token', learner.token).send({}).expect(200);
    for (const origin of [undefined, '', 'invalid origin', 'javascript:alert(1)']) {
      const response = await learner.agent.post(simulationPath).set('X-CSRF-Token', learner.token)
        .send({ method: 'GET', headers: [], credentials: true, ...(origin === undefined ? {} : { origin }) }).expect(200);
      expect(response.body.data.origin.valid).toBe(false);
      expect(response.body.data.policies.permissive.browserCanReadResponse).toBe(false);
    }
    for (const origin of ['http://app.training.test', 'https://app.training.test:444', 'https://other.training.test']) {
      const response = await learner.agent.post(simulationPath).set('X-CSRF-Token', learner.token)
        .send({ origin, method: 'GET', headers: [], credentials: true }).expect(200);
      expect(response.body.data.origin.trusted).toBe(false);
      expect(response.body.data.policies.allowlist.browserCanReadResponse).toBe(false);
    }
    const trusted = await learner.agent.post(simulationPath).set('X-CSRF-Token', learner.token)
      .send({ origin: 'https://app.training.test', method: 'GET', headers: [], credentials: true }).expect(200);
    expect(trusted.body.data.origin.trusted).toBe(true);
    expect(trusted.body.data.policies.allowlist.browserCanReadResponse).toBe(true);
  });

  it('validates simple requests, preflight methods and headers, and wildcard credentials separately', async () => {
    await createCorsChallenge();
    const learner = await authenticatedAgent('cors_rules', 'cors-rules@example.test');
    await learner.agent.post('/api/labs/cors-policy/start').set('X-CSRF-Token', learner.token).send({}).expect(200);

    const simple = await learner.agent.post(simulationPath).set('X-CSRF-Token', learner.token).send(simpleUntrustedRequest).expect(200);
    expect(simple.body.data.request.preflightRequired).toBe(false);
    expect(simple.body.data.policies.allowlist.actualRequestProcessed).toBe(true);
    expect(simple.body.data.policies.allowlist.responseHeaders['Access-Control-Allow-Origin']).toBeUndefined();
    expect(simple.body.data.policies.allowlist.browserCanReadResponse).toBe(false);
    expect(simple.body.data.policies.wildcardWithCredentials.responseHeaders).toMatchObject({
      'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Credentials': 'true',
    });
    expect(simple.body.data.policies.wildcardWithCredentials.browserCanReadResponse).toBe(false);

    const preflight = await learner.agent.post(simulationPath).set('X-CSRF-Token', learner.token).send(preflightUntrustedRequest).expect(200);
    expect(preflight.body.data.policies.permissive.preflightRequired).toBe(true);
    expect(preflight.body.data.policies.permissive.preflightAllowed).toBe(true);
    expect(preflight.body.data.policies.permissive.actualRequestProcessed).toBe(true);
    expect(preflight.body.data.policies.allowlist.preflightAllowed).toBe(false);
    expect(preflight.body.data.policies.allowlist.actualRequestProcessed).toBe(false);

    const trustedAllowed = await learner.agent.post(simulationPath).set('X-CSRF-Token', learner.token)
      .send({ origin: 'https://app.training.test', method: 'POST', headers: [{ name: 'Content-Type', value: 'application/json' }], credentials: true }).expect(200);
    expect(trustedAllowed.body.data.policies.allowlist.preflightAllowed).toBe(true);
    const invalid = await learner.agent.post(simulationPath).set('X-CSRF-Token', learner.token)
      .send({ origin: 'https://app.training.test', method: 'PUT', headers: [{ name: 'X-Bad\r\nHeader', value: 'x' }], credentials: true }).expect(400);
    expect(invalid.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('validates the challenge only after each learner compares exposure, preflight, and wildcard behavior', async () => {
    const lab = await createCorsChallenge();
    const first = await authenticatedAgent('cors_first', 'cors-first@example.test');
    const second = await authenticatedAgent('cors_second', 'cors-second@example.test');
    for (const learner of [first, second]) {
      await learner.agent.post('/api/labs/cors-policy/start').set('X-CSRF-Token', learner.token).send({}).expect(200);
    }

    await first.agent.post(simulationPath).set('X-CSRF-Token', first.token).send(simpleUntrustedRequest).expect(200);
    const premature = await first.agent.post('/api/labs/cors-policy/submit').set('X-CSRF-Token', first.token)
      .send({ submission: { flag: 'CORS_POLICY_READ_CONFIRMED' } }).expect(200);
    expect(premature.body.data.completed).toBe(false);
    const isolated = await second.agent.post('/api/labs/cors-policy/submit').set('X-CSRF-Token', second.token)
      .send({ submission: { flag: 'CORS_POLICY_READ_CONFIRMED' } }).expect(200);
    expect(isolated.body.data.completed).toBe(false);

    const comparison = await first.agent.post(simulationPath).set('X-CSRF-Token', first.token).send(preflightUntrustedRequest).expect(200);
    expect(comparison.body.data.completionToken).toBe('CORS_POLICY_READ_CONFIRMED');
    const wrongFlag = await first.agent.post('/api/labs/cors-policy/submit').set('X-CSRF-Token', first.token)
      .send({ submission: { flag: 'wrong' } }).expect(200);
    expect(wrongFlag.body.data.completed).toBe(false);
    const completed = await first.agent.post('/api/labs/cors-policy/submit').set('X-CSRF-Token', first.token)
      .send({ submission: { flag: 'CORS_POLICY_READ_CONFIRMED' } }).expect(200);
    expect(completed.body.data).toMatchObject({ completed: true, progress: { status: 'COMPLETED' }, session: { status: 'COMPLETED' } });
    expect(await prisma.labProgress.count({ where: { labId: lab.id, status: 'COMPLETED' } })).toBe(1);
  });
});
