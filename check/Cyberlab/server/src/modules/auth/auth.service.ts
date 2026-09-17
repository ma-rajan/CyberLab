import { randomBytes } from 'node:crypto';
import { Prisma } from '@prisma/client';
import { env } from '../../config/env.js';
import { AppError } from './auth.errors.js';
import { authRepository } from './auth.repository.js';
import type { LoginInput, RegisterInput } from './auth.validators.js';
import type { SafeUser } from './auth.types.js';
import { hashPassword, verifyPassword, verifyUnknownUserPassword } from './password.js';

const INVALID_CREDENTIALS = 'Invalid email or password.';

function toSafeUser(user: { id: string; username: string; email: string }): SafeUser {
  return { id: user.id, username: user.username, email: user.email };
}

function createSessionId() {
  return randomBytes(32).toString('base64url');
}

export const authService = {
  async register(input: RegisterInput) {
    const passwordHash = await hashPassword(input.password);
    try {
      const user = await authRepository.createUser({
        username: input.username,
        email: input.email,
        passwordHash,
      });
      await authRepository.createAuditLog(user.id, 'auth.registered');
      return toSafeUser(user);
    } catch (error: unknown) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        throw new AppError(
          409,
          'REGISTRATION_FAILED',
          'Unable to create an account with these details.',
        );
      }
      throw error;
    }
  },

  async login(input: LoginInput, previousSessionId?: string) {
    const user = await authRepository.findUserByEmail(input.email);
    const valid = user
      ? await verifyPassword(input.password, user.passwordHash)
      : await verifyUnknownUserPassword(input.password);
    if (!user || !valid) {
      await authRepository.createAuditLog(user?.id ?? null, 'auth.login_failed');
      throw new AppError(401, 'INVALID_CREDENTIALS', INVALID_CREDENTIALS);
    }

    const sessionId = createSessionId();
    const expiresAt = new Date(Date.now() + env.SESSION_TTL_DAYS * 24 * 60 * 60 * 1000);
    if (previousSessionId) await authRepository.deleteSession(previousSessionId);
    await authRepository.createSession(sessionId, user.id, expiresAt);
    await authRepository.createAuditLog(user.id, 'auth.login_succeeded');
    return { user: toSafeUser(user), sessionId, expiresAt };
  },

  async getAuthenticatedUser(sessionId: string) {
    const session = await authRepository.findActiveSession(sessionId, new Date());
    if (!session) return null;
    return { ...toSafeUser(session.user), sessionId: session.id };
  },

  async logout(sessionId: string, userId: string) {
    await authRepository.deleteSession(sessionId);
    await authRepository.createAuditLog(userId, 'auth.logout');
  },
};
