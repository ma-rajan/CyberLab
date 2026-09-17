import { AppError } from '../auth/auth.errors.js';
import { labRepository } from './lab.repository.js';

async function requirePublishedLab(slug: string) {
  const lab = await labRepository.findPublishedLabRecordBySlug(slug);
  if (!lab) throw new AppError(404, 'LAB_NOT_FOUND', 'Lab not found.');
  return lab;
}

export const labService = {
  listPublishedLabs() {
    return labRepository.findPublishedLabs();
  },
  async getPublishedLab(slug: string) {
    const lab = await labRepository.findPublishedLabBySlug(slug);
    if (!lab) throw new AppError(404, 'LAB_NOT_FOUND', 'Lab not found.');
    return lab;
  },
  getProgressForUser(userId: string) {
    return labRepository.findProgressByUser(userId);
  },
  async startLab(userId: string, slug: string) {
    const lab = await requirePublishedLab(slug);
    return labRepository.startProgress(userId, lab.id);
  },
  async completeLab(userId: string, slug: string) {
    const lab = await requirePublishedLab(slug);
    return labRepository.completeProgress(userId, lab.id);
  },
};
