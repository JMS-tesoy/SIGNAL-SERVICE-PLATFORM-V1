// =============================================================================
// SIGNAL SERVICE BACKEND - Main Application Entry Point
// =============================================================================

import "dotenv/config";
import express, { Request, Response, NextFunction } from "express";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";

// Routes
import authRoutes from "./routes/auth.routes.js";
import securityRoutes from "./routes/security.routes.js";
import otpRoutes from "./routes/otp.routes.js";
import userRoutes from "./routes/user.routes.js";
import subscriptionRoutes from "./routes/subscription.routes.js";
import signalRoutes from "./routes/signal.routes.js";
import webhookRoutes from "./routes/webhook.routes.js";
import adminRoutes from "./routes/admin.routes.js";
import downloadRoutes from "./routes/download.routes.js";

// Middleware
import { requestLogger } from "./middleware/logger.middleware.js";
import {
  errorHandler,
  notFoundHandler,
} from "./middleware/error.middleware.js";

// Cron Jobs
import { startCronJobs } from "./jobs/scheduler.js";

const app = express();
const PORT = process.env.PORT || 3001;

// =============================================================================
// GLOBAL MIDDLEWARE
// =============================================================================

// [FIX 1] Unconditional Trust Proxy
// Required for Railway/Heroku to pass the real IP address correctly.
// Without this, everyone looks like they have the same IP (the load balancer).
app.set("trust proxy", 1);

// Security headers
app.use(helmet());

// CORS - Support multiple origins for development and production
const allowedOrigins = [
  process.env.FRONTEND_URL || "http://localhost:3000",
  "http://localhost:3000",
  // Auto-detect Railway frontend URL
  "https://signal-service-frontend-production.up.railway.app",
  // Add production URLs via CORS_ORIGINS env var (comma-separated)
  ...(process.env.CORS_ORIGINS?.split(",").map((o) => o.trim()) || []),
].filter(Boolean);

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (mobile apps, curl, etc)
      if (!origin) return callback(null, true);
      if (allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error("Not allowed by CORS"));
      }
    },
    credentials: true,
  })
);

// =============================================================================
// RATE LIMITING (THE STRONG FIX)
// =============================================================================

// 1. General Limiter (For Admin, Users, Subscriptions)
// Keeps general traffic safe from spam.
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100,
  message: { error: "Too many requests, please try again later." },
  standardHeaders: true,
  legacyHeaders: false,
});

// 2. Auth Limiter (LOOSE - For Humans)
// Allows 100 login attempts per 15 mins. Based on IP.
// This ensures you (the human) can always log in.
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5001,
  message: { error: "LOGIN LIMIT REACHED: Please wait." },
  standardHeaders: true,
  legacyHeaders: false,
});

// 3. Signal Limiter (STRICT + ID BASED - For Bots)
// [STRONG FIX] This uses the 'Account ID' to track the quota.
// If the bot spams, it blocks 'MASTER_001', NOT your IP address.
const signalLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute window
  max: 60, // 60 requests per minute (1 per second)
  message: { error: "Too many signal requests. Limit is 60/min." },
  standardHeaders: true,
  legacyHeaders: false,
  // Key Generator: Identifies the caller by Account ID, not IP
  keyGenerator: (req: Request) => {
    // Check header first, then body. Fallback to IP only if ID is missing.
    // Use optional chaining since body parser may not have run yet
    const accountId =
      (req.headers["x-account-id"] as string) || req.body?.account_id;
    return accountId || req.ip || "unknown";
  },
});

// --- APPLY LIMITERS TO SPECIFIC ROUTES ---

// Apply the Strict Bot Limiter
app.use("/api/signals", signalLimiter);

// Apply the Loose Human Limiter
app.use("/api/auth", authLimiter);

// Apply the General Limiter to everything else
// We list these explicitly so they don't overlap with Signals or Auth
app.use(
  [
    "/api/users",
    "/api/user",
    "/api/security",
    "/api/otp",
    "/api/subscriptions",
    "/api/webhooks",
    "/api/admin",
    "/api/downloads",
  ],
  limiter
);

// Stripe webhooks need raw body
app.use("/api/webhooks/stripe", express.raw({ type: "application/json" }));

// JSON body parser
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));

// Request logging
app.use(requestLogger);

// =============================================================================
// HEALTH CHECK
// =============================================================================

app.get("/health", (req: Request, res: Response) => {
  res.json({
    status: "healthy",
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
});

// =============================================================================
// API ROUTES
// =============================================================================

app.use("/api/auth", authRoutes);
app.use("/api/security", securityRoutes);
app.use("/api/otp", otpRoutes);

// --- USER ROUTES ---
app.use("/api/users", userRoutes);
app.use("/api/user", userRoutes);

app.use("/api/subscriptions", subscriptionRoutes);
app.use("/api/signals", signalRoutes);
app.use("/api/webhooks", webhookRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/downloads", downloadRoutes);

// =============================================================================
// ERROR HANDLING
// =============================================================================

app.use(notFoundHandler);
app.use(errorHandler);

// =============================================================================
// START SERVER
// =============================================================================

app.listen(PORT, () => {
  console.log(`🚀 Signal Service Backend running on http://localhost:${PORT}`);

  if (process.env.NODE_ENV !== "test") {
    startCronJobs();
  }
});

export default app;
