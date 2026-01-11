import { Response, NextFunction } from "express";
import { AuthRequest } from "./auth";

type Plan = "free" | "premium" | "creator";

function normalizePlan(p: any): Plan {
  const x = String(p || "").toLowerCase();
  if (x === "creator" || x === "premium" || x === "free") return x as Plan;
  return "free";
}

export function requireEmailVerified(req: AuthRequest, res: Response, next: NextFunction) {
  if (!req.user) return res.status(401).json({ error: "Unauthorized" });

  if (!req.user.is_email_verified) {
    return res.status(403).json({
      error: "EMAIL_NOT_VERIFIED",
      message: "Please verify your email to continue.",
    });
  }

  return next();
}

export function requireCreator(req: AuthRequest, res: Response, next: NextFunction) {
  if (!req.user) return res.status(401).json({ error: "Unauthorized" });

  const plan = normalizePlan(req.user.plan);

  if (plan !== "creator") {
    return res.status(403).json({
      error: "CREATOR_REQUIRED",
      message: "Creator plan required.",
    });
  }

  return next();
}

export function requirePremiumOrCreator(req: AuthRequest, res: Response, next: NextFunction) {
  if (!req.user) return res.status(401).json({ error: "Unauthorized" });

  const plan = normalizePlan(req.user.plan);

  if (plan !== "premium" && plan !== "creator") {
    return res.status(403).json({
      error: "PREMIUM_REQUIRED",
      message: "Premium plan required.",
    });
  }

  return next();
}
