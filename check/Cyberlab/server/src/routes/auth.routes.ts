import { Router } from 'express';
import { attachAuthenticatedUser, requireAuthentication } from '../middleware/authenticate.js';
import { authRateLimit } from '../middleware/auth-rate-limit.js';
import { issueCsrfToken, requireCsrfToken } from '../middleware/csrf.js';
import { login, logout, me, protectedTest, register } from '../modules/auth/auth.controller.js';

export const authRouter = Router();

authRouter.get('/csrf', issueCsrfToken);
authRouter.post('/register', authRateLimit, requireCsrfToken, register);
authRouter.post('/login', authRateLimit, requireCsrfToken, login);
authRouter.use(attachAuthenticatedUser);
authRouter.post('/logout', requireCsrfToken, logout);
authRouter.get('/me', requireAuthentication, me);
authRouter.get('/protected-test', requireAuthentication, protectedTest);
