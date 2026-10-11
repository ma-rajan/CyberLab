import path from 'node:path';

const trainingFiles: Record<string, { content: string; restricted?: boolean }> = {
  '/public/readme.txt': {
    content: 'Training document: this mock file service serves files from /public.',
  },
  '/private/maintenance.txt': {
    content: 'Synthetic training note. Completion value: PATH_TRAVERSAL_CONFIRMED',
    restricted: true,
  },
};

const restrictedReads = new Set<string>();

export interface TrainingFileResult {
  requestedPath: string;
  resolvedPath: string;
  content: string;
  completionToken: string | null;
}

export function readTrainingFile(userId: string, requestedPath: string): TrainingFileResult | null {
  // The vulnerable join is intentionally confined to a virtual map. No host filesystem API is used.
  const resolvedPath = path.posix.normalize(path.posix.join('/public', requestedPath));
  const file = trainingFiles[resolvedPath];
  if (!file) return null;

  if (file.restricted) restrictedReads.add(userId);
  return {
    requestedPath,
    resolvedPath,
    content: file.content,
    completionToken: file.restricted ? 'PATH_TRAVERSAL_CONFIRMED' : null,
  };
}

export function hasReadRestrictedTrainingFile(userId: string) {
  return restrictedReads.has(userId);
}

export function resetTrainingFileReads() {
  restrictedReads.clear();
}
