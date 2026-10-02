const completionToken = 'BROKEN_FUNCTION_ACCESS_CONFIRMED';

const overview = {
  section: 'overview',
  title: 'Learner workspace',
  summary: 'Synthetic learner workspace data for this training target.',
  completionToken: null,
} as const;

const adminAudit = {
  section: 'admin-audit',
  title: 'Administrator audit report',
  summary: 'Synthetic audit data that should require an administrator role.',
  completionToken,
} as const;

/**
 * Deliberately omits a role check for a fixed in-memory training report. It
 * never reads platform roles, users, sessions, or database records and must
 * not be reused for CyberLab authorization.
 */
export function getTrainingReport(section: 'overview' | 'admin-audit') {
  return section === 'admin-audit' ? adminAudit : overview;
}
