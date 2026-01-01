"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.otpLimiter = void 0;
const express_rate_limit_1 = __importDefault(require("express-rate-limit"));
/**
 * Rate limiter for OTP requests.  Configurable via env OTP_REQUEST_LIMIT_PER_HOUR.
 */
exports.otpLimiter = (0, express_rate_limit_1.default)({
    windowMs: 60 * 60 * 1000,
    max: process.env.OTP_REQUEST_LIMIT_PER_HOUR
        ? parseInt(process.env.OTP_REQUEST_LIMIT_PER_HOUR)
        : 5,
    message: 'Too many OTP requests, please try again later.'
});
