import { LabProgressStatus, type Prisma } from '@prisma/client';
import { prisma } from '../../lib/prisma.js';

const publicLabSelect = {
  id: true,
  slug: true,
  title: true,
  description: true,
  category: true,
  difficulty: true,
  estimatedMinutes: true,
  points: true,
} satisfies Prisma.LabSelect;

export const labRepository = {
  findPublishedLabs() {
    return prisma.lab.findMany({
      where: { isPublished: true },
      select: publicLabSelect,
      orderBy: { title: 'asc' },
    });
  },
  findPublishedLabBySlug(slug: string) {
    return prisma.lab.findFirst({ where: { slug, isPublished: true }, select: publicLabSelect });
  },
  findPublishedLabRecordBySlug(slug: string) {
    return prisma.lab.findFirst({ where: { slug, isPublished: true } });
  },
  findProgressByUser(userId: string) {
    return prisma.labProgress.findMany({
      where: { userId },
      select: {
        id: true,
        labId: true,
        status: true,
        startedAt: true,
        completedAt: true,
        lab: { select: publicLabSelect },
      },
      orderBy: { updatedAt: 'desc' },
    });
  },
  startProgress(userId: string, labId: string) {
    return prisma.labProgress.upsert({
      where: { userId_labId: { userId, labId } },
      create: { userId, labId, status: LabProgressStatus.IN_PROGRESS, startedAt: new Date() },
      update: {},
      select: {
        id: true,
        labId: true,
        status: true,
        startedAt: true,
        completedAt: true,
        lab: { select: publicLabSelect },
      },
    });
  },
  completeProgress(userId: string, labId: string) {
    return prisma.labProgress.upsert({
      where: { userId_labId: { userId, labId } },
      create: {
        userId,
        labId,
        status: LabProgressStatus.COMPLETED,
        startedAt: new Date(),
        completedAt: new Date(),
      },
      update: { status: LabProgressStatus.COMPLETED, completedAt: new Date() },
      select: {
        id: true,
        labId: true,
        status: true,
        startedAt: true,
        completedAt: true,
        lab: { select: publicLabSelect },
      },
    });
  },
};
