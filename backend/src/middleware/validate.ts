import type { Request, Response, NextFunction } from 'express';
import { type AnyZodObject, ZodError } from 'zod';
import { ValidationError } from '../utils/errors.js';

export function validate(schema: {
  body?: AnyZodObject;
  query?: AnyZodObject;
  params?: AnyZodObject;
}) {
  return async (req: Request, _res: Response, next: NextFunction) => {
    try {
      if (schema.params) {
        req.params = await schema.params.parseAsync(req.params);
      }
      if (schema.query) {
        req.query = await schema.query.parseAsync(req.query);
      }
      if (schema.body) {
        req.body = await schema.body.parseAsync(req.body);
      }
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        const issues = error.issues.map(issue => ({
          path: issue.path.join('.'),
          message: issue.message,
        }));
        next(new ValidationError('Invalid request data', issues));
      } else {
        next(error);
      }
    }
  };
}
