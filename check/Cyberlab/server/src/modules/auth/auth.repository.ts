import type { Prisma, User } from '@prisma/client';
import { prisma } from '../../lib/prisma.js';

export const authRepository = {
  findUserByEmail(email: string): Promise<User | null> {
    return prisma.user.findUnique({ where: { email } });
  },
  createUser(data: Prisma.UserCreateInput): Promise<User> {
    return prisma.user.create({ data });
  },
  createSession(id: string, userId: string, expiresAt: Date) {
    return prisma.session.create({ data: { id, userId, expiresAt } });
  },
  findActiveSession(id: string, now: Date) {
    return prisma.session.findFirst({
      where: { id, expiresAt: { gt: now } },
      include: { user: true },
    });
  },
  deleteSession(id: string) {
    return prisma.session.deleteMany({ where: { id } });
  },
  createAuditLog(userId: string | null, action: string, metadata?: string) {
    return prisma.auditLog.create({ data: { userId, action, metadata } });
  },
};
