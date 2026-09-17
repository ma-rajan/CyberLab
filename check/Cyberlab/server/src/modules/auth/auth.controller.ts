import type { RequestHandler } from 'express';
import { AppError } from './auth.errors.js';
import { authService } from './auth.service.js';
import { loginSchema, registerSchema } from './auth.validators.js';
import { setSessionCookie, clearSessionCookie } from '../../utils/session-cookie.js';
import { SESSION_COOKIE_NAME } from '../../utils/session-cookie.js';

function parseBody<T>(
  schema: { safeParse: (value: unknown) => { success: boolean; data?: T } },
  body: unknown,
): T {
  const result = schema.safeParse(body);
  if (!result.success || !result.data) {
    throw new AppError(400, 'VALIDATION_ERROR', 'Please check the submitted fields.');
  }
  return result.data;
}

function publicUser(user: NonNullable<Express.Request['auth']>) {
  return { id: user.id, username: user.username, email: user.email };
}

export const register: RequestHandler = async (request, response, next) => {
  try {
    const user = await authService.register(parseBody(registerSchema, request.body));
    response.status(201).json({ data: { user } });
  } catch (error) {
    next(error);
  }
};

export const login: RequestHandler = async (request, response, next) => {
  try {
    const previousSessionId = request.cookies?.[SESSION_COOKIE_NAME];
    const result = await authService.login(
      parseBody(loginSchema, request.body),
      typeof previousSessionId === 'string' ? previousSessionId : undefined,
    );
    setSessionCookie(response, result.sessionId, result.expiresAt);
    response.status(200).json({ data: { user: result.user } });
  } catch (error) {
    next(error);
  }
};

export const logout: RequestHandler = async (request, response, next) => {
  try {
    if (request.auth) await authService.logout(request.auth.sessionId, request.auth.id);
    clearSessionCookie(response);
    response.status(204).send();
  } catch (error) {
    next(error);
  }
};

export const me: RequestHandler = (request, response) => {
  response.status(200).json({ data: { user: publicUser(request.auth!) } });
};

export const protectedTest: RequestHandler = (request, response) => {
  response.status(200).json({
    data: { message: 'Authenticated', user: publicUser(request.auth!) },
  });
};
