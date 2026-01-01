import { Response, NextFunction } from 'express';
import { AuthRequest } from './auth';

/**
 * Middleware ensuring the authenticated user is an admin.  Requires
 * requireAuth to have already run.
 */
export function requireAdmin(req: AuthRequest, res: Response, next: NextFunction) {
  if (!req.user?.is_admin) {
    return res.status(403).json({ error: 'Forbidden' });
  }
  return next();
}