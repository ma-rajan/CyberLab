import { randomBytes, timingSafeEqual } from 'node:crypto';
import type { RequestHandler } from 'express';
import { env } from '../config/env.js';

export const CSRF_COOKIE_NAME = 'cyberlab_csrf';
const csrfCookieOptions = {
  httpOnly: false,
  sameSite: 'lax' as const,
  secure: env.NODE_ENV === 'production',
  path: '/',
};

function tokensMatch(cookieToken: string, headerToken: string) {
  const left = Buffer.from(cookieToken);
  const right = Buffer.from(headerToken);
  return left.length === right.length && timingSafeEqual(left, right);
}

export const issueCsrfToken: RequestHandler = (request, response) => {
  const token =
    typeof request.cookies?.[CSRF_COOKIE_NAME] === 'string'
      ? request.cookies[CSRF_COOKIE_NAME]
      : randomBytes(32).toString('base64url');
  response.cookie(CSRF_COOKIE_NAME, token, csrfCookieOptions);
  response.status(200).json({ data: { csrfToken: token } });
};

export const requireCsrfToken: RequestHandler = (request, response, next) => {
  const cookieToken = request.cookies?.[CSRF_COOKIE_NAME];
  const headerToken = request.get('x-csrf-token');
  if (typeof cookieToken !== 'string' || !headerToken || !tokensMatch(cookieToken, headerToken)) {
    response.status(403).json({ error: { code: 'CSRF_INVALID', message: 'Invalid CSRF token.' } });
    return;
  }
  next();
};
