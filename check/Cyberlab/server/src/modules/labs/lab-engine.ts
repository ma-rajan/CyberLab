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

const flagDefinition: LabDefinition = {
  challengeType: 'SQL_INJECTION_PRODUCT_SEARCH',
  validate: async (submission, context) => {
    const flag = typeof submission.flag === 'string' ? submission.flag : '';
    const accepted =
      context.validatorType === 'FLAG' &&
      Boolean(context.flagHash) &&
      (await bcrypt.compare(flag, context.flagHash!));
    return {
      success: accepted,
      completed: accepted,
      message: accepted
        ? 'Correct flag. Product Search is complete.'
        : 'That flag is not correct. Keep investigating the isolated target.',
    };
  },
};

const definitions = new Map<string, LabDefinition>();
definitions.set(flagDefinition.challengeType, flagDefinition);

export function registerLabDefinition(definition: LabDefinition) {
  definitions.set(definition.challengeType, definition);
}

export function getLabDefinition(challengeType: string) {
  return definitions.get(challengeType) ?? placeholderDefinition;
}
