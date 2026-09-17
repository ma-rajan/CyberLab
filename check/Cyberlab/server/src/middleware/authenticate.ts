import type { RequestHandler } from 'express';
import { authService } from '../modules/auth/auth.service.js';
import { SESSION_COOKIE_NAME } from '../utils/session-cookie.js';

export const attachAuthenticatedUser: RequestHandler = async (request, _response, next) => {
  try {
    const sessionId = request.cookies?.[SESSION_COOKIE_NAME];
    if (typeof sessionId === 'string') {
      const user = await authService.getAuthenticatedUser(sessionId);
      if (user) request.auth = user;
    }
    next();
  } catch (error) {
    next(error);
  }
};

export const requireAuthentication: RequestHandler = (request, response, next) => {
  if (!request.auth) {
    response
      .status(401)
      .json({ error: { code: 'UNAUTHENTICATED', message: 'Authentication is required.' } });
    return;
  }
  next();
};
