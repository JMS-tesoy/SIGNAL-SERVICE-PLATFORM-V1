# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

MT5 trading signal service platform: MASTER MT5 account sends signals → Backend distributes to SLAVE accounts based on subscription tiers.

**Production URLs:**
- Frontend: https://signal-service-frontend-production.up.railway.app
- Backend API: https://signal-service-api-v2-production.up.railway.app

## Development Commands

```bash
# Backend (from /backend)
pnpm dev                 # Start dev server (tsx watch)
pnpm build               # TypeScript compile
pnpm start               # Run production build
pnpm db:generate         # Generate Prisma client
pnpm db:push             # Push schema to database
pnpm db:migrate          # Run migrations
pnpm db:studio           # Open Prisma Studio GUI
pnpm prisma db seed      # Seed subscription tiers + admin user

# Frontend (from /frontend)
pnpm dev                 # Start Next.js dev server (port 3000)
pnpm build               # Production build
pnpm lint                # ESLint
```

## Tech Stack

**Backend:** Node.js 18+ (ES modules), Express, Prisma + PostgreSQL, JWT auth, Stripe, Resend email, Twilio SMS, node-cron, zod validation

**Frontend:** Next.js 16 + React 18 (requires Node.js 20.9.0+), Zustand state, Tailwind CSS + Radix UI, Recharts, Framer Motion

## Architecture

```
Signal Flow:
1. Sender EA (MASTER) → POST /api/signals → Backend creates Signal
2. Backend → Creates SignalExecution per subscriber (with tier delay offset)
3. Receiver EA (SLAVE) → GET /api/signals/pending → Gets eligible signals
4. Receiver EA → POST /api/signals/ack → Confirms execution
```

**Signal Delay:** Implemented via `signal.createdAt` filter in `getPendingSignals()`; only returns signals where `createdAt <= NOW() - tierDelay`

**MT5 Auth:** EAs authenticate via `X-API-Key` header (API keys stored in MT5Account model, never expire)

**Dual Auth System:**
- Web clients use JWT (Bearer token) with short expiry + refresh tokens
- MT5 EAs use API keys (`X-API-Key` header) - validated against `MT5Account.apiKey`

## Key Files

- `backend/prisma/schema.prisma` - Database models (User, Subscription, Signal, SignalExecution, MT5Account)
- `backend/src/index.ts` - Express app entry, rate limiters, route mounting
- `backend/src/middleware/auth.middleware.ts` - JWT + API key authentication (see `authenticateWithApiKey`)
- `backend/src/services/signal.service.ts` - Signal creation (`receiveSignal`), distribution (`createExecutionsForSubscribers`), polling (`getPendingSignals`), acknowledgment (`acknowledgeExecution`)
- `backend/src/services/subscription.service.ts` - Tier limits, Stripe integration
- `backend/src/jobs/scheduler.ts` - Cron jobs (cleanup, reports, subscription checks)
- `frontend/src/lib/store.ts` - Zustand state (auth tokens, user)
- `frontend/src/lib/api.ts` - API client with auto Bearer token injection

## Signal Processing Details

**Signal Creation (`receiveSignal`):**
- Creates `Signal` record from MASTER EA
- Calls `createExecutionsForSubscribers()` to fan out to all active SLAVE accounts
- Signals expire after 2 minutes (`expiresAt: Date.now() + 120s`)

**Signal Polling (`getPendingSignals`):**
- Called by SLAVE EA repeatedly
- Filters by: user's SLAVE account, tier delay, signal not expired
- Updates SLAVE's `lastHeartbeat` on each poll
- Returns max 10 signals per request

**Acknowledgment (`acknowledgeExecution`):**
- Idempotent: checks if already in terminal state before updating
- Terminal states: EXECUTED, FAILED, EXPIRED, SKIPPED
- Uses `updateMany` with `status: 'PENDING'` condition to prevent races

## Subscription Tiers (seeded)

| Tier | Signals/Day | MT5 Accounts | Delay |
|------|-------------|--------------|-------|
| Free | 5 | 1 | 60s |
| Basic | 50 | 2 | 30s |
| Pro | Unlimited | 5 | 5s |
| Premium | Unlimited | 20 | Instant |

## Environment Variables

**Backend (.env):** DATABASE_URL, JWT_SECRET, JWT_EXPIRES_IN, REFRESH_TOKEN_EXPIRES_IN, RESEND_API_KEY, EMAIL_FROM, TWILIO_*, STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET, PORT, FRONTEND_URL, CORS_ORIGINS

**Frontend (.env.local):** NEXT_PUBLIC_API_URL, NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY

## Session State

This project uses `CLAUDE_STATE.md` to track current phase, completed work, and next actions. Read it before starting work to understand current state.

## Constraints

- No architecture/framework changes without explicit instruction
- Minimal, surgical code edits
- Backend: Express + Prisma only
- Frontend: Next.js + Zustand only
- MT5 communication is EA-based over HTTP
