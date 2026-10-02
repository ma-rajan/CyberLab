import bcrypt from 'bcryptjs';

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
for (const definition of [
  createFlagDefinition('SQL_INJECTION_PRODUCT_SEARCH', 'Correct flag. Product Search is complete.'),
  createFlagDefinition('XSS_FEEDBACK_SEARCH', 'Correct completion value. Feedback Search is complete.'),
  createFlagDefinition('IDOR_PROFILE_ACCESS', 'Correct completion value. Profile Access is complete.'),
  createFlagDefinition('AUTHENTICATION_BYPASS', 'Correct completion value. Authentication Bypass is complete.'),
  createFlagDefinition('BROKEN_FUNCTION_ACCESS', 'Correct completion value. Broken Function-Level Authorization is complete.'),
  createFlagDefinition('SSRF_MOCK_FETCH', 'Correct completion value. Server-Side Request Forgery is complete.'),
  createFlagDefinition('SQLI_USER_DIRECTORY', 'Correct completion value. SQL Injection is complete.'),
]) definitions.set(definition.challengeType, definition);

export function registerLabDefinition(definition: LabDefinition) {
  definitions.set(definition.challengeType, definition);
}

export function getLabDefinition(challengeType: string) {
  return definitions.get(challengeType) ?? placeholderDefinition;
}
