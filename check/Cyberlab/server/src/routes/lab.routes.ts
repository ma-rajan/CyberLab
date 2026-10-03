import express, { Router } from 'express';
import { attachAuthenticatedUser, requireAuthentication } from '../middleware/authenticate.js';
import { requireCsrfToken } from '../middleware/csrf.js';
import { completeLab, fetchMockTarget, getLab, getLabProgress, getProfileTarget, getProfileUploadTarget, getProgress, getSession, getTrainingReportTarget, listLabs, loginTrainingTarget, searchDirectoryTarget, searchFeedbackTarget, searchProductTarget, startLab, submitLab, uploadProfileImageTarget } from '../modules/labs/lab.controller.js';

export const labRouter = Router();

labRouter.get('/', listLabs);
labRouter.use(attachAuthenticatedUser);
labRouter.get('/progress', requireAuthentication, getProgress);
labRouter.post('/:slug/start', requireAuthentication, requireCsrfToken, startLab);
labRouter.get('/:slug/target/products', requireAuthentication, searchProductTarget);
labRouter.get('/:slug/target/feedback', requireAuthentication, searchFeedbackTarget);
labRouter.get('/:slug/target/profile', requireAuthentication, getProfileTarget);
labRouter.post('/:slug/target/login', requireAuthentication, requireCsrfToken, loginTrainingTarget);
labRouter.get('/:slug/target/report', requireAuthentication, getTrainingReportTarget);
labRouter.get('/:slug/fetch', requireAuthentication, fetchMockTarget);
labRouter.get('/:slug/search', requireAuthentication, searchDirectoryTarget);
labRouter.post('/:slug/target/upload', requireAuthentication, requireCsrfToken, express.raw({ type: 'application/octet-stream', limit: '32kb' }), uploadProfileImageTarget);
labRouter.get('/:slug/target/files/:filename', requireAuthentication, getProfileUploadTarget);
labRouter.get('/:slug/session', requireAuthentication, getSession);
labRouter.get('/:slug/progress', requireAuthentication, getLabProgress);
labRouter.post('/:slug/submit', requireAuthentication, requireCsrfToken, submitLab);
labRouter.post('/:slug/complete', requireAuthentication, requireCsrfToken, completeLab);
labRouter.get('/:slug', getLab);
