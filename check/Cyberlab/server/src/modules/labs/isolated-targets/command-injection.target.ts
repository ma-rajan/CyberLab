export type CommandSimulationMode = 'vulnerable' | 'secure';

export interface CommandSimulationResult {
  mode: CommandSimulationMode;
  filterApplied: boolean;
  operations: Array<{ operation: 'status' | 'audit'; output: string }>;
  inputTreatment: string;
  exerciseReady: boolean;
}

interface LearnerProgress {
  observedInjectedAudit: boolean;
  comparedSecureHandling: boolean;
}

const progressBySession = new Map<string, LearnerProgress>();
const statusOutput = 'Synthetic diagnostics status: all training services are online.';
const auditOutput = 'Synthetic audit record: training environment is in maintenance mode.';

/**
 * A deliberately tiny in-memory grammar for the training target.
 * It recognizes only a fixed status command followed by the synthetic `&& audit`
 * operation. It never evaluates shell syntax or invokes an operating-system program.
 */
function interpretTrainingCommand(input: string) {
  const normalized = input.replaceAll(';', '');
  const tokens = normalized.trim() ? normalized.trim().split(/\s+/) : [];
  const operations: CommandSimulationResult['operations'] = [
    { operation: 'status', output: statusOutput },
  ];

  if (tokens.length === 0) return { operations, injectedAudit: false };
  if (tokens.length === 2 && tokens[0] === '&&' && tokens[1] === 'audit') {
    operations.push({ operation: 'audit', output: auditOutput });
    return { operations, injectedAudit: true };
  }
  return null;
}

export function simulateCommandInjection(
  sessionId: string,
  mode: CommandSimulationMode,
  input: string,
): CommandSimulationResult | null {
  let progress = progressBySession.get(sessionId);
  if (!progress) {
    progress = { observedInjectedAudit: false, comparedSecureHandling: false };
    progressBySession.set(sessionId, progress);
  }

  if (mode === 'vulnerable') {
    const interpreted = interpretTrainingCommand(input);
    if (!interpreted) return null;
    progress.observedInjectedAudit ||= interpreted.injectedAudit;
    return {
      mode,
      filterApplied: true,
      operations: interpreted.operations,
      inputTreatment: 'The semicolon filter is active, but the simulator still interpreted the supported && audit token.',
      exerciseReady: progress.observedInjectedAudit && progress.comparedSecureHandling,
    };
  }

  const comparedSecureHandling = input === '&& audit';
  progress.comparedSecureHandling ||= comparedSecureHandling;
  return {
    mode,
    filterApplied: false,
    operations: [{ operation: 'status', output: statusOutput }],
    inputTreatment: `The fixed status operation ran. User input was treated as data: ${input}`,
    exerciseReady: progress.observedInjectedAudit && progress.comparedSecureHandling,
  };
}

export function hasCompletedCommandInjectionExercise(sessionId: string) {
  const progress = progressBySession.get(sessionId);
  return Boolean(progress?.observedInjectedAudit && progress.comparedSecureHandling);
}

export function resetCommandInjectionExerciseState() {
  progressBySession.clear();
}
