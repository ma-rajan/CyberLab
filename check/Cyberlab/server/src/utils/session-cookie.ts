import type { Response } from 'express';
import { env } from '../config/env.js';

export const SESSION_COOKIE_NAME = 'cyberlab_session';

const cookieOptions = {
  httpOnly: true,
  sameSite: 'lax' as const,
  secure: env.NODE_ENV === 'production',
  path: '/',
};

export function setSessionCookie(response: Response, sessionId: string, expiresAt: Date) {
  response.cookie(SESSION_COOKIE_NAME, sessionId, { ...cookieOptions, expires: expiresAt });
}

export function clearSessionCookie(response: Response) {
  response.clearCookie(SESSION_COOKIE_NAME, cookieOptions);
}
