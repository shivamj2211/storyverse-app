import rateLimit from 'express-rate-limit';

/**
 * Rate limiter for OTP requests.  Configurable via env OTP_REQUEST_LIMIT_PER_HOUR.
 */
export const otpLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: process.env.OTP_REQUEST_LIMIT_PER_HOUR
    ? parseInt(process.env.OTP_REQUEST_LIMIT_PER_HOUR)
    : 5,
  message: 'Too many OTP requests, please try again later.'
});