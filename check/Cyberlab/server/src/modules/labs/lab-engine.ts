import bcrypt from 'bcryptjs';
import { hasMismatchedTrainingUpload } from './isolated-targets/file-upload.target.js';
import { hasUnprotectedNotificationChange } from './isolated-targets/csrf-settings.target.js';

export interface LabValidationResult {
  success: boolean;
  completed: boolean;
  message: string;
}

export interface LabDefinition {
  challengeType: string;
  validate: (
    submission: Record<string, unknown>,
    context: LabValidationContext,
  ) => LabValidationResult | Promise<LabValidationResult>;
}

export interface LabValidationContext {
  validatorType: string;
  flagHash: string | null;
  userId: string;
}

// Validators receive data only and never evaluate it as code, SQL, a shell command, or JavaScript.
const placeholderDefinition: LabDefinition = {
  challengeType: 'PLACEHOLDER',
  validate: (submission) => {
    const accepted = submission.confirmation === 'CYBERLAB_READY';
    return {
      success: accepted,
      completed: accepted,
      message: accepted
        ? 'Submission accepted by the safe placeholder validator.'
        : 'This lab is not available for interactive submissions yet.',
    };
  },
};

function createFlagDefinition(challengeType: string, successMessage: string): LabDefinition {
  return {
    challengeType,
  validate: async (submission, context) => {
    const flag = typeof submission.flag === 'string' ? submission.flag : '';
    const accepted =
      context.validatorType === 'FLAG' &&
      Boolean(context.flagHash) &&
      (await bcrypt.compare(flag, context.flagHash!));
    return {
      success: accepted,
      completed: accepted,
      message: accepted ? successMessage : 'That completion value is not correct. Keep investigating the isolated target.',
    };
  },
  };
}

const definitions = new Map<string, LabDefinition>();
const fileUploadDefinition: LabDefinition = {
  challengeType: 'FILE_UPLOAD_VALIDATION',
  validate: async (submission, context) => {
    const flag = typeof submission.flag === 'string' ? submission.flag : '';
    const accepted = context.validatorType === 'FILE_UPLOAD' && Boolean(context.flagHash) &&
      await bcrypt.compare(flag, context.flagHash!) && await hasMismatchedTrainingUpload(context.userId);
    return { success: accepted, completed: accepted, message: accepted ? 'Correct flag and verified mismatched upload. File Upload Validation is complete.' : 'Submit the completion value only after the isolated target accepts a mismatched upload.' };
  },
};
const csrfDefinition: LabDefinition = { challengeType: 'CSRF', validate: async (submission, context) => {
  const flag = typeof submission.flag === 'string' ? submission.flag : '';
  const accepted = context.validatorType === 'CSRF' && Boolean(context.flagHash) && await bcrypt.compare(flag, context.flagHash!) && hasUnprotectedNotificationChange(context.userId);
  return { success: accepted, completed: accepted, message: accepted ? 'Verified: the isolated victim setting changed without a valid CSRF token. CSRF is complete.' : 'First change the isolated notification setting through the tokenless training request, then submit its completion value.' };
} };
for (const definition of [
  createFlagDefinition('SQL_INJECTION_PRODUCT_SEARCH', 'Correct flag. Product Search is complete.'),
  createFlagDefinition('XSS_FEEDBACK_SEARCH', 'Correct completion value. Feedback Search is complete.'),
  createFlagDefinition('IDOR_PROFILE_ACCESS', 'Correct completion value. Profile Access is complete.'),
  createFlagDefinition('AUTHENTICATION_BYPASS', 'Correct completion value. Authentication Bypass is complete.'),
  createFlagDefinition('BROKEN_FUNCTION_ACCESS', 'Correct completion value. Broken Function-Level Authorization is complete.'),
  createFlagDefinition('SSRF_MOCK_FETCH', 'Correct completion value. Server-Side Request Forgery is complete.'),
  createFlagDefinition('SQLI_USER_DIRECTORY', 'Correct completion value. SQL Injection is complete.'),
  fileUploadDefinition,
  csrfDefinition,
]) definitions.set(definition.challengeType, definition);

export function registerLabDefinition(definition: LabDefinition) {
  definitions.set(definition.challengeType, definition);
}

export function getLabDefinition(challengeType: string) {
  return definitions.get(challengeType) ?? placeholderDefinition;
}
