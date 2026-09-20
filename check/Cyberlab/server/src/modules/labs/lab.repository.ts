import { LabProgressStatus, LabSessionStatus, type Prisma } from '@prisma/client';
import { prisma } from '../../lib/prisma.js';

const publicLabSelect = {
  id: true, slug: true, title: true, description: true, category: true, difficulty: true,
  estimatedMinutes: true, points: true, objective: true, instructions: true, hints: true,
} satisfies Prisma.LabSelect;
const progressSelect = {
  id: true, labId: true, status: true, startedAt: true, completedAt: true,
  lab: { select: publicLabSelect },
} satisfies Prisma.LabProgressSelect;
const sessionSelect = {
  id: true, labId: true, startedAt: true, lastActivityAt: true, completedAt: true, status: true,
  lab: { select: publicLabSelect },
} satisfies Prisma.LabSessionSelect;

export const labRepository = {
  findPublishedLabs() { return prisma.lab.findMany({ where: { isPublished: true }, select: publicLabSelect, orderBy: { title: 'asc' } }); },
  findPublishedLabBySlug(slug: string) { return prisma.lab.findFirst({ where: { slug, isPublished: true }, select: publicLabSelect }); },
  findPublishedLabRecordBySlug(slug: string) { return prisma.lab.findFirst({ where: { slug, isPublished: true } }); },
  findProgressByUser(userId: string) { return prisma.labProgress.findMany({ where: { userId }, select: progressSelect, orderBy: { updatedAt: 'desc' } }); },
  findProgressByUserAndLab(userId: string, labId: string) { return prisma.labProgress.findUnique({ where: { userId_labId: { userId, labId } }, select: progressSelect }); },
  startProgress(userId: string, labId: string) {
    return prisma.labProgress.upsert({ where: { userId_labId: { userId, labId } }, create: { userId, labId, status: LabProgressStatus.IN_PROGRESS, startedAt: new Date() }, update: {}, select: progressSelect });
  },
  completeProgress(userId: string, labId: string) {
    return prisma.labProgress.upsert({ where: { userId_labId: { userId, labId } }, create: { userId, labId, status: LabProgressStatus.COMPLETED, startedAt: new Date(), completedAt: new Date() }, update: { status: LabProgressStatus.COMPLETED, completedAt: new Date() }, select: progressSelect });
  },
  findSession(userId: string, labId: string) { return prisma.labSession.findUnique({ where: { userId_labId: { userId, labId } }, select: sessionSelect }); },
  upsertActiveSession(userId: string, labId: string) {
    return prisma.labSession.upsert({ where: { userId_labId: { userId, labId } }, create: { userId, labId, status: LabSessionStatus.ACTIVE }, update: { lastActivityAt: new Date() }, select: sessionSelect });
  },
  touchSession(userId: string, labId: string) { return prisma.labSession.update({ where: { userId_labId: { userId, labId } }, data: { lastActivityAt: new Date() }, select: sessionSelect }); },
  completeSession(userId: string, labId: string) { return prisma.labSession.update({ where: { userId_labId: { userId, labId } }, data: { status: LabSessionStatus.COMPLETED, completedAt: new Date(), lastActivityAt: new Date() }, select: sessionSelect }); },
};
