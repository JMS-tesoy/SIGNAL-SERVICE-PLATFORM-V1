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
APP_URL=https://www.tesoy.online
NEXT_PUBLIC_SITE_URL=https://www.tesoy.online
FRONTEND_URL=https://www.tesoy.online
CORS_ORIGINS=https://www.tesoy.online
API_URL=https://your-backend.up.railway.app
```

5. Deploy and note the backend URL (e.g., `https://your-backend.railway.app`)

---

## Vercel Frontend Deployment

The frontend can be deployed through GitHub or Vercel CLI. Do not mix the two while debugging.

### Read This First: Root Directory Rule

This error means Vercel is building the wrong folder:

```txt
No Next.js version detected. Make sure your package.json has "next"...
```

The reason is almost always that Vercel cannot see:

```txt
frontend/package.json
```

Use exactly one of these deployment modes:

| Deployment Mode | Where The Build Starts | Vercel Root Directory | Command |
|-----------------|------------------------|------------------------|---------|
| GitHub auto-deploy | Repository root | `frontend` | Push to `main` |
| Vercel CLI deploy | `frontend` folder | blank / empty | `vercel --prod` |

Why the Root Directory can look confusing:

- An empty Root Directory can work when the deployment starts inside the `frontend` folder, such as a Vercel CLI deploy run from `frontend`.
- An empty Root Directory fails when GitHub auto-deploy starts from the repository root, because the repository root has no `package.json`.
- For this project, GitHub auto-deploy and CLI deploy are both valid, but their Root Directory settings are different.

Quick rule:

```txt
GitHub auto-deploy from JMS-tesoy/SIGNAL-SERVICE-PLATFORM-V1 = Root Directory: frontend
Manual Vercel CLI deploy from SIGNAL-SERVICE-PLATFORM-V1/frontend = Root Directory: blank / empty
```

Never run this from the repo root:

```powershell
vercel --prod
```

Always run manual CLI production deploys like this:

```powershell
cd "D:\Documents\Website Project\SIGNAL-SERVICE-PLATFORM-V1\frontend"
pnpm run build
vercel --prod
```

If Vercel says `frontend/frontend does not exist`, your Vercel Root Directory is still set to `frontend` while you are deploying from inside `frontend`. Clear the Root Directory for CLI deploys.

If Vercel says `No Next.js version detected`, either:

- you ran `vercel --prod` from the repo root, or
- the project Root Directory is wrong for the deployment mode you are using.

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

### Production Branch vs Preview Branch

If a UI change appears on localhost but not on `https://www.tesoy.online`, first confirm whether the change was pushed to the branch Vercel uses for production.

For this project, production should normally track:

```txt
Production Branch: main
Production Domain: https://www.tesoy.online
```

Feature branches, such as `refactor/domain-modular-backend`, usually create Vercel preview deployments. A successful preview deployment does not automatically update the production domain.

Use these checks before assuming Vercel failed:

```powershell
git branch --show-current
git log -1 --oneline --decorate
git branch -r --contains HEAD
```

Expected result for a production change:

```txt
HEAD commit is on origin/main
Vercel latest production deployment is from main
Deployment status is Ready
```

If the latest commit is only on a feature branch, production will not show the change until one of these happens:

- merge the feature branch into `main` and push `main`
- promote the feature branch preview deployment to production in Vercel
- change Vercel's Production Branch setting, only if that is intentional

Safe merge flow:

```powershell
git checkout main
git pull origin main
git merge your-feature-branch
pnpm --dir frontend run build
pnpm --dir backend run build
git push origin main
```

After pushing, open Vercel -> **Deployments** and confirm:

```txt
Branch: main
Environment: Production
Status: Ready
Domain: www.tesoy.online / tesoy.online
```

If the production deployment is ready but the browser still shows old UI, test in an incognito window or hard-refresh the page. If incognito shows the new UI, the issue was browser cache rather than deployment.

### Option B: Vercel CLI Deploy

Use this when manually deploying from PowerShell.

Important: run Vercel CLI from the `frontend` folder, not from the repo root. If you already linked the wrong folder, delete the local `.vercel` folder in the wrong location and link again from `frontend`.

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

If Vercel tries to link to a project named `frontend`, choose `no` and select the real project:

```txt
signal-service-frontend-deploy
```

If the CLI says a secret such as `@api_url` is missing, remove that secret reference from `frontend/vercel.json` and set `NEXT_PUBLIC_API_URL` in the Vercel dashboard instead.

### Frontend Environment Variables

Set these in Vercel **Settings** -> **Environment Variables**:

```env
NEXT_PUBLIC_API_URL=https://your-backend.railway.app
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_xxxxxxxx
NEXT_PUBLIC_APP_URL=https://www.tesoy.online
NEXT_PUBLIC_SITE_URL=https://www.tesoy.online
```

Do not define `NEXT_PUBLIC_API_URL` in `vercel.json` as `@api_url` unless that Vercel secret exists. Prefer normal project environment variables.

### Favicon Verification

The favicon files are:

```txt
frontend/public/favicon.svg
frontend/src/app/icon.svg
```

After deployment, test the production domain:

```txt
https://www.tesoy.online/favicon.svg
https://www.tesoy.online/icon.svg
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
