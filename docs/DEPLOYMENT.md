# Deployment Runbook

This guide covers deploying the Signal Service Platform to production environments.

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────┐
│                        PRODUCTION ARCHITECTURE                       │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│   ┌──────────────┐     ┌──────────────┐     ┌──────────────┐       │
│   │   Frontend   │     │   Backend    │     │  PostgreSQL  │       │
│   │   (Next.js)  │────▶│  (Express)   │────▶│  (Railway)   │       │
│   │   Railway    │     │   Railway    │     │              │       │
│   └──────────────┘     └──────────────┘     └──────────────┘       │
│         │                    │                                      │
│         │              ┌─────┴─────┐                                │
│         │              │  Stripe   │                                │
│         │              │ Webhooks  │                                │
│         │              └───────────┘                                │
│         ▼                    ▲                                      │
│   ┌──────────────┐     ┌─────┴─────┐                                │
│   │   Browser    │     │ MT5 EAs   │                                │
│   │   Users      │     │ (HTTP)    │                                │
│   └──────────────┘     └───────────┘                                │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Railway Deployment

### Prerequisites

- Railway account (https://railway.app)
- GitHub repository linked
- PostgreSQL database provisioned

### Step 1: Create PostgreSQL Database

1. Go to Railway Dashboard
2. Click **New Project** → **Provision PostgreSQL**
3. Copy the `DATABASE_URL` from the Variables tab

### Step 2: Deploy Backend

1. In Railway, click **New** → **GitHub Repo**
2. Select your repository
3. Configure:
   - **Root Directory**: `backend`
   - **Build Command**: `npx prisma generate && npm run build`
   - **Start Command**: `npx prisma db push --skip-generate && npx prisma db seed && npm start`

4. Add Environment Variables:

```env
# Database (copy from PostgreSQL service)
DATABASE_URL=postgresql://...

# JWT Configuration
JWT_SECRET=your-strong-secret-key-min-32-chars
JWT_EXPIRES_IN=1h
REFRESH_TOKEN_EXPIRES_IN=7d

# Email (Resend)
RESEND_API_KEY=re_xxxxxxxxxxxx
EMAIL_FROM=Signal Service <noreply@yourdomain.com>

# Twilio (SMS - Optional)
TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxx
TWILIO_AUTH_TOKEN=xxxxxxxxxxxxxxxx
TWILIO_PHONE_NUMBER=+1234567890

# Stripe
STRIPE_SECRET_KEY=sk_live_xxxxxxxx
STRIPE_WEBHOOK_SECRET=whsec_xxxxxxxx
STRIPE_PUBLISHABLE_KEY=pk_live_xxxxxxxx

# App Config
NODE_ENV=production
PORT=3001
FRONTEND_URL=https://your-frontend.railway.app
```

5. Deploy and note the backend URL (e.g., `https://your-backend.railway.app`)

### Step 3: Deploy Frontend

1. In Railway, click **New** → **GitHub Repo**
2. Select your repository
3. Configure:
   - **Root Directory**: `frontend`
   - **Build Command**: `npm install && npm run build`
   - **Start Command**: `npm start`

4. Add Environment Variables:

```env
NEXT_PUBLIC_API_URL=https://your-backend.railway.app
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_xxxxxxxx
NEXT_PUBLIC_APP_URL=https://your-frontend.railway.app
```

5. Deploy

### Step 4: Configure Stripe Webhook

1. Go to Stripe Dashboard → Developers → Webhooks
2. Add endpoint: `https://your-backend.railway.app/api/webhooks/stripe`
3. Select events:
   - `checkout.session.completed`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.payment_succeeded`
   - `invoice.payment_failed`
4. Copy the signing secret to `STRIPE_WEBHOOK_SECRET`

### Step 5: Verify Deployment

```bash
# Check backend health
curl https://your-backend.railway.app/health

# Expected response:
# {"status":"healthy","timestamp":"...","uptime":...}

# Check frontend
curl -I https://your-frontend.railway.app
# Should return 200 OK
```

---

## Environment Variables Reference

### Backend

| Variable | Required | Description |
|----------|----------|-------------|
| `DATABASE_URL` | Yes | PostgreSQL connection string |
| `JWT_SECRET` | Yes | Secret for signing JWTs (min 32 chars) |
| `JWT_EXPIRES_IN` | No | Access token expiry (default: 1h) |
| `REFRESH_TOKEN_EXPIRES_IN` | No | Refresh token expiry (default: 7d) |
| `RESEND_API_KEY` | Yes | Resend.com API key for emails |
| `EMAIL_FROM` | No | From address for emails |
| `TWILIO_ACCOUNT_SID` | No | Twilio SID for SMS |
| `TWILIO_AUTH_TOKEN` | No | Twilio auth token |
| `TWILIO_PHONE_NUMBER` | No | Twilio phone number |
| `STRIPE_SECRET_KEY` | Yes | Stripe secret key |
| `STRIPE_WEBHOOK_SECRET` | Yes | Stripe webhook signing secret |
| `NODE_ENV` | No | Set to `production` |
| `PORT` | No | Server port (default: 3001) |
| `FRONTEND_URL` | Yes | Frontend URL for CORS |
| `CORS_ORIGINS` | No | Additional CORS origins (comma-separated) |

### Frontend

| Variable | Required | Description |
|----------|----------|-------------|
| `NEXT_PUBLIC_API_URL` | Yes | Backend API URL |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | Yes | Stripe publishable key |
| `NEXT_PUBLIC_APP_URL` | No | Frontend URL for metadata |

---

## Database Management

### Initial Setup

The backend automatically runs on start:
```bash
npx prisma db push --skip-generate  # Sync schema
npx prisma db seed                   # Seed tiers & admin
```

### Manual Migrations

If you need to run migrations manually:

```bash
# Generate migration
npx prisma migrate dev --name your_migration_name

# Apply to production
npx prisma migrate deploy
```

### Database Backup

Railway provides automatic backups. For manual backup:

```bash
# Using pg_dump
pg_dump $DATABASE_URL > backup.sql

# Restore
psql $DATABASE_URL < backup.sql
```

---

## Monitoring & Logs

### Railway Logs

1. Go to Railway Dashboard
2. Select your service
3. Click **Deployments** → Select deployment → **View Logs**

### Key Metrics to Monitor

- Health endpoint response time
- HTTP error rates (4xx, 5xx)
- Database connection pool
- Memory usage
- Cron job execution

### Health Check Endpoints

| Endpoint | Method | Expected |
|----------|--------|----------|
| `/health` | GET | `{"status":"healthy"}` |

---

## Scaling Considerations

### Backend Scaling

1. **Horizontal Scaling**: Railway supports multiple replicas
2. **Connection Pooling**: Prisma uses default pool of 21 connections
3. **Rate Limiting**: Configure via `RATE_LIMIT_*` env vars

### Database Scaling

1. **Connection Limits**: Railway PostgreSQL has connection limits
2. **Consider PgBouncer**: For high-traffic scenarios
3. **Read Replicas**: For read-heavy workloads

---

## Rollback Procedure

### Railway Rollback

1. Go to Railway Dashboard
2. Select your service
3. Click **Deployments**
4. Find the previous working deployment
5. Click **Redeploy**

### Database Rollback

```bash
# Rollback last migration
npx prisma migrate reset --skip-seed

# Or restore from backup
psql $DATABASE_URL < backup.sql
```

---

## Security Checklist

- [ ] Use strong `JWT_SECRET` (32+ random characters)
- [ ] Enable HTTPS only (Railway provides this)
- [ ] Configure CORS properly (`FRONTEND_URL`, `CORS_ORIGINS`)
- [ ] Set up Stripe webhook verification
- [ ] Verify email domain in Resend
- [ ] Use production Stripe keys (not test keys)
- [ ] Review rate limiting settings
- [ ] Backup database regularly

---

## Troubleshooting

### Common Issues

| Issue | Cause | Solution |
|-------|-------|----------|
| 502 Bad Gateway | App crashed | Check logs, verify env vars |
| Database connection failed | Wrong DATABASE_URL | Verify connection string |
| CORS errors | Frontend URL mismatch | Update FRONTEND_URL |
| Stripe webhooks fail | Wrong endpoint or secret | Verify webhook URL and secret |
| Emails not sending | Invalid Resend API key | Check API key, verify domain |

### Debug Commands

```bash
# Test backend locally against production DB
DATABASE_URL="production-url" npm run dev

# Check Prisma schema sync
npx prisma db pull

# Validate environment
npm run build
```

---

## Support Resources

- [Railway Documentation](https://docs.railway.app/)
- [Prisma Deployment Guide](https://www.prisma.io/docs/guides/deployment)
- [Next.js Deployment](https://nextjs.org/docs/deployment)
- [Stripe Webhook Setup](https://stripe.com/docs/webhooks)
