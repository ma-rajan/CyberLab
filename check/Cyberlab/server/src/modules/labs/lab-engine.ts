import bcrypt from 'bcryptjs';
import { hasMismatchedTrainingUpload } from './isolated-targets/file-upload.target.js';
import { hasUnprotectedNotificationChange } from './isolated-targets/csrf-settings.target.js';
import { hasReadRestrictedTrainingFile } from './isolated-targets/path-traversal.target.js';
import { hasCompletedSstiExercise } from './isolated-targets/ssti-preview.target.js';
import { hasCompletedCorsExercise } from './isolated-targets/cors-policy.target.js';
import { hasCompletedCommandInjectionExercise } from './isolated-targets/command-injection.target.js';
import { hasCompletedBusinessLogicRace } from './isolated-targets/business-logic-race.target.js';

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
  labSessionId?: string;
  sessionStatus?: string;
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
const pathTraversalDefinition: LabDefinition = {
  challengeType: 'PATH_TRAVERSAL',
  validate: async (submission, context) => {
    const flag = typeof submission.flag === 'string' ? submission.flag : '';
    const accepted = context.validatorType === 'PATH_TRAVERSAL' && Boolean(context.flagHash) &&
      await bcrypt.compare(flag, context.flagHash!) && hasReadRestrictedTrainingFile(context.userId);
    return {
      success: accepted,
      completed: accepted,
      message: accepted
        ? 'Verified: the isolated file service exposed its synthetic restricted note. Path Traversal is complete.'
        : 'Read the synthetic restricted note through the isolated target before submitting its completion value.',
    };
  },
};
const sstiDefinition: LabDefinition = {
  challengeType: 'SSTI_ALLOWLISTED',
  validate: async (submission, context) => {
    const flag = typeof submission.flag === 'string' ? submission.flag : '';
    const accepted = context.validatorType === 'SSTI' && Boolean(context.flagHash) &&
      await bcrypt.compare(flag, context.flagHash!) && hasCompletedSstiExercise(context.userId);
    return {
      success: accepted,
      completed: accepted,
      message: accepted
        ? 'Verified: you compared template evaluation with literal data rendering. SSTI is complete.'
        : 'Demonstrate an allowed expression, compare the secure preview, and retrieve the training completion value first.',
    };
  },
};
const corsDefinition: LabDefinition = {
  challengeType: 'CORS_POLICY_SIMULATOR',
  validate: async (submission, context) => {
    const flag = typeof submission.flag === 'string' ? submission.flag : '';
    const accepted = context.validatorType === 'CORS_POLICY' && Boolean(context.flagHash) &&
      await bcrypt.compare(flag, context.flagHash!) && hasCompletedCorsExercise(context.userId);
    return {
      success: accepted,
      completed: accepted,
      message: accepted
        ? 'Verified: you compared permissive and allowlisted CORS behavior, including preflight and credentialed wildcard rules. CORS Policy is complete.'
        : 'Compare an untrusted origin, the simulated preflight outcomes, and the wildcard credential rule before submitting the completion value.',
    };
  },
};
const commandInjectionDefinition: LabDefinition = {
  challengeType: 'COMMAND_INJECTION_SIMULATOR',
  validate: (submission, context) => {
    const accepted = context.validatorType === 'COMMAND_INJECTION' &&
      context.sessionStatus === 'ACTIVE' && submission.confirmation === true &&
      Boolean(context.labSessionId) && hasCompletedCommandInjectionExercise(context.labSessionId!);
    return {
      success: accepted,
      completed: accepted,
      message: accepted
        ? 'Verified: the simulator showed injected command interpretation and the fixed-operation comparison. Command Injection is complete.'
        : 'Demonstrate the synthetic injection, compare secure handling, then verify the exercise.',
    };
  },
};
const businessLogicRaceDefinition: LabDefinition = {
  challengeType: 'BUSINESS_LOGIC_RACE_SIMULATOR',
  validate: (submission, context) => {
    const accepted = context.validatorType === 'BUSINESS_LOGIC_RACE' &&
      context.sessionStatus === 'ACTIVE' && submission.confirmation === true &&
      Boolean(context.labSessionId) && hasCompletedBusinessLogicRace(context.labSessionId!);
    return {
      success: accepted,
      completed: accepted,
      message: accepted
        ? 'Verified: the stale-check race exceeded the coupon limit, and the atomic comparison preserved it.'
        : 'Demonstrate the stale-check violation and the atomic comparison before verifying this exercise.',
    };
  },
};
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
  pathTraversalDefinition,
  sstiDefinition,
  corsDefinition,
  commandInjectionDefinition,
  businessLogicRaceDefinition,
]) definitions.set(definition.challengeType, definition);

export function registerLabDefinition(definition: LabDefinition) {
  definitions.set(definition.challengeType, definition);
}

export function getLabDefinition(challengeType: string) {
  return definitions.get(challengeType) ?? placeholderDefinition;
}
