export type MockTargetPath = '/public/status' | '/internal/admin-config';

const allowedPaths = new Set<MockTargetPath>(['/public/status', '/internal/admin-config']);

const publicStatus = {
  path: '/public/status',
  status: 'ok',
  message: 'Synthetic public service status: operational.',
  completionToken: null,
} as const;

const internalAdminConfig = {
  path: '/internal/admin-config',
  status: 'ok',
  message: 'Synthetic internal configuration loaded by the training fetch service.',
  completionToken: 'SSRF_INTERNAL_CONFIG_CONFIRMED',
} as const;

/**
 * This is an in-memory dispatcher, not an HTTP client. The allowlist is the
 * complete mock network: only these exact paths can be resolved.
 */
export function parseMockTargetPath(value: string): MockTargetPath | null {
  if (!value.startsWith('/')) return null;
  if (value.startsWith('//') || value.includes('://')) return null;
  return allowedPaths.has(value as MockTargetPath) ? (value as MockTargetPath) : null;
}

/**
 * Deliberately lets the training fetch service resolve the fixed internal
 * resource without an authorization check. It never makes a network request,
 * reads files or environment values, or accesses platform data.
 */
export function fetchMockResource(path: MockTargetPath) {
  return path === '/internal/admin-config' ? internalAdminConfig : publicStatus;
}
