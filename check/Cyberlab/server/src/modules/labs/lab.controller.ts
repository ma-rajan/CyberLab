import type { RequestHandler } from 'express';
import { AppError } from '../auth/auth.errors.js';
import { labService } from './lab.service.js';
import { emptyBodySchema, slugSchema } from './lab.validators.js';

function parseSlug(value: unknown) {
  const result = slugSchema.safeParse(value);
  if (!result.success) throw new AppError(400, 'VALIDATION_ERROR', 'Invalid lab slug.');
  return result.data;
}

function parseEmptyBody(value: unknown) {
  if (!emptyBodySchema.safeParse(value).success) {
    throw new AppError(400, 'VALIDATION_ERROR', 'This request does not accept body fields.');
  }
}

export const listLabs: RequestHandler = async (_request, response, next) => {
  try {
    const labs = await labService.listPublishedLabs();
    response.status(200).json({ data: { labs } });
  } catch (error) {
    next(error);
  }
};

export const getLab: RequestHandler = async (request, response, next) => {
  try {
    const lab = await labService.getPublishedLab(parseSlug(request.params.slug));
    response.status(200).json({ data: { lab } });
  } catch (error) {
    next(error);
  }
};

export const getProgress: RequestHandler = async (request, response, next) => {
  try {
    const progress = await labService.getProgressForUser(request.auth!.id);
    response.status(200).json({ data: { progress } });
  } catch (error) {
    next(error);
  }
};

export const startLab: RequestHandler = async (request, response, next) => {
  try {
    parseEmptyBody(request.body);
    const progress = await labService.startLab(request.auth!.id, parseSlug(request.params.slug));
    response.status(200).json({ data: { progress } });
  } catch (error) {
    next(error);
  }
};

export const completeLab: RequestHandler = async (request, response, next) => {
  try {
    parseEmptyBody(request.body);
    const progress = await labService.completeLab(request.auth!.id, parseSlug(request.params.slug));
    response.status(200).json({ data: { progress } });
  } catch (error) {
    next(error);
  }
};
