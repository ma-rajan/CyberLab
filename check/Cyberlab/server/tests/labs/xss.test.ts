import { describe, expect, it } from 'vitest';
import '../helpers/lab-test-setup.js';
import request from 'supertest';
import { app } from '../../src/app.js';
import { prisma } from '../../src/lib/prisma.js';
import { createXssChallenge, authenticatedAgent } from '../helpers/lab-test-fixtures.js';

describe('lab API: xss', () => {
  it('returns published XSS metadata without its validator data and hides drafts', async () => {
    await createXssChallenge();
    const response = await request(app).get('/api/labs/xss-fundamentals').expect(200);
    expect(response.body.data.lab).toMatchObject({
      title: 'Reflected XSS Basics',
      challengeType: 'XSS_FEEDBACK_SEARCH',
    });
    expect(JSON.stringify(response.body)).not.toContain('flagHash');
    expect(JSON.stringify(response.body)).not.toContain('validatorType');
    expect(JSON.stringify(response.body)).not.toContain('XSS_PREVIEW_CONFIRMED');
    await prisma.lab.update({ where: { slug: 'xss-fundamentals' }, data: { isPublished: false } });
    await request(app).get('/api/labs/xss-fundamentals').expect(404);
  });

  it('isolates the Feedback Search XSS target behind authentication and an owned session', async () => {
    await createXssChallenge();
    await request(app).get('/api/labs/xss-fundamentals/target/feedback?feedback=hello').expect(401);
    const { agent, token } = await authenticatedAgent('learner', 'learner@example.test');
    await agent.get('/api/labs/xss-fundamentals/target/feedback?feedback=hello').expect(404);
    await agent
      .post('/api/labs/xss-fundamentals/start')
      .set('X-CSRF-Token', token)
      .send({})
      .expect(200);
    const normal = await agent
      .get('/api/labs/xss-fundamentals/target/feedback?feedback=hello')
      .expect(200);
    expect(normal.body.data.document).toContain('hello');
    expect(normal.body.data.completionToken).toBeNull();
    const payload =
      "<script>document.getElementById('xss-status').textContent='Training script executed'</script>";
    const reflected = await agent
      .get('/api/labs/xss-fundamentals/target/feedback')
      .query({ feedback: payload })
      .expect(200);
    expect(reflected.body.data.document).toContain(payload);
    expect(reflected.body.data.completionToken).toBe('XSS_PREVIEW_CONFIRMED');
    expect(JSON.stringify(reflected.body)).not.toContain('CYBERLAB{');
  });

  it('validates the XSS completion value with the existing server-side flow', async () => {
    const lab = await createXssChallenge();
    const { agent, token } = await authenticatedAgent('learner', 'learner@example.test');
    await agent
      .post('/api/labs/xss-fundamentals/start')
      .set('X-CSRF-Token', token)
      .send({})
      .expect(200);
    await agent
      .post('/api/labs/xss-fundamentals/submit')
      .set('X-CSRF-Token', token)
      .send({ submission: { flag: 'wrong' } })
      .expect(200);
    const completed = await agent
      .post('/api/labs/xss-fundamentals/submit')
      .set('X-CSRF-Token', token)
      .send({ submission: { flag: 'XSS_PREVIEW_CONFIRMED' } })
      .expect(200);
    expect(completed.body.data).toMatchObject({
      completed: true,
      progress: { status: 'COMPLETED' },
      session: { status: 'COMPLETED' },
    });
    const repeated = await agent
      .post('/api/labs/xss-fundamentals/submit')
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
