// =============================================================================
// SIGNAL SERVICE BACKEND - Main Application Entry Point
// =============================================================================

import mt5Routes from "./routes/mt5.routes.js";
import "dotenv/config";
import { createServer } from "node:http";
import express, { Request, Response } from "express";
import path from "node:path";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import { corsConfig } from "./config/cors.config.js";
import { env } from "./config/env.js";
import {
  authRateLimitConfig,
  generalRateLimitConfig,
  generalRateLimitedRoutes,
  signalRateLimitConfig,
} from "./config/rate-limit.config.js";
import { securityConfig, trustProxy } from "./config/security.config.js";

// Routes
import authRoutes from "./modules/auth/index.js";
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
import { requestId } from "./core/middleware/index.js";

// Cron Jobs
import { startCronJobs } from "./jobs/scheduler.js";
import { initializeRealtime } from "./services/realtime.service.js";

const app = express();
const server = createServer(app);
const PORT = env.PORT;

// =============================================================================
// GLOBAL MIDDLEWARE
// =============================================================================

// [FIX 1] Unconditional Trust Proxy
// Required for Railway/Heroku to pass the real IP address correctly.
// Without this, everyone looks like they have the same IP (the load balancer).
app.set("trust proxy", trustProxy);

// Request ID
app.use(requestId);

// Security headers
app.use(helmet(securityConfig));

app.use(cors(corsConfig));

// =============================================================================
// RATE LIMITING (THE STRONG FIX)
// =============================================================================

// 1. General Limiter (For Admin, Users, Subscriptions)
// Keeps general traffic safe from spam.
const limiter = rateLimit(generalRateLimitConfig);

// 2. Auth Limiter (LOOSE - For Humans)
// Allows 100 login attempts per 15 mins. Based on IP.
// This ensures you (the human) can always log in.
const authLimiter = rateLimit(authRateLimitConfig);

// 3. Signal Limiter (STRICT + ID BASED - For Bots)
// [STRONG FIX] This uses the 'Account ID' to track the quota.
// If the bot spams, it blocks 'MASTER_001', NOT your IP address.
const signalLimiter = rateLimit(signalRateLimitConfig);

// --- APPLY LIMITERS TO SPECIFIC ROUTES ---

// Apply the Strict Bot Limiter
app.use("/api/signals", signalLimiter);

// Apply the Loose Human Limiter
app.use("/api/auth", authLimiter);

// Apply the General Limiter to everything else
// We list these explicitly so they don't overlap with Signals or Auth
app.use(generalRateLimitedRoutes, limiter);

// Stripe webhooks need raw body
app.use("/api/webhooks/stripe", express.raw({ type: "application/json" }));

// JSON body parser
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));
app.use(
  "/uploads",
  express.static(path.resolve(process.cwd(), "uploads"), {
    immutable: true,
    maxAge: "30d",
  })
);

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

// MT5 Cloud Protect routes must be mounted after express.json().
app.use("/api/mt5", mt5Routes);

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

await initializeRealtime(server);

server.listen(PORT, () => {
  console.log(`🚀 Signal Service Backend running on http://localhost:${PORT}`);

  if (env.NODE_ENV !== "test") {
    startCronJobs();
  }
});

export default app;
