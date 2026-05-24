# Deployment Runbook

This guide covers the current split deployment for the Signal Service Platform:

- Backend Express API: Railway
- Frontend Next.js app: Vercel
- Database: Railway PostgreSQL
- Package manager: pnpm

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────┐
│                        PRODUCTION ARCHITECTURE                       │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│   ┌──────────────┐     ┌──────────────┐     ┌──────────────┐       │
│   │   Frontend   │     │   Backend    │     │  PostgreSQL  │       │
│   │   (Next.js)  │────▶│  (Express)   │────▶│  (Railway)   │       │
│   │   Vercel     │     │   Railway    │     │              │       │
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

## Split Deployment Rules

This repository has two separate apps:

```txt
backend/    Express API for Railway
frontend/   Next.js app for Vercel
```

The repo root does not have a `package.json`. Do not run app build/deploy commands from the repo root unless the command explicitly targets a subdirectory.

Use these local commands:

```powershell
# Frontend build
pnpm --dir frontend run build

# Backend build
pnpm --dir backend run build
```

For local frontend work:

```powershell
cd "D:\Documents\Website Project\SIGNAL-SERVICE-PLATFORM-V1\frontend"
pnpm run dev
```

---

## Railway Backend Deployment

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
   - **Build Command**: `pnpm prisma generate && pnpm build`
   - **Start Command**: `pnpm prisma db push --skip-generate && pnpm prisma db seed && pnpm start`
   - **Healthcheck Path**: `/health`

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
FRONTEND_URL=https://your-frontend.vercel.app
CORS_ORIGINS=https://your-frontend.vercel.app
API_URL=https://your-backend.up.railway.app
```

5. Deploy and note the backend URL (e.g., `https://your-backend.railway.app`)

---

## Vercel Frontend Deployment

The frontend can be deployed through GitHub or Vercel CLI. Do not mix the two while debugging.

### Option A: GitHub Auto-Deploy

Use this when Vercel is connected to GitHub and should deploy every push to `main`.

1. In Vercel, open the frontend project.
2. Go to **Settings** -> **Git**.
3. Confirm:

```txt
Git Repository: JMS-tesoy/SIGNAL-SERVICE-PLATFORM-V1
Production Branch: main
```

4. Go to **Settings** -> **Build and Deployment**.
5. Configure:

```txt
Root Directory: frontend
Framework Preset: Next.js
Install Command: pnpm install
Build Command: pnpm run build
Output Directory: .next
```

6. Trigger deployment by pushing to GitHub:

```powershell
git commit --allow-empty -m "chore: trigger vercel github deploy"
git push
```

The deployment source should show GitHub/main. It should not show `vercel deploy`.

### Option B: Vercel CLI Deploy

Use this when manually deploying from PowerShell.

Important: run Vercel CLI from the `frontend` folder, not from the repo root.

```powershell
cd "D:\Documents\Website Project\SIGNAL-SERVICE-PLATFORM-V1\frontend"
pnpm run build
vercel --prod
```

For CLI deployments from inside `frontend`, Vercel settings should be:

```txt
Root Directory: blank / empty
Framework Preset: Next.js
Install Command: pnpm install
Build Command: pnpm run build
Output Directory: .next
```

If Vercel asks to link the folder:

```txt
Set up "...frontend"? yes
Found project "frontend". Link to it? no
Link to different existing project? yes
Which existing project? signal-service-frontend-deploy
Pull environment variables now? no
```

Choose `no` for pulling env vars unless you intentionally want Vercel CLI to overwrite `frontend/.env.local`.

### Frontend Environment Variables

Set these in Vercel **Settings** -> **Environment Variables**:

```env
NEXT_PUBLIC_API_URL=https://your-backend.railway.app
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_xxxxxxxx
NEXT_PUBLIC_APP_URL=https://your-frontend.vercel.app
```

Do not define `NEXT_PUBLIC_API_URL` in `vercel.json` as `@api_url` unless that Vercel secret exists. Prefer normal project environment variables.

### Favicon Verification

The favicon files are:

```txt
frontend/public/favicon.svg
frontend/src/app/icon.svg
```

After deployment, test the actual deployment URL:

```txt
https://your-vercel-url.vercel.app/favicon.svg
https://your-vercel-url.vercel.app/icon.svg
```

Expected result:

```txt
200 OK
Content-Type: image/svg+xml
```

If localhost shows the favicon but Vercel does not:

1. Confirm the deployment is not protected by Vercel Authentication.
2. Confirm the deployment source includes `public/favicon.svg`.
3. Confirm Vercel is building the correct folder.
4. Open the site in incognito because browsers cache favicons aggressively.

Common favicon/deployment mistakes:

| Symptom | Likely Cause | Fix |
|---------|--------------|-----|
| `No Next.js version detected` | Vercel is building repo root | For GitHub deploy set Root Directory to `frontend`; for CLI deploy run from `frontend` and leave Root Directory blank |
| `frontend/frontend does not exist` | Root Directory is `frontend` while CLI deploy is already inside `frontend` | Clear Root Directory or use GitHub auto-deploy |
| `/favicon.svg` returns 404 | Deployed source does not include `frontend/public/favicon.svg` | Redeploy from latest GitHub commit or deploy CLI from correct folder |
| Deployment returns 401 | Vercel Deployment Protection is enabled | Disable protection or use a public production domain |
| `NEXT_PUBLIC_API_URL` references missing `api_url` | `vercel.json` points to a missing Vercel secret | Remove the `env` reference and set the env var in Vercel dashboard |

## Stripe Webhook

1. Go to Stripe Dashboard → Developers → Webhooks
2. Add endpoint: `https://your-backend.railway.app/api/webhooks/stripe`
3. Select events:
   - `checkout.session.completed`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.payment_succeeded`
   - `invoice.payment_failed`
4. Copy the signing secret to `STRIPE_WEBHOOK_SECRET`

## Verify Deployment

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
pnpm prisma db push --skip-generate  # Sync schema
pnpm prisma db seed                   # Seed tiers & admin
```

### Manual Migrations

If you need to run migrations manually:

```bash
# Generate migration
pnpm prisma migrate dev --name your_migration_name

# Apply to production
pnpm prisma migrate deploy
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
# Test backend locally against production DB in PowerShell
$env:DATABASE_URL="production-url"
pnpm --dir backend run dev

# Check Prisma schema sync
pnpm --dir backend prisma db pull

# Validate environment
pnpm --dir frontend run build
pnpm --dir backend run build
```

---

## Support Resources

- [Railway Documentation](https://docs.railway.app/)
- [Vercel Documentation](https://vercel.com/docs)
- [Prisma Deployment Guide](https://www.prisma.io/docs/guides/deployment)
- [Next.js Deployment](https://nextjs.org/docs/deployment)
- [Stripe Webhook Setup](https://stripe.com/docs/webhooks)
