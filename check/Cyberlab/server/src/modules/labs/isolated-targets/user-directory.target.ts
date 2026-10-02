export interface MockDirectoryRecord {
  id: number;
  username: string;
  role: string;
  status?: string;
  flag?: string;
}

const publicRecords: MockDirectoryRecord[] = [
  { id: 1, username: 'alice', role: 'student' },
  { id: 2, username: 'bob', role: 'student' },
];

const protectedRecord: MockDirectoryRecord = {
  id: 3,
  username: 'auditor',
  role: 'admin',
  status: 'internal-review',
  flag: 'SQLI_DIRECTORY_ACCESS_CONFIRMED',
};

const unsupportedSql = /;|--|\/\*|\*\/|\b(?:insert|update|delete|drop|alter|attach|pragma|select|union|from|into|values)\b/i;

/**
 * This deliberately tiny evaluator accepts ordinary names and one boolean
 * tautology shape. It is not a SQL parser and never calls SQLite or Prisma.
 */
export function isSupportedDirectoryQuery(query: string) {
  return !unsupportedSql.test(query);
}

function hasControlledTautology(query: string) {
  return /'\s+or\s+'?1'?\s*=\s*'?1'?/i.test(query);
}

export function searchMockDirectory(query: string) {
  const queryPreview = `SELECT id, username, role FROM mock_users WHERE username = '${query}'`;
  if (hasControlledTautology(query)) {
    return { queryPreview, records: [...publicRecords, protectedRecord] };
  }

  const normalized = query.trim().toLowerCase();
  return {
    queryPreview,
    records: publicRecords.filter((record) => record.username === normalized),
  };
}
