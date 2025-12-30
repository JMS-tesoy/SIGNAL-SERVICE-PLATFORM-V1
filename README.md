# Signal Service Platform

A comprehensive full-stack trading signal service with MQL5 integration, user authentication, OTP verification, subscription management, and real-time dashboard.

## 🏗️ Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         SIGNAL SERVICE PLATFORM                              │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│   MT5 TERMINALS                    BACKEND (Node.js)           FRONTEND     │
│   ┌──────────────┐                ┌─────────────────┐      ┌─────────────┐  │
│   │ Sender EA    │───HTTP POST───►│                 │      │             │  │
│   │ (MASTER)     │                │   Express API   │◄────►│  Next.js    │  │
│   └──────────────┘                │                 │      │  Dashboard  │  │
│                                   │  • Auth/OTP     │      │             │  │
│   ┌──────────────┐                │  • Subscriptions│      │  • Login    │  │
│   │ Receiver EA  │◄──HTTP GET────│  • Signals      │      │  • OTP      │  │
│   │ (SLAVE)      │                │  • Cron Jobs    │      │  • Billing  │  │
│   └──────────────┘                │  • Webhooks     │      │  • Signals  │  │
│                                   └────────┬────────┘      └─────────────┘  │
│                                            │                                │
│                                   ┌────────▼────────┐                       │
│                                   │   PostgreSQL    │                       │
│                                   │   + Prisma ORM  │                       │
│                                   └─────────────────┘                       │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

## 📁 Project Structure

```
signal-service-platform/
├── backend/                    # Node.js Express API
│   ├── prisma/
│   │   ├── schema.prisma       # Database schema
│   │   └── seed.ts             # Initial data seeding
│   ├── src/
│   │   ├── config/
│   │   │   └── database.ts     # Prisma client
│   │   ├── middleware/
│   │   │   ├── auth.middleware.ts
│   │   │   ├── error.middleware.ts
│   │   │   └── logger.middleware.ts
│   │   ├── routes/
│   │   │   ├── auth.routes.ts
│   │   │   ├── otp.routes.ts
│   │   │   ├── subscription.routes.ts
│   │   │   ├── signal.routes.ts
│   │   │   ├── user.routes.ts
│   │   │   ├── webhook.routes.ts
│   │   │   └── admin.routes.ts
│   │   ├── services/
│   │   │   ├── auth.service.ts
│   │   │   ├── otp.service.ts
│   │   │   ├── email.service.ts
│   │   │   ├── sms.service.ts
│   │   │   ├── subscription.service.ts
│   │   │   └── signal.service.ts
│   │   ├── jobs/
│   │   │   └── scheduler.ts    # Cron jobs
│   │   └── index.ts            # Entry point
│   ├── package.json
│   ├── tsconfig.json
│   └── .env.example
│
├── frontend/                   # Next.js React App
│   ├── src/
│   │   ├── app/
│   │   │   ├── layout.tsx
│   │   │   ├── page.tsx        # Landing page
│   │   │   ├── login/page.tsx
│   │   │   ├── register/page.tsx
│   │   │   └── globals.css
│   │   ├── lib/
│   │   │   ├── api.ts          # API client
│   │   │   └── store.ts        # Zustand state
│   │   └── components/
│   ├── package.json
│   ├── tailwind.config.ts
│   └── next.config.js
│
└── README.md
```

## 🚀 Quick Start

### Prerequisites

- Node.js 18+
- PostgreSQL 14+
- npm or yarn

### Backend Setup

```bash
cd backend

# Install dependencies
npm install

# Configure environment
cp .env.example .env
# Edit .env with your database URL and API keys

# Generate Prisma client
npx prisma generate

# Run database migrations
npx prisma db push

# Seed initial data (subscription tiers, admin user)
npx prisma db seed

# Start development server
npm run dev
```

### Frontend Setup

```bash
cd frontend

# Install dependencies
npm install

# Start development server
npm run dev
```

## 🔑 Features

### Authentication & Security
- ✅ Email/password registration
- ✅ JWT access & refresh tokens
- ✅ Email verification (OTP)
- ✅ Two-Factor Authentication (2FA)
  - Email OTP
  - SMS OTP (Twilio)
  - TOTP (Authenticator apps)
- ✅ Password reset flow
- ✅ Session management

### Subscription Management
- ✅ Multiple subscription tiers (Free, Basic, Pro, Premium)
- ✅ Stripe payment integration
- ✅ Checkout sessions
- ✅ Subscription lifecycle (create, cancel, resume, upgrade)
- ✅ Billing portal
- ✅ Payment history
- ✅ Feature gating based on tier

### Signal Service
- ✅ Receive signals from MT5 Sender EA
- ✅ Queue signals for subscribers
- ✅ Signal delay based on subscription tier
- ✅ Daily signal limits
- ✅ Signal expiry handling
- ✅ Execution acknowledgments
- ✅ Signal history & statistics

### Cron Jobs (Scheduled Tasks)
- ✅ **Every minute**: Cleanup expired signals
- ✅ **Every hour**: Check disconnected MT5 accounts
- ✅ **Daily at midnight**: Check expiring subscriptions
- ✅ **Daily at 1 AM**: Cleanup expired sessions
- ✅ **Daily at 2 AM**: Cleanup expired OTP tokens
- ✅ **Monthly (1st)**: Generate monthly reports & emails

### Dashboard
- ✅ Real-time signal display
- ✅ Account statistics
- ✅ MT5 account management
- ✅ Subscription status
- ✅ Payment history
- ✅ 2FA settings

## 📡 API Endpoints

### Authentication
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/register` | Create new account |
| POST | `/api/auth/login` | Login (returns tokens or 2FA challenge) |
| POST | `/api/auth/verify-2fa` | Complete 2FA login |
| POST | `/api/auth/refresh` | Refresh access token |
| POST | `/api/auth/logout` | Invalidate session |
| POST | `/api/auth/forgot-password` | Request password reset |
| POST | `/api/auth/reset-password` | Reset password with OTP |
| GET | `/api/auth/me` | Get current user |

### OTP
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/otp/send/email` | Send email OTP |
| POST | `/api/otp/send/sms` | Send SMS OTP |
| POST | `/api/otp/verify` | Verify OTP code |
| POST | `/api/otp/totp/setup` | Setup authenticator app |
| POST | `/api/otp/totp/enable` | Enable 2FA with TOTP |
| POST | `/api/otp/totp/disable` | Disable 2FA |
| GET | `/api/otp/status` | Get 2FA status |

### Subscriptions
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/subscriptions/tiers` | Get all subscription tiers |
| GET | `/api/subscriptions/current` | Get current subscription |
| POST | `/api/subscriptions/checkout` | Create Stripe checkout |
| POST | `/api/subscriptions/cancel` | Cancel subscription |
| POST | `/api/subscriptions/resume` | Resume canceled subscription |
| POST | `/api/subscriptions/change-tier` | Upgrade/downgrade tier |
| GET | `/api/subscriptions/payments` | Get payment history |
| GET | `/api/subscriptions/billing-portal` | Get Stripe billing portal URL |
| GET | `/api/subscriptions/signal-limit` | Check daily signal limit |

### Signals (For MT5 EAs)
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/signals` | Receive signal from Sender EA |
| POST | `/api/signals/heartbeat` | Update account heartbeat |
| GET | `/api/signals/pending` | Get pending signals for Receiver EA |
| POST | `/api/signals/ack` | Acknowledge signal execution |
| POST | `/api/signals/positions` | Update positions snapshot |
| GET | `/api/signals/history` | Get signal history |
| GET | `/api/signals/stats` | Get signal statistics |

## 🔧 Environment Variables

### Backend (.env)

```env
# Database
DATABASE_URL="postgresql://user:pass@localhost:5432/signal_service"

# JWT
JWT_SECRET="your-secret-key"
JWT_EXPIRES_IN="1h"
REFRESH_TOKEN_EXPIRES_IN="7d"

# Email (SMTP)
SMTP_HOST="smtp.gmail.com"
SMTP_PORT=587
SMTP_USER="your-email@gmail.com"
SMTP_PASS="your-app-password"

# Twilio (SMS)
TWILIO_ACCOUNT_SID="your-sid"
TWILIO_AUTH_TOKEN="your-token"
TWILIO_PHONE_NUMBER="+1234567890"

# Stripe
STRIPE_SECRET_KEY="sk_test_..."
STRIPE_WEBHOOK_SECRET="whsec_..."

# App
PORT=3001
FRONTEND_URL="http://localhost:3000"
```

## 💳 Subscription Tiers

| Tier | Price | Signals/Day | MT5 Accounts | Signal Delay |
|------|-------|-------------|--------------|--------------|
| Free | $0 | 5 | 1 | 60 seconds |
| Basic | $29/mo | 50 | 2 | 30 seconds |
| Pro | $79/mo | Unlimited | 5 | 5 seconds |
| Premium | $199/mo | Unlimited | 20 | Instant |

## 🔐 OTP Flow

### Email Verification
```
1. User registers → Account created (unverified)
2. System sends 6-digit OTP to email
3. User enters OTP within 10 minutes
4. Account verified → Full access granted
```

### Two-Factor Authentication
```
1. User logs in with email/password
2. If 2FA enabled:
   - Email/SMS: Send OTP, user enters code
   - TOTP: User enters code from authenticator app
3. Verification successful → Session created
```

### TOTP Setup
```
1. User requests TOTP setup
2. System generates secret + QR code
3. User scans QR with authenticator app
4. User enters 6-digit code to verify
5. System provides 10 backup codes
6. 2FA enabled
```

## 📊 Monthly Reports

The scheduler generates monthly reports on the 1st of each month:

- Total signals received
- Signals executed
- Win rate calculation
- Net profit/loss
- Account balance snapshot
- Subscription tier at time of report

Reports are stored in the database and emailed to users.

## 🛡️ Security Features

- Password hashing with bcrypt (12 rounds)
- JWT tokens with short expiry
- Refresh token rotation
- Rate limiting on all endpoints
- CORS configuration
- Helmet security headers
- Input validation with Zod
- SQL injection protection via Prisma
- XSS protection

## 🚀 Deployment

### Backend (Node.js)

```bash
# Build
npm run build

# Start production
npm start

# Or with PM2
pm2 start dist/index.js --name signal-api
```

### Frontend (Next.js)

```bash
# Build
npm run build

# Start production
npm start

# Or deploy to Vercel
vercel deploy --prod
```

### Cron Jobs

Run the scheduler as a separate process:

```bash
npm run cron:start
```

Or integrate with the main server by importing `startCronJobs()` in `index.ts`.

## 📞 Support

- Documentation: [docs.signalservice.com](#)
- Email: support@signalservice.com
- Discord: [Join Community](#)

---

Built with ❤️ for the trading community
