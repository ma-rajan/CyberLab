export interface LabValidationResult {
  success: boolean;
  completed: boolean;
  message: string;
}

export interface LabDefinition {
  slug: string;
  validate: (submission: Record<string, unknown>) => LabValidationResult | Promise<LabValidationResult>;
}

// Future labs register isolated validators here. Input remains data and is never evaluated as code,
// SQL, a shell command, or JavaScript by the platform.
const placeholderDefinition: LabDefinition = {
  slug: '*',
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

const definitions = new Map<string, LabDefinition>();

export function registerLabDefinition(definition: LabDefinition) {
  definitions.set(definition.slug, definition);
}

export function getLabDefinition(slug: string) {
  return definitions.get(slug) ?? placeholderDefinition;
}
