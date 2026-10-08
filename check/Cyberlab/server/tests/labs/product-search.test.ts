import { describe, expect, it } from 'vitest';
import '../helpers/lab-test-setup.js';
import request from 'supertest';
import { app } from '../../src/app.js';
import { prisma } from '../../src/lib/prisma.js';
import { createSqlInjectionChallenge, authenticatedAgent } from '../helpers/lab-test-fixtures.js';

describe('lab API: product-search', () => {
  it('keeps the Product Search target session-scoped and exposes its hidden data only through the lab interaction', async () => {
    await createSqlInjectionChallenge();
    await request(app)
      .get('/api/labs/sql-injection-basics/target/products?search=signal')
      .expect(401);
    const { agent, token } = await authenticatedAgent('learner', 'learner@example.test');
    await agent.get('/api/labs/sql-injection-basics/target/products?search=signal').expect(404);
    await agent
      .post('/api/labs/sql-injection-basics/start')
      .set('X-CSRF-Token', token)
      .send({})
      .expect(200);
    const normal = await agent
      .get('/api/labs/sql-injection-basics/target/products?search=signal')
      .expect(200);
    expect(JSON.stringify(normal.body)).not.toContain('CYBERLAB{product_search_tautology}');
    const injected = await agent
      .get('/api/labs/sql-injection-basics/target/products?search=%27%20OR%20%271%27%3D%271%27--')
      .expect(200);
    expect(JSON.stringify(injected.body)).toContain('CYBERLAB{product_search_tautology}');
  });

  it('validates a discovered flag on the server and completes progress idempotently', async () => {
    const lab = await createSqlInjectionChallenge();
    const { agent, token } = await authenticatedAgent('learner', 'learner@example.test');
    await agent
      .post('/api/labs/sql-injection-basics/start')
      .set('X-CSRF-Token', token)
      .send({})
      .expect(200);
    const wrong = await agent
      .post('/api/labs/sql-injection-basics/submit')
      .set('X-CSRF-Token', token)
      .send({ submission: { flag: 'wrong' } })
      .expect(200);
    expect(wrong.body.data.completed).toBe(false);
    const completed = await agent
      .post('/api/labs/sql-injection-basics/submit')
      .set('X-CSRF-Token', token)
      .send({ submission: { flag: 'CYBERLAB{product_search_tautology}' } })
      .expect(200);
    expect(completed.body.data).toMatchObject({
      completed: true,
      progress: { status: 'COMPLETED' },
      session: { status: 'COMPLETED' },
    });
    const repeated = await agent
      .post('/api/labs/sql-injection-basics/submit')
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
