import bcrypt from 'bcryptjs';

const PASSWORD_COST = 12;
// A fixed bcrypt hash keeps unknown-user verification on the same expensive code path.
const DUMMY_PASSWORD_HASH = '$2a$12$7xZqp0qTsqzCy6bGBANUQet0VHTSzl06FxCAZfwQSPo1FItdjszbK';

export function hashPassword(password: string) {
  return bcrypt.hash(password, PASSWORD_COST);
}

export function verifyPassword(password: string, passwordHash: string) {
  return bcrypt.compare(password, passwordHash);
}

export function verifyUnknownUserPassword(password: string) {
  return bcrypt.compare(password, DUMMY_PASSWORD_HASH);
}
