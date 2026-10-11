const trainingData: Record<string, string> = {
  'learner.name': 'Avery',
  'account.plan': 'Training',
  'training.completion': 'SSTI_PREVIEW_CONFIRMED',
};

interface LearnerExerciseState {
  evaluatedExpression: boolean;
  arithmeticObserved: boolean;
  completionObserved: boolean;
}

const learnerState = new Map<string, LearnerExerciseState>();

function splitStringTerms(expression: string): string[] | null {
  const terms: string[] = [];
  let start = 0;
  let inString = false;
  let escaped = false;

  for (let index = 0; index < expression.length; index += 1) {
    const character = expression[index];
    if (inString) {
      if (escaped) escaped = false;
      else if (character === '\\') escaped = true;
      else if (character === '"') inString = false;
    } else if (character === '"') {
      inString = true;
    } else if (character === '+') {
      terms.push(expression.slice(start, index).trim());
      start = index + 1;
    }
  }

  if (inString || escaped) return null;
  terms.push(expression.slice(start).trim());
  return terms.every(Boolean) ? terms : null;
}

function evaluateStringExpression(expression: string): string | null {
  const terms = splitStringTerms(expression);
  if (!terms || terms.length < 2) return null;

  const values: string[] = [];
  for (const term of terms) {
    if (term.startsWith('"') && term.endsWith('"')) {
      try {
        const parsed: unknown = JSON.parse(term);
        if (typeof parsed !== 'string') return null;
        values.push(parsed);
      } catch {
        return null;
      }
    } else if (Object.hasOwn(trainingData, term)) {
      const value = trainingData[term];
      if (value === undefined) return null;
      values.push(value);
    } else {
      return null;
    }
  }

  const result = values.join('');
  return result.length <= 256 ? result : null;
}

function evaluateExpression(expression: string): { value: string; arithmetic: boolean } | null {
  const normalized = expression.trim();
  if (!normalized || normalized.length > 100) return null;

  const arithmetic = normalized.match(/^(-?\d{1,6})\s*([+*/-])\s*(-?\d{1,6})$/);
  if (arithmetic) {
    const left = Number(arithmetic[1]);
    const right = Number(arithmetic[3]);
    const operator = arithmetic[2];
    if (operator === undefined) return null;
    let result: number;
    switch (operator) {
      case '+': result = left + right; break;
      case '-': result = left - right; break;
      case '*': result = left * right; break;
      case '/':
        if (right === 0) return null;
        result = left / right;
        break;
      default: return null;
    }
    if (!Number.isFinite(result) || Math.abs(result) > 1_000_000) return null;
    return { value: String(Number(result.toFixed(4))), arithmetic: true };
  }

  if (Object.hasOwn(trainingData, normalized)) {
    const value = trainingData[normalized];
    return value === undefined ? null : { value, arithmetic: false };
  }

  const stringValue = evaluateStringExpression(normalized);
  return stringValue === null ? null : { value: stringValue, arithmetic: false };
}

function renderAllowlistedTemplate(input: string) {
  let arithmeticObserved = false;
  let evaluatedExpression = false;
  let valid = true;
  const rendered = input.replace(/\{\{([^{}]*)\}\}/g, (_match, expression: string) => {
    const result = evaluateExpression(expression);
    if (!result) {
      valid = false;
      return '';
    }
    evaluatedExpression = true;
    arithmeticObserved ||= result.arithmetic;
    return result.value;
  });

  if (!valid || rendered.includes('{{') || rendered.includes('}}')) return null;
  return { rendered, evaluatedExpression, arithmeticObserved };
}

export interface SstiPreviewResult {
  vulnerableOutput: string;
  secureOutput: string;
  completionToken: string | null;
}

/**
 * Models a vulnerable template preview with a small, explicit expression grammar.
 * The secure comparison concatenates the input as ordinary data. This module has
 * no filesystem, network, process, or general-purpose code-evaluation access.
 */
export function renderSstiPreview(userId: string, input: string): SstiPreviewResult | null {
  const vulnerable = renderAllowlistedTemplate(input);
  if (!vulnerable) return null;

  const state = learnerState.get(userId) ?? {
    evaluatedExpression: false,
    arithmeticObserved: false,
    completionObserved: false,
  };
  state.evaluatedExpression ||= vulnerable.evaluatedExpression;
  state.arithmeticObserved ||= vulnerable.arithmeticObserved;
  const completionObserved = input.includes('{{training.completion}}');
  state.completionObserved ||= completionObserved;
  learnerState.set(userId, state);

  return {
    vulnerableOutput: `Preview: ${vulnerable.rendered}`,
    secureOutput: `Preview: ${input}`,
    completionToken: completionObserved ? trainingData['training.completion'] ?? null : null,
  };
}

export function hasCompletedSstiExercise(userId: string) {
  const state = learnerState.get(userId);
  return Boolean(state?.evaluatedExpression && state.arithmeticObserved && state.completionObserved);
}

export function resetSstiExerciseState() {
  learnerState.clear();
}
