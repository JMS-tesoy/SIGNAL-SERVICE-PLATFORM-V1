import { Request } from "express";
import { Options } from "express-rate-limit";
import { env } from "./env.js";

type RateLimitConfig = Partial<Options>;

const generalMaxRequests =
  env.NODE_ENV === "development"
    ? Math.max(env.RATE_LIMIT_MAX_REQUESTS, 1000)
    : env.RATE_LIMIT_MAX_REQUESTS;

export const generalRateLimitConfig: RateLimitConfig = {
  windowMs: env.RATE_LIMIT_WINDOW_MS,
  max: generalMaxRequests,
  message: { error: "Too many requests, please try again later." },
  standardHeaders: true,
  legacyHeaders: false,
};

export const authRateLimitConfig: RateLimitConfig = {
  windowMs: env.AUTH_RATE_LIMIT_WINDOW_MS,
  max: env.AUTH_RATE_LIMIT_MAX_REQUESTS,
  message: { error: "LOGIN LIMIT REACHED: Please wait." },
  standardHeaders: true,
  legacyHeaders: false,
};

export const signalRateLimitConfig: RateLimitConfig = {
  windowMs: env.SIGNAL_RATE_LIMIT_WINDOW_MS,
  max: env.SIGNAL_RATE_LIMIT_MAX_REQUESTS,
  message: { error: "Too many signal requests. Limit is 60/min." },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req: Request) => {
    const accountId =
      (req.headers["x-account-id"] as string) || req.body?.account_id;
    return accountId || req.ip || "unknown";
  },
};

export const generalRateLimitedRoutes = [
  "/api/users",
  "/api/user",
  "/api/security",
  "/api/otp",
  "/api/subscriptions",
  "/api/webhooks",
  "/api/admin",
  "/api/downloads",
];
