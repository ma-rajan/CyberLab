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
import {
  readTrainingUpload,
  uploadTrainingProfileImage,
} from './isolated-targets/file-upload.target.js';
import {
  getTrainingCsrfSettings,
  updateTrainingCsrfSettings,
} from './isolated-targets/csrf-settings.target.js';
import { readTrainingFile } from './isolated-targets/path-traversal.target.js';
import { renderSstiPreview } from './isolated-targets/ssti-preview.target.js';
import { simulateCorsPolicy, type CorsSimulationInput } from './isolated-targets/cors-policy.target.js';
import { simulateCommandInjection, type CommandSimulationMode } from './isolated-targets/command-injection.target.js';
import { simulateCouponWorkflow, type CouponSimulationInput } from './isolated-targets/business-logic-race.target.js';

async function requirePublishedLab(slug: string) {
  const lab = await labRepository.findPublishedLabRecordBySlug(slug);
  if (!lab) throw new AppError(404, 'LAB_NOT_FOUND', 'Lab not found.');
  return lab;
}

async function requireLabTargetSession(userId: string, slug: string, challengeType: string) {
  const lab = await requirePublishedLab(slug);
  if (lab.challengeType !== challengeType) {
    throw new AppError(404, 'TARGET_NOT_FOUND', 'Target not found.');
  }
  const session = await labRepository.findSession(userId, lab.id);
  if (!session) {
    throw new AppError(404, 'SESSION_NOT_FOUND', 'Start this lab before accessing its target.');
  }
  await labRepository.touchSession(userId, lab.id);
}
function parseHints(hints: string) {
  try {
    const parsed: unknown = JSON.parse(hints);
    return Array.isArray(parsed) && parsed.every((hint) => typeof hint === 'string') ? parsed : [];
  } catch {
    return [];
  }
}
function toLabDetail<T extends { hints: string }>(lab: T) {
  return { ...lab, hints: parseHints(lab.hints) };
}

export const labService = {
  async listPublishedLabs() {
    return (await labRepository.findPublishedLabs()).map(toLabDetail);
  },
  async getPublishedLab(slug: string) {
    const lab = await labRepository.findPublishedLabBySlug(slug);
    if (!lab) throw new AppError(404, 'LAB_NOT_FOUND', 'Lab not found.');
    return toLabDetail(lab);
  },
  getProgressForUser(userId: string) {
    return labRepository.findProgressByUser(userId);
  },
  async getProgressForLab(userId: string, slug: string) {
    const lab = await requirePublishedLab(slug);
    return labRepository.findProgressByUserAndLab(userId, lab.id);
  },
  async startLab(userId: string, slug: string) {
    const lab = await requirePublishedLab(slug);
    const progress = await labRepository.startProgress(userId, lab.id);
    const session = await labRepository.upsertActiveSession(userId, lab.id);
    return { progress, session };
  },
  async getSession(userId: string, slug: string) {
    const lab = await requirePublishedLab(slug);
    const session = await labRepository.findSession(userId, lab.id);
    if (!session)
      throw new AppError(404, 'SESSION_NOT_FOUND', 'Start this lab before accessing its session.');
    return session;
  },
  async submit(userId: string, slug: string, submission: Record<string, unknown>) {
    const lab = await requirePublishedLab(slug);
    const session = await labRepository.findSession(userId, lab.id);
    if (!session)
      throw new AppError(404, 'SESSION_NOT_FOUND', 'Start this lab before submitting an attempt.');
    if (session.status === LabSessionStatus.COMPLETED)
      return { success: true, completed: true, message: 'This lab is already completed.', session };
    const result = await getLabDefinition(lab.challengeType).validate(submission, {
      validatorType: lab.validatorType,
      flagHash: lab.flagHash,
      userId,
      labSessionId: session.id,
      sessionStatus: session.status,
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
    if (!session)
      throw new AppError(404, 'SESSION_NOT_FOUND', 'Start this lab before completing it.');
    if (session.status !== LabSessionStatus.COMPLETED)
      throw new AppError(
        409,
        'LAB_NOT_VALIDATED',
        'Submit a valid attempt before completing this lab.',
      );
    return labRepository.findProgressByUserAndLab(userId, lab.id);
  },
  async searchProductTarget(userId: string, slug: string, search: string) {
    await requireLabTargetSession(userId, slug, 'SQL_INJECTION_PRODUCT_SEARCH');
    return searchProducts(search);
  },
  async searchFeedbackTarget(userId: string, slug: string, feedback: string) {
    await requireLabTargetSession(userId, slug, 'XSS_FEEDBACK_SEARCH');
    return renderFeedbackSearch(feedback);
  },
  async getProfileTarget(userId: string, slug: string, profileId: number) {
    await requireLabTargetSession(userId, slug, 'IDOR_PROFILE_ACCESS');
    return getTrainingProfile(profileId);
  },
  async loginTrainingTarget(
    userId: string,
    slug: string,
    credentials: { username: string; password: string },
  ) {
    await requireLabTargetSession(userId, slug, 'AUTHENTICATION_BYPASS');
    return attemptTrainingLogin(credentials.username, credentials.password);
  },
  async getTrainingReportTarget(userId: string, slug: string, section: 'overview' | 'admin-audit') {
    await requireLabTargetSession(userId, slug, 'BROKEN_FUNCTION_ACCESS');
    return getTrainingReport(section);
  },
  async fetchMockTarget(userId: string, slug: string, path: MockTargetPath) {
    await requireLabTargetSession(userId, slug, 'SSRF_MOCK_FETCH');
    return fetchMockResource(path);
  },
  async searchDirectoryTarget(userId: string, slug: string, query: string) {
    await requireLabTargetSession(userId, slug, 'SQLI_USER_DIRECTORY');
    return searchMockDirectory(query);
  },
  async uploadProfileImageTarget(
    userId: string,
    slug: string,
    upload: { filename: string; mimeType: string; content: Buffer },
  ) {
    await requireLabTargetSession(userId, slug, 'FILE_UPLOAD_VALIDATION');
    return uploadTrainingProfileImage(userId, upload.filename, upload.mimeType, upload.content);
  },
  async getProfileUploadTarget(userId: string, slug: string, uploadId: string) {
    await requireLabTargetSession(userId, slug, 'FILE_UPLOAD_VALIDATION');
    return readTrainingUpload(userId, uploadId);
  },
  async getCsrfSettingsTarget(userId: string, slug: string) {
    await requireLabTargetSession(userId, slug, 'CSRF');
    return getTrainingCsrfSettings(userId);
  },
  async updateCsrfSettingsTarget(
    userId: string,
    slug: string,
    notificationsEnabled: boolean,
    usedValidCsrfToken: boolean,
  ) {
    await requireLabTargetSession(userId, slug, 'CSRF');
    return updateTrainingCsrfSettings(userId, notificationsEnabled, usedValidCsrfToken);
  },
  async readTrainingFileTarget(userId: string, slug: string, file: string) {
    await requireLabTargetSession(userId, slug, 'PATH_TRAVERSAL');
    const result = readTrainingFile(userId, file);
    if (!result) throw new AppError(404, 'FILE_NOT_FOUND', 'Training file not found.');
    return result;
  },
  async renderSstiPreviewTarget(userId: string, slug: string, input: string) {
    await requireLabTargetSession(userId, slug, 'SSTI_ALLOWLISTED');
    const result = renderSstiPreview(userId, input);
    if (!result) throw new AppError(400, 'UNSUPPORTED_TEMPLATE_EXPRESSION', 'The template contains an unsupported or malformed training expression.');
    return result;
  },
  async simulateCorsTarget(userId: string, slug: string, input: CorsSimulationInput) {
    await requireLabTargetSession(userId, slug, 'CORS_POLICY_SIMULATOR');
    return simulateCorsPolicy(userId, input);
  },
  async simulateCommandInjectionTarget(userId: string, slug: string, mode: CommandSimulationMode, input: string) {
    const lab = await requirePublishedLab(slug);
    if (lab.challengeType !== 'COMMAND_INJECTION_SIMULATOR') {
      throw new AppError(404, 'TARGET_NOT_FOUND', 'Target not found.');
    }
    const session = await labRepository.findSession(userId, lab.id);
    if (!session) throw new AppError(404, 'SESSION_NOT_FOUND', 'Start this lab before accessing its target.');
    if (session.status !== LabSessionStatus.ACTIVE) {
      throw new AppError(409, 'SESSION_NOT_ACTIVE', 'This lab session is no longer active.');
    }
    await labRepository.touchSession(userId, lab.id);
    const result = simulateCommandInjection(session.id, mode, input);
    if (!result) throw new AppError(400, 'UNSUPPORTED_TRAINING_SYNTAX', 'Use only the documented synthetic training input.');
    return result;
  },
  async simulateBusinessLogicRaceTarget(userId: string, slug: string, input: CouponSimulationInput) {
    const lab = await requirePublishedLab(slug);
    if (lab.challengeType !== 'BUSINESS_LOGIC_RACE_SIMULATOR') {
      throw new AppError(404, 'TARGET_NOT_FOUND', 'Target not found.');
    }
    const session = await labRepository.findSession(userId, lab.id);
    if (!session) throw new AppError(404, 'SESSION_NOT_FOUND', 'Start this lab before accessing its target.');
    if (session.status !== LabSessionStatus.ACTIVE) {
      throw new AppError(409, 'SESSION_NOT_ACTIVE', 'This lab session is no longer active.');
    }
    await labRepository.touchSession(userId, lab.id);
    const result = simulateCouponWorkflow(session.id, input);
    if (!result) throw new AppError(400, 'INVALID_TRAINING_TRANSITION', 'That synthetic coupon workflow transition is not valid.');
    return result;
  },
};
