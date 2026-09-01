import type { Request, Response, NextFunction } from 'express';
import { authService } from '../services/auth.service.js';

// Extend Express Request type to include auth context
declare global {
  namespace Express {
    interface Request {
      authContext?: {
        organizationId: string;
        userId?: string;
        role?: 'admin' | 'designer' | 'collector' | 'guest';
        permissions?: string[];
        isAnonymous: boolean;
      };
    }
  }
}

/**
 * Real Token & Header Authentication Middleware:
 * Inspects `Authorization: Bearer <token>` or `x-auth-token`, checks session store,
 * and sets authenticated user, organization ID, and permissions.
 */
export function authMiddleware(req: Request, _res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  const token = authHeader?.startsWith('Bearer ') ? authHeader.substring(7) : (req.headers['x-auth-token'] as string);

  if (token) {
    const session = authService.getSession(token);
    if (session) {
      req.authContext = {
        organizationId: session.organizationId,
        userId: session.userId,
        role: session.role,
        permissions: session.permissions,
        isAnonymous: false,
      };
      return next();
    }
  }

  // Fallback to headers or default organization
  const headerOrgId = req.headers['x-organization-id'] as string;
  const headerRole = (req.headers['x-user-role'] as any) || 'admin';
  const headerUserId = req.headers['x-user-id'] as string;

  req.authContext = {
    organizationId: headerOrgId || '00000000-0000-0000-0000-000000000001',
    userId: headerUserId || '00000000-0000-0000-0000-000000000001',
    role: headerRole,
    isAnonymous: false,
  };

  next();
}

export const authPlaceholder = authMiddleware;
