import { describe, expect, it } from 'vitest';
import '../helpers/lab-test-setup.js';
import request from 'supertest';
import { app } from '../../src/app.js';
import { prisma } from '../../src/lib/prisma.js';
import { authenticatedAgent, createSstiChallenge } from '../helpers/lab-test-fixtures.js';

describe('lab API: ssti', () => {
  it('publishes learner guidance without exposing private validation data', async () => {
    await createSstiChallenge();
    const response = await request(app).get('/api/labs/ssti-basics').expect(200);
    expect(response.body.data.lab).toMatchObject({
      title: 'Server-Side Template Injection',
      challengeType: 'SSTI_ALLOWLISTED',
      objective: expect.any(String),
      instructions: expect.any(String),
      hints: expect.arrayContaining([expect.any(String)]),
    });
    expect(JSON.stringify(response.body)).not.toContain('flagHash');
    expect(JSON.stringify(response.body)).not.toContain('validatorType');
    expect(JSON.stringify(response.body)).not.toContain('SSTI_PREVIEW_CONFIRMED');
    await prisma.lab.update({ where: { slug: 'ssti-basics' }, data: { isPublished: false } });
    await request(app).get('/api/labs/ssti-basics').expect(404);
  });

  it('requires authentication and an owned active lab session', async () => {
    await createSstiChallenge();
    await request(app).get('/api/labs/ssti-basics/render?input=%7B%7B7*7%7D%7D').expect(401);
    const { agent, token } = await authenticatedAgent('ssti_learner', 'ssti@example.test');
    await agent.get('/api/labs/ssti-basics/render?input=%7B%7B7*7%7D%7D').expect(404);
    await agent.post('/api/labs/ssti-basics/start').set('X-CSRF-Token', token).send({}).expect(200);
    const rendered = await agent.get('/api/labs/ssti-basics/render').query({ input: '{{7*7}}' }).expect(200);
    expect(rendered.body.data.vulnerableOutput).toBe('Preview: 49');
  });

  it('compares allowlisted evaluation with secure literal rendering using fixed synthetic data', async () => {
    await createSstiChallenge();
    const { agent, token } = await authenticatedAgent('ssti_compare', 'compare@example.test');
    await agent.post('/api/labs/ssti-basics/start').set('X-CSRF-Token', token).send({}).expect(200);

    const arithmetic = await agent.get('/api/labs/ssti-basics/render').query({ input: 'Result: {{7*7}}' }).expect(200);
    expect(arithmetic.body.data).toEqual({
      vulnerableOutput: 'Preview: Result: 49',
      secureOutput: 'Preview: Result: {{7*7}}',
      completionToken: null,
    });
    const concatenation = await agent.get('/api/labs/ssti-basics/render').query({ input: '{{"Hello " + learner.name}}' }).expect(200);
    expect(concatenation.body.data.vulnerableOutput).toBe('Preview: Hello Avery');
    const fixedKey = await agent.get('/api/labs/ssti-basics/render').query({ input: '{{account.plan}}' }).expect(200);
    expect(fixedKey.body.data.vulnerableOutput).toBe('Preview: Training');
    expect(JSON.stringify(arithmetic.body)).not.toContain('DATABASE_URL');
  });

  it('rejects unsupported expressions, malformed syntax, oversized input, and attempts to escape the allowlist', async () => {
    await createSstiChallenge();
    const { agent, token } = await authenticatedAgent('ssti_reject', 'reject@example.test');
    await agent.post('/api/labs/ssti-basics/start').set('X-CSRF-Token', token).send({}).expect(200);
    const marker = globalThis as typeof globalThis & { __cyberlabSstiMarker?: boolean };
    marker.__cyberlabSstiMarker = false;
    for (const input of [
      '{{process.env}}',
      '{{globalThis.process}}',
      '{{constructor.constructor("return process")()}}',
      '{{fetch("https://example.test")}}',
      '{{require("node:fs").readFileSync("/etc/passwd")}}',
      '{{globalThis.__cyberlabSstiMarker = true}}',
      '{{7/0}}',
      '{{7*7',
    ]) {
      await agent.get('/api/labs/ssti-basics/render').query({ input }).expect(400);
    }
    expect(marker.__cyberlabSstiMarker).toBe(false);
    delete marker.__cyberlabSstiMarker;
    await agent.get('/api/labs/ssti-basics/render').query({ input: 'x'.repeat(201) }).expect(400);
  });

  it('requires each learner to demonstrate the exercise before completing it', async () => {
    const lab = await createSstiChallenge();
    const first = await authenticatedAgent('ssti_first', 'ssti_first@example.test');
    const second = await authenticatedAgent('ssti_second', 'ssti_second@example.test');
    for (const learner of [first, second]) {
      await learner.agent.post('/api/labs/ssti-basics/start').set('X-CSRF-Token', learner.token).send({}).expect(200);
    }

    await first.agent.get('/api/labs/ssti-basics/render').query({ input: '{{7*7}}' }).expect(200);
    const firstToken = await first.agent.get('/api/labs/ssti-basics/render').query({ input: '{{training.completion}}' }).expect(200);
    expect(firstToken.body.data).toMatchObject({
      vulnerableOutput: 'Preview: SSTI_PREVIEW_CONFIRMED',
      secureOutput: 'Preview: {{training.completion}}',
      completionToken: 'SSTI_PREVIEW_CONFIRMED',
    });

    const wrongLearner = await second.agent.post('/api/labs/ssti-basics/submit')
      .set('X-CSRF-Token', second.token)
      .send({ submission: { flag: 'SSTI_PREVIEW_CONFIRMED' } }).expect(200);
    expect(wrongLearner.body.data.completed).toBe(false);

    const incomplete = await first.agent.post('/api/labs/ssti-basics/submit')
      .set('X-CSRF-Token', first.token)
      .send({ submission: { flag: 'wrong' } }).expect(200);
    expect(incomplete.body.data.completed).toBe(false);

    await second.agent.get('/api/labs/ssti-basics/render').query({ input: '{{7*7}}' }).expect(200);
    await second.agent.get('/api/labs/ssti-basics/render').query({ input: '{{training.completion}}' }).expect(200);
    const completed = await second.agent.post('/api/labs/ssti-basics/submit')
      .set('X-CSRF-Token', second.token)
      .send({ submission: { flag: 'SSTI_PREVIEW_CONFIRMED' } }).expect(200);
    expect(completed.body.data).toMatchObject({
      completed: true,
      progress: { status: 'COMPLETED' },
      session: { status: 'COMPLETED' },
    });
    expect(await prisma.labProgress.count({ where: { labId: lab.id, status: 'COMPLETED' } })).toBe(1);
  });
});
