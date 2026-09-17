import { MemoryStore, rateLimit } from 'express-rate-limit';

export const authRateLimitStore = new MemoryStore();

export const authRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  store: authRateLimitStore,
  skipSuccessfulRequests: false,
  message: {
    error: {
      code: 'AUTH_RATE_LIMITED',
      message: 'Too many authentication attempts. Please try again later.',
    },
  },
});
