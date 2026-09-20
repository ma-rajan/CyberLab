import type { RequestHandler } from 'express';
import { AppError } from '../auth/auth.errors.js';
import { labService } from './lab.service.js';
import { emptyBodySchema, slugSchema, submissionSchema } from './lab.validators.js';

function parseSlug(value: unknown) { const result = slugSchema.safeParse(value); if (!result.success) throw new AppError(400, 'VALIDATION_ERROR', 'Invalid lab slug.'); return result.data; }
function parseEmptyBody(value: unknown) { if (!emptyBodySchema.safeParse(value).success) throw new AppError(400, 'VALIDATION_ERROR', 'This request does not accept body fields.'); }
function parseSubmission(value: unknown) { const result = submissionSchema.safeParse(value); if (!result.success) throw new AppError(400, 'VALIDATION_ERROR', 'A submission object is required.'); return result.data.submission; }

export const listLabs: RequestHandler = async (_request, response, next) => { try { response.status(200).json({ data: { labs: await labService.listPublishedLabs() } }); } catch (error) { next(error); } };
export const getLab: RequestHandler = async (request, response, next) => { try { response.status(200).json({ data: { lab: await labService.getPublishedLab(parseSlug(request.params.slug)) } }); } catch (error) { next(error); } };
export const getProgress: RequestHandler = async (request, response, next) => { try { response.status(200).json({ data: { progress: await labService.getProgressForUser(request.auth!.id) } }); } catch (error) { next(error); } };
export const getLabProgress: RequestHandler = async (request, response, next) => { try { response.status(200).json({ data: { progress: await labService.getProgressForLab(request.auth!.id, parseSlug(request.params.slug)) } }); } catch (error) { next(error); } };
export const startLab: RequestHandler = async (request, response, next) => { try { parseEmptyBody(request.body); response.status(200).json({ data: await labService.startLab(request.auth!.id, parseSlug(request.params.slug)) }); } catch (error) { next(error); } };
export const getSession: RequestHandler = async (request, response, next) => { try { response.status(200).json({ data: { session: await labService.getSession(request.auth!.id, parseSlug(request.params.slug)) } }); } catch (error) { next(error); } };
export const submitLab: RequestHandler = async (request, response, next) => { try { response.status(200).json({ data: await labService.submit(request.auth!.id, parseSlug(request.params.slug), parseSubmission(request.body)) }); } catch (error) { next(error); } };
export const completeLab: RequestHandler = async (request, response, next) => { try { parseEmptyBody(request.body); response.status(200).json({ data: { progress: await labService.completeLab(request.auth!.id, parseSlug(request.params.slug)) } }); } catch (error) { next(error); } };
