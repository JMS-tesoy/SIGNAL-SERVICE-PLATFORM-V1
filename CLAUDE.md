# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

MT5 trading signal service platform: MASTER MT5 account sends signals → Backend distributes to SLAVE accounts based on subscription tiers.

**Production URLs:**
- Frontend: https://signal-service-frontend-production.up.railway.app
- Backend API: https://signal-service-api-production.up.railway.app

## Development Commands

```bash
# Backend (from /backend)
npm run dev              # Start dev server (tsx watch)
npm run build            # TypeScript compile
npm start                # Run production build
npm run db:generate      # Generate Prisma client
npm run db:push          # Push schema to database
npm run db:migrate       # Run migrations
npm run db:studio        # Open Prisma Studio GUI
npx prisma db seed       # Seed subscription tiers + admin user

# Frontend (from /frontend)
npm run dev              # Start Next.js dev server (port 3000)
npm run build            # Production build
npm run lint             # ESLint
```

## Tech Stack

**Backend:** Node.js + Express (ES modules), Prisma + PostgreSQL, JWT auth, Stripe, Resend email, Twilio SMS, node-cron, zod validation

**Frontend:** Next.js 16 + React 18, Zustand state, Tailwind CSS + Radix UI, Recharts, Framer Motion

## Architecture

```
Signal Flow:
1. Sender EA (MASTER) → POST /api/signals → Backend creates Signal
2. Backend → Creates SignalExecution per subscriber (with tier delay offset)
3. Receiver EA (SLAVE) → GET /api/signals/pending → Gets eligible signals
4. Receiver EA → POST /api/signals/ack → Confirms execution
```

**Signal Delay:** Implemented via `SignalExecution.receivedAt` offset; receiver filters by `receivedAt <= NOW()`

**MT5 Auth:** EAs authenticate via `X-API-Key` header (API keys never expire, unlike JWT)

## Key Files

- `backend/prisma/schema.prisma` - Database models
- `backend/src/index.ts` - Express app entry, rate limiters, route mounting
- `backend/src/middleware/auth.middleware.ts` - JWT + API key authentication
- `backend/src/services/signal.service.ts` - Signal creation and distribution logic
- `backend/src/jobs/scheduler.ts` - Cron jobs (cleanup, reports, subscription checks)
- `frontend/src/lib/store.ts` - Zustand state (auth tokens, user)
- `frontend/src/lib/api.ts` - API client with auto Bearer token injection

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
