"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.requireAdmin = requireAdmin;
exports.requirePremium = requirePremium;
exports.requireAdminOrPremium = requireAdminOrPremium;
exports.logAuthInfo = logAuthInfo;
/**
 * Middleware: Require admin privileges
 *
 * Must be used AFTER requireAuth middleware.
 * Checks if authenticated user has is_admin flag set to true.
 * If user is not admin, returns 403 Forbidden.
 *
 * Usage: router.use(requireAuth, requireAdmin)
 *        router.get("/admin/stats", requireAuth, requireAdmin, handler)
 */
function requireAdmin(req, res, next) {
    try {
        // Verify user is authenticated
        if (!req.user) {
            return res.status(401).json({ error: "Unauthorized. Please log in." });
        }
        // Check admin privileges
        if (!req.user.is_admin) {
            return res.status(403).json({ error: "Forbidden. Admin access required." });
        }
        // User is authenticated and is admin, proceed
        return next();
    }
    catch (err) {
        console.error("Admin check middleware error:", err);
        return res.status(500).json({ error: "Authorization error" });
    }
}
/**
 * Middleware: Require premium plan
 *
 * Must be used AFTER requireAuth middleware.
 * Checks if authenticated user has is_premium flag set to true.
 * If user is not premium, returns 403 Forbidden.
 *
 * Usage: router.use(requireAuth, requirePremium)
 *        router.get("/premium-feature", requireAuth, requirePremium, handler)
 */
function requirePremium(req, res, next) {
    try {
        // Verify user is authenticated
        if (!req.user) {
            return res.status(401).json({ error: "Unauthorized. Please log in." });
        }
        // Check premium status
        if (!req.user.is_premium) {
            return res.status(403).json({ error: "Forbidden. Premium access required." });
        }
        // User is authenticated and premium, proceed
        return next();
    }
    catch (err) {
        console.error("Premium check middleware error:", err);
        return res.status(500).json({ error: "Authorization error" });
    }
}
/**
 * Middleware: Require either admin or premium plan
 *
 * Must be used AFTER requireAuth middleware.
 * Allows access if user has either admin privileges or premium status.
 *
 * Usage: router.use(requireAuth, requireAdminOrPremium)
 */
function requireAdminOrPremium(req, res, next) {
    try {
        // Verify user is authenticated
        if (!req.user) {
            return res.status(401).json({ error: "Unauthorized. Please log in." });
        }
        // Check if user is admin OR premium
        if (!req.user.is_admin && !req.user.is_premium) {
            return res.status(403).json({
                error: "Forbidden. Admin or Premium access required."
            });
        }
        // User has required privileges, proceed
        return next();
    }
    catch (err) {
        console.error("Authorization middleware error:", err);
        return res.status(500).json({ error: "Authorization error" });
    }
}
/**
 * Middleware: Log authentication info (debugging/monitoring)
 *
 * Logs details about authenticated requests including user ID, role, and plan.
 * Useful for monitoring and debugging admin/premium features.
 *
 * Usage: router.use(requireAuth, logAuthInfo)
 */
function logAuthInfo(req, res, next) {
    try {
        if (req.user) {
            const authInfo = {
                userId: req.user.id,
                email: req.user.email,
                isAdmin: req.user.is_admin,
                isPremium: req.user.is_premium,
                method: req.method,
                path: req.path,
                timestamp: new Date().toISOString(),
            };
            console.log("[AUTH]", JSON.stringify(authInfo));
        }
        return next();
    }
    catch (err) {
        console.error("Auth logging error:", err);
        return next(); // Don't block request on logging error
    }
}
