import type { LabCategory, LabDifficulty, LabProgressStatus } from '../../lib/api';

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
