import { LabSessionStatus } from '@prisma/client';
import { AppError } from '../auth/auth.errors.js';
import { getLabDefinition } from './lab-engine.js';
import { labRepository } from './lab.repository.js';

async function requirePublishedLab(slug: string) {
  const lab = await labRepository.findPublishedLabRecordBySlug(slug);
  if (!lab) throw new AppError(404, 'LAB_NOT_FOUND', 'Lab not found.');
  return lab;
}
function parseHints(hints: string) {
  try {
    const parsed: unknown = JSON.parse(hints);
    return Array.isArray(parsed) && parsed.every((hint) => typeof hint === 'string') ? parsed : [];
  } catch { return []; }
}
function toLabDetail<T extends { hints: string }>(lab: T) { return { ...lab, hints: parseHints(lab.hints) }; }

export const labService = {
  async listPublishedLabs() { return (await labRepository.findPublishedLabs()).map(toLabDetail); },
  async getPublishedLab(slug: string) {
    const lab = await labRepository.findPublishedLabBySlug(slug);
    if (!lab) throw new AppError(404, 'LAB_NOT_FOUND', 'Lab not found.');
    return toLabDetail(lab);
  },
  getProgressForUser(userId: string) { return labRepository.findProgressByUser(userId); },
  async getProgressForLab(userId: string, slug: string) { const lab = await requirePublishedLab(slug); return labRepository.findProgressByUserAndLab(userId, lab.id); },
  async startLab(userId: string, slug: string) {
    const lab = await requirePublishedLab(slug);
    const progress = await labRepository.startProgress(userId, lab.id);
    const session = await labRepository.upsertActiveSession(userId, lab.id);
    return { progress, session };
  },
  async getSession(userId: string, slug: string) {
    const lab = await requirePublishedLab(slug);
    const session = await labRepository.findSession(userId, lab.id);
    if (!session) throw new AppError(404, 'SESSION_NOT_FOUND', 'Start this lab before accessing its session.');
    return session;
  },
  async submit(userId: string, slug: string, submission: Record<string, unknown>) {
    const lab = await requirePublishedLab(slug);
    const session = await labRepository.findSession(userId, lab.id);
    if (!session) throw new AppError(404, 'SESSION_NOT_FOUND', 'Start this lab before submitting an attempt.');
    if (session.status === LabSessionStatus.COMPLETED) return { success: true, completed: true, message: 'This lab is already completed.', session };
    const result = await getLabDefinition(slug).validate(submission);
    if (result.completed) {
      const completedSession = await labRepository.completeSession(userId, lab.id);
      const progress = await labRepository.completeProgress(userId, lab.id);
      return { ...result, session: completedSession, progress };
    }
    return { ...result, session: await labRepository.touchSession(userId, lab.id) };
  },
  async completeLab(userId: string, slug: string) {
    const lab = await requirePublishedLab(slug);
    const session = await labRepository.findSession(userId, lab.id);
    if (!session) throw new AppError(404, 'SESSION_NOT_FOUND', 'Start this lab before completing it.');
    if (session.status !== LabSessionStatus.COMPLETED) throw new AppError(409, 'LAB_NOT_VALIDATED', 'Submit a valid attempt before completing this lab.');
    return labRepository.findProgressByUserAndLab(userId, lab.id);
  },
};
