"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.requireAdmin = requireAdmin;
/**
 * Middleware ensuring the authenticated user is an admin.  Requires
 * requireAuth to have already run.
 */
function requireAdmin(req, res, next) {
    if (!req.user?.is_admin) {
        return res.status(403).json({ error: 'Forbidden' });
    }
    return next();
}
