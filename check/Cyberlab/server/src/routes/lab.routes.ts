import { Router } from 'express';
import { attachAuthenticatedUser, requireAuthentication } from '../middleware/authenticate.js';
import { requireCsrfToken } from '../middleware/csrf.js';
import { completeLab, getLab, getProgress, listLabs, startLab } from '../modules/labs/lab.controller.js';

export const labRouter = Router();

labRouter.get('/', listLabs);
labRouter.use(attachAuthenticatedUser);
labRouter.get('/progress', requireAuthentication, getProgress);
labRouter.post('/:slug/start', requireAuthentication, requireCsrfToken, startLab);
labRouter.post('/:slug/complete', requireAuthentication, requireCsrfToken, completeLab);
labRouter.get('/:slug', getLab);
