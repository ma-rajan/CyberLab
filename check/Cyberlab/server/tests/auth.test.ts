import bcrypt from 'bcryptjs';
import request from 'supertest';
import { beforeEach, describe, expect, it } from 'vitest';
import { app } from '../src/app.js';
import { prisma } from '../src/lib/prisma.js';
import { authRateLimitStore } from '../src/middleware/auth-rate-limit.js';

const validPassword = 'SecurePassphrase1!';

async function csrf(agent: ReturnType<typeof request.agent>) {
  const response = await agent.get('/api/auth/csrf');
  return response.body.data.csrfToken as string;
}

async function createUser(email = 'learner@example.test', username = 'learner') {
  return prisma.user.create({
    data: { username, email, passwordHash: await bcrypt.hash(validPassword, 12) },
  });
}

beforeEach(async () => {
  authRateLimitStore.resetAll();
  await prisma.session.deleteMany();
  await prisma.auditLog.deleteMany();
  await prisma.user.deleteMany();
});

describe('authentication API', () => {
  it('registers a user, hashes the password, and returns no password hash', async () => {
    const agent = request.agent(app);
    const token = await csrf(agent);
    const response = await agent.post('/api/auth/register').set('X-CSRF-Token', token).send({
      username: '  learner_01  ',
      email: '  Learner@Example.test ',
      password: validPassword,
    });

    expect(response.status).toBe(201);
    expect(response.body.data.user).toMatchObject({
      username: 'learner_01',
      email: 'learner@example.test',
    });
    expect(JSON.stringify(response.body)).not.toContain('passwordHash');
    const user = await prisma.user.findUniqueOrThrow({ where: { email: 'learner@example.test' } });
    expect(user.username).toBe('learner_01');
    expect(user.passwordHash).not.toBe(validPassword);
    expect(await bcrypt.compare(validPassword, user.passwordHash)).toBe(true);
    expect(
      await prisma.auditLog.findFirst({ where: { userId: user.id, action: 'auth.registered' } }),
    ).not.toBeNull();
  });

  it('rejects duplicate email safely', async () => {
    const agent = request.agent(app);
    const token = await csrf(agent);
    const body = {
      username: 'learner',
      email: 'learner@example.test',
      password: validPassword,
      confirmPassword: validPassword,
    };
    await agent.post('/api/auth/register').set('X-CSRF-Token', token).send(body).expect(201);
    const response = await agent.post('/api/auth/register').set('X-CSRF-Token', token).send(body);
    expect(response.status).toBe(409);
    expect(response.body.error.code).toBe('REGISTRATION_FAILED');
  });

  it('rejects a duplicate username', async () => {
    const agent = request.agent(app);
    const token = await csrf(agent);
    await agent
      .post('/api/auth/register')
      .set('X-CSRF-Token', token)
      .send({
        username: 'learner',
        email: 'first@example.test',
        password: validPassword,
        confirmPassword: validPassword,
      })
      .expect(201);
    const response = await agent
      .post('/api/auth/register')
      .set('X-CSRF-Token', token)
      .send({
        username: 'learner',
        email: 'second@example.test',
        password: validPassword,
        confirmPassword: validPassword,
      });
    expect(response.status).toBe(409);
    expect(response.body.error.code).toBe('REGISTRATION_FAILED');
  });

  it('rejects malformed registration input', async () => {
    const agent = request.agent(app);
    const token = await csrf(agent);
    const response = await agent
      .post('/api/auth/register')
      .set('X-CSRF-Token', token)
      .send({
        username: 'invalid username',
        email: 'invalid',
        password: 'short',
        confirmPassword: 'different',
      });
    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('rejects registration with missing fields', async () => {
    const agent = request.agent(app);
    const token = await csrf(agent);
    await agent
      .post('/api/auth/register')
      .set('X-CSRF-Token', token)
      .send({ username: 'learner', email: 'learner@example.test' })
      .expect(400);
  });

  it('logs in with correct credentials and creates an httpOnly session cookie', async () => {
    await createUser();
    const agent = request.agent(app);
    const token = await csrf(agent);
    const response = await agent
      .post('/api/auth/login')
      .set('X-CSRF-Token', token)
      .send({ email: 'learner@example.test', password: validPassword });
    expect(response.status).toBe(200);
    expect(response.headers['set-cookie'].join(';')).toContain('cyberlab_session=');
    expect(response.headers['set-cookie'].join(';')).toContain('HttpOnly');
    expect(response.headers['set-cookie'].join(';')).toContain('SameSite=Lax');
    expect(response.body.data.user.passwordHash).toBeUndefined();
  });

  it('rejects incorrect credentials without revealing account existence', async () => {
    await createUser();
    const agent = request.agent(app);
    const token = await csrf(agent);
    const known = await agent
      .post('/api/auth/login')
      .set('X-CSRF-Token', token)
      .send({ email: 'learner@example.test', password: 'incorrect-password' });
    const unknown = await agent
      .post('/api/auth/login')
      .set('X-CSRF-Token', token)
      .send({ email: 'missing@example.test', password: 'incorrect-password' });
    expect(known.status).toBe(401);
    expect(unknown.status).toBe(401);
    expect(known.body.error).toEqual(unknown.body.error);
  });

  it('rejects invalid login input', async () => {
    const agent = request.agent(app);
    const token = await csrf(agent);
    await agent
      .post('/api/auth/login')
      .set('X-CSRF-Token', token)
      .send({ email: 'not-an-email', password: '' })
      .expect(400);
  });

  it('restores an authenticated user through /api/auth/me', async () => {
    await createUser();
    const agent = request.agent(app);
    const token = await csrf(agent);
    await agent
      .post('/api/auth/login')
      .set('X-CSRF-Token', token)
      .send({ email: 'learner@example.test', password: validPassword })
      .expect(200);
    const response = await agent.get('/api/auth/me');
    expect(response.status).toBe(200);
    expect(response.body.data.user).toMatchObject({ email: 'learner@example.test' });
    expect(response.body.data.user).toMatchObject({ username: 'learner' });
    expect(response.body.data.user.passwordHash).toBeUndefined();
    expect(response.body.data.user.sessionId).toBeUndefined();
  });

  it('returns 401 from /api/auth/me without a session', async () => {
    await request(app).get('/api/auth/me').expect(401);
  });

  it('replaces an existing session when logging in again', async () => {
    await createUser();
    const agent = request.agent(app);
    const token = await csrf(agent);
    await agent
      .post('/api/auth/login')
      .set('X-CSRF-Token', token)
      .send({ email: 'learner@example.test', password: validPassword })
      .expect(200);
    const firstSession = await prisma.session.findFirstOrThrow();
    await agent
      .post('/api/auth/login')
      .set('X-CSRF-Token', token)
      .send({ email: 'learner@example.test', password: validPassword })
      .expect(200);
    expect(await prisma.session.findUnique({ where: { id: firstSession.id } })).toBeNull();
    expect(await prisma.session.count()).toBe(1);
  });

  it('rejects unauthenticated protected requests', async () => {
    await request(app).get('/api/auth/protected-test').expect(401);
  });

  it('allows an authenticated request to the protected endpoint', async () => {
    await createUser();
    const agent = request.agent(app);
    const token = await csrf(agent);
    await agent
      .post('/api/auth/login')
      .set('X-CSRF-Token', token)
      .send({ email: 'learner@example.test', password: validPassword })
      .expect(200);
    const response = await agent.get('/api/auth/protected-test');
    expect(response.status).toBe(200);
    expect(response.body.data.message).toBe('Authenticated');
    expect(response.body.data.user).toMatchObject({ username: 'learner' });
    expect(response.body.data.user.passwordHash).toBeUndefined();
    expect(response.body.data.user.sessionId).toBeUndefined();
  });

  it('invalidates the server-side session at logout', async () => {
    await createUser();
    const agent = request.agent(app);
    const token = await csrf(agent);
    await agent
      .post('/api/auth/login')
      .set('X-CSRF-Token', token)
      .send({ email: 'learner@example.test', password: validPassword })
      .expect(200);
    const logoutResponse = await agent.post('/api/auth/logout').set('X-CSRF-Token', token);
    expect(logoutResponse.status).toBe(204);
    expect(logoutResponse.headers['set-cookie'].join(';')).toContain('cyberlab_session=;');
    await agent.get('/api/auth/me').expect(401);
    expect(await prisma.session.count()).toBe(0);
  });

  it('rejects expired sessions', async () => {
    const user = await createUser();
    const sessionId = 'expired-session-id';
    await prisma.session.create({
      data: { id: sessionId, userId: user.id, expiresAt: new Date(Date.now() - 60_000) },
    });
    await request(app)
      .get('/api/auth/me')
      .set('Cookie', `cyberlab_session=${sessionId}`)
      .expect(401);
  });

  it('rejects state-changing requests without a valid CSRF token', async () => {
    await request(app)
      .post('/api/auth/register')
      .send({
        username: 'learner',
        email: 'learner@example.test',
        password: validPassword,
        confirmPassword: validPassword,
      })
      .expect(403);
  });

  it('rate limits repeated authentication attempts', async () => {
    const agent = request.agent(app);
    const token = await csrf(agent);
    for (let attempt = 0; attempt < 10; attempt += 1) {
      await agent
        .post('/api/auth/login')
        .set('X-CSRF-Token', token)
        .send({ email: 'missing@example.test', password: 'incorrect-password' })
        .expect(401);
    }
    const response = await agent
      .post('/api/auth/login')
      .set('X-CSRF-Token', token)
      .send({ email: 'missing@example.test', password: 'incorrect-password' });
    expect(response.status).toBe(429);
    expect(response.body.error.code).toBe('AUTH_RATE_LIMITED');
  });
});
