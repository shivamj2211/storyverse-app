import rateLimit from "express-rate-limit";
import type { Request } from "express";

function envInt(name: string, fallback: number) {
  const v = process.env[name];
  const n = v ? parseInt(v, 10) : NaN;
  return Number.isFinite(n) ? n : fallback;
}

function getClientIp(req: Request) {
  // try x-forwarded-for first
  const xff = req.headers["x-forwarded-for"];
  if (typeof xff === "string" && xff.length) return xff.split(",")[0].trim();
  if (Array.isArray(xff) && xff.length) return xff[0].trim();

  // fallback to express ip / socket
  return req.ip || req.socket?.remoteAddress || "unknown";
}

export const writingViewLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: envInt("WRITING_VIEWS_PER_MIN", 30),
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => getClientIp(req),
  message: { error: "Too many view requests. Please slow down." },
});

export const exploreLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: envInt("EXPLORE_REQUESTS_PER_MIN", 60),
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => getClientIp(req),
  message: { error: "Too many requests. Please slow down." },
});

export const writingLikeLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: envInt("WRITING_LIKES_PER_MIN", 20),
  standardHeaders: true,
  legacyHeaders: false,
  // key by user if present, else ip
  keyGenerator: (req: Request) => {
    const uid = (req as any)?.user?.id;
    return uid ? `user:${uid}` : `ip:${getClientIp(req)}`;
  },
  message: { error: "Too many like actions. Please slow down." },
});

export const otpLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: envInt("OTP_REQUEST_LIMIT_PER_HOUR", 5),
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => getClientIp(req),
  message: { error: "Too many OTP requests, please try again later." },
});
