import { LabSessionStatus } from '@prisma/client';
import { AppError } from '../auth/auth.errors.js';
import { getLabDefinition } from './lab-engine.js';
import { labRepository } from './lab.repository.js';
import { searchProducts } from './isolated-targets/product-search.target.js';
import { renderFeedbackSearch } from './isolated-targets/feedback-search.target.js';
import { getTrainingProfile } from './isolated-targets/profile-access.target.js';
import { attemptTrainingLogin } from './isolated-targets/authentication-bypass.target.js';
import { getTrainingReport } from './isolated-targets/admin-report.target.js';
import { fetchMockResource, type MockTargetPath } from './isolated-targets/mock-fetch.target.js';
import { searchMockDirectory } from './isolated-targets/user-directory.target.js';
import { readTrainingUpload, uploadTrainingProfileImage } from './isolated-targets/file-upload.target.js';
import { getTrainingCsrfSettings, updateTrainingCsrfSettings } from './isolated-targets/csrf-settings.target.js';

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
    const result = await getLabDefinition(lab.challengeType).validate(submission, {
      validatorType: lab.validatorType,
      flagHash: lab.flagHash,
      userId,
    });
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
  async searchProductTarget(userId: string, slug: string, search: string) {
    const lab = await requirePublishedLab(slug);
    if (lab.challengeType !== 'SQL_INJECTION_PRODUCT_SEARCH') throw new AppError(404, 'TARGET_NOT_FOUND', 'Target not found.');
    const session = await labRepository.findSession(userId, lab.id);
    if (!session) throw new AppError(404, 'SESSION_NOT_FOUND', 'Start this lab before accessing its target.');
    await labRepository.touchSession(userId, lab.id);
    return searchProducts(search);
  },
  async searchFeedbackTarget(userId: string, slug: string, feedback: string) {
    const lab = await requirePublishedLab(slug);
    if (lab.challengeType !== 'XSS_FEEDBACK_SEARCH') throw new AppError(404, 'TARGET_NOT_FOUND', 'Target not found.');
    const session = await labRepository.findSession(userId, lab.id);
    if (!session) throw new AppError(404, 'SESSION_NOT_FOUND', 'Start this lab before accessing its target.');
    await labRepository.touchSession(userId, lab.id);
    return renderFeedbackSearch(feedback);
  },
  async getProfileTarget(userId: string, slug: string, profileId: number) {
    const lab = await requirePublishedLab(slug);
    if (lab.challengeType !== 'IDOR_PROFILE_ACCESS') throw new AppError(404, 'TARGET_NOT_FOUND', 'Target not found.');
    const session = await labRepository.findSession(userId, lab.id);
    if (!session) throw new AppError(404, 'SESSION_NOT_FOUND', 'Start this lab before accessing its target.');
    await labRepository.touchSession(userId, lab.id);
    return getTrainingProfile(profileId);
  },
  async loginTrainingTarget(userId: string, slug: string, credentials: { username: string; password: string }) {
    const lab = await requirePublishedLab(slug);
    if (lab.challengeType !== 'AUTHENTICATION_BYPASS') throw new AppError(404, 'TARGET_NOT_FOUND', 'Target not found.');
    const session = await labRepository.findSession(userId, lab.id);
    if (!session) throw new AppError(404, 'SESSION_NOT_FOUND', 'Start this lab before accessing its target.');
    await labRepository.touchSession(userId, lab.id);
    return attemptTrainingLogin(credentials.username, credentials.password);
  },
  async getTrainingReportTarget(userId: string, slug: string, section: 'overview' | 'admin-audit') {
    const lab = await requirePublishedLab(slug);
    if (lab.challengeType !== 'BROKEN_FUNCTION_ACCESS') throw new AppError(404, 'TARGET_NOT_FOUND', 'Target not found.');
    const session = await labRepository.findSession(userId, lab.id);
    if (!session) throw new AppError(404, 'SESSION_NOT_FOUND', 'Start this lab before accessing its target.');
    await labRepository.touchSession(userId, lab.id);
    return getTrainingReport(section);
  },
  async fetchMockTarget(userId: string, slug: string, path: MockTargetPath) {
    const lab = await requirePublishedLab(slug);
    if (lab.challengeType !== 'SSRF_MOCK_FETCH') throw new AppError(404, 'TARGET_NOT_FOUND', 'Target not found.');
    const session = await labRepository.findSession(userId, lab.id);
    if (!session) throw new AppError(404, 'SESSION_NOT_FOUND', 'Start this lab before accessing its target.');
    await labRepository.touchSession(userId, lab.id);
    return fetchMockResource(path);
  },
  async searchDirectoryTarget(userId: string, slug: string, query: string) {
    const lab = await requirePublishedLab(slug);
    if (lab.challengeType !== 'SQLI_USER_DIRECTORY') throw new AppError(404, 'TARGET_NOT_FOUND', 'Target not found.');
    const session = await labRepository.findSession(userId, lab.id);
    if (!session) throw new AppError(404, 'SESSION_NOT_FOUND', 'Start this lab before accessing its target.');
    await labRepository.touchSession(userId, lab.id);
    return searchMockDirectory(query);
  },
  async uploadProfileImageTarget(userId: string, slug: string, upload: { filename: string; mimeType: string; content: Buffer }) {
    const lab = await requirePublishedLab(slug);
    if (lab.challengeType !== 'FILE_UPLOAD_VALIDATION') throw new AppError(404, 'TARGET_NOT_FOUND', 'Target not found.');
    const session = await labRepository.findSession(userId, lab.id);
    if (!session) throw new AppError(404, 'SESSION_NOT_FOUND', 'Start this lab before accessing its target.');
    await labRepository.touchSession(userId, lab.id);
    return uploadTrainingProfileImage(userId, upload.filename, upload.mimeType, upload.content);
  },
  async getProfileUploadTarget(userId: string, slug: string, uploadId: string) {
    const lab = await requirePublishedLab(slug);
    if (lab.challengeType !== 'FILE_UPLOAD_VALIDATION') throw new AppError(404, 'TARGET_NOT_FOUND', 'Target not found.');
    const session = await labRepository.findSession(userId, lab.id);
    if (!session) throw new AppError(404, 'SESSION_NOT_FOUND', 'Start this lab before accessing its target.');
    await labRepository.touchSession(userId, lab.id);
    return readTrainingUpload(userId, uploadId);
  },
  async getCsrfSettingsTarget(userId: string, slug: string) {
    const lab = await requirePublishedLab(slug); if (lab.challengeType !== 'CSRF') throw new AppError(404, 'TARGET_NOT_FOUND', 'Target not found.');
    const session = await labRepository.findSession(userId, lab.id); if (!session) throw new AppError(404, 'SESSION_NOT_FOUND', 'Start this lab before accessing its target.');
    await labRepository.touchSession(userId, lab.id); return getTrainingCsrfSettings(userId);
  },
  async updateCsrfSettingsTarget(userId: string, slug: string, notificationsEnabled: boolean, usedValidCsrfToken: boolean) {
    const lab = await requirePublishedLab(slug); if (lab.challengeType !== 'CSRF') throw new AppError(404, 'TARGET_NOT_FOUND', 'Target not found.');
    const session = await labRepository.findSession(userId, lab.id); if (!session) throw new AppError(404, 'SESSION_NOT_FOUND', 'Start this lab before accessing its target.');
    await labRepository.touchSession(userId, lab.id); return updateTrainingCsrfSettings(userId, notificationsEnabled, usedValidCsrfToken);
  },
};
