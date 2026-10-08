import type { LabCategory, LabDifficulty, LabProgressStatus } from '../../lib/api';

const interactiveChallengeTypes = new Set([
  'SQL_INJECTION_PRODUCT_SEARCH',
  'XSS_FEEDBACK_SEARCH',
  'IDOR_PROFILE_ACCESS',
  'AUTHENTICATION_BYPASS',
  'BROKEN_FUNCTION_ACCESS',
  'SSRF_MOCK_FETCH',
  'SQLI_USER_DIRECTORY',
  'FILE_UPLOAD_VALIDATION',
  'CSRF',
]);

function words(value: string) {
  return value
    .toLowerCase()
    .split('_')
    .map((word) => `${word[0]?.toUpperCase()}${word.slice(1)}`)
    .join(' ');
}

export function categoryLabel(category: LabCategory) {
  return words(category);
}

export function difficultyLabel(difficulty: LabDifficulty) {
  return words(difficulty);
}

export function progressLabel(status: LabProgressStatus | undefined) {
  return status ? words(status) : 'Not Started';
}

export function hasInteractiveTarget(challengeType: string) {
  return interactiveChallengeTypes.has(challengeType);
}
