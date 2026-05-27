# Repository Guidelines

## Project Structure & Module Organization

This repo is a full-stack MT5 trading signal service. `frontend/` contains the Next.js 16 + React 18 dashboard, with app routes under `frontend/src/app`, reusable UI/components under `frontend/src/components`, and API/state helpers under `frontend/src/lib`. `backend/` contains the Express + Prisma API; routes, services, middleware, jobs, and database configuration live under `backend/src`, while the Prisma schema and seed data live in `backend/prisma`. `packages/` holds shared workspace packages, and `EA's/` contains MT5 EA source/build artifacts. Project documentation lives in `docs/`.

## Build, Test, and Development Commands

Use pnpm. From `frontend/`, run `pnpm dev` for the Next.js dev server on port 3000, `pnpm build` for the production build, and `pnpm lint` for Next linting. From `backend/`, run `pnpm dev` for `tsx watch src/index.ts`, `pnpm build` for TypeScript compilation, and `pnpm start` for `dist/index.js`. Prisma commands from `backend/` include `pnpm db:generate`, `pnpm db:push`, `pnpm db:migrate`, and `pnpm db:studio`. The backend also includes `pnpm cron:start` and a script at `backend/scripts/test-signal-flow.ts`; there is no package-level test script currently defined.

## Coding Style & Naming Conventions

Both frontend and backend use TypeScript with `strict: true`. Frontend imports can use the `@/*` alias for `frontend/src/*`. Keep frontend changes aligned with the existing Next.js App Router, Tailwind CSS, Radix/shadcn-style component patterns, Zustand state, and lucide icons. Prefer small component extractions when dashboard pages become large, but avoid broad rewrites unless requested. Backend code uses ES modules, Express route/service boundaries, Prisma for database access, and zod where validation already exists.

## Agent Instructions

Inspect existing files before changing code. Keep edits small, behavior-preserving, and scoped to the request. Use Windows PowerShell-compatible commands in examples. After UI changes, run `pnpm build` from `frontend/` and tell the user what to manually test in the browser. After backend changes, run `pnpm build` from `backend/` and call out any database or environment-variable impact.

## Database Safety

Run Prisma commands from `backend/`. Treat Prisma Studio as direct database access: `pnpm db:studio` can edit or delete real records. Do not connect it to production unless the user explicitly asks for production investigation, and never paste or commit production `DATABASE_URL` values.

## Commit & Pull Request Guidelines

Recent commits use short imperative messages with prefixes such as `fix:`, `feat:`, `refactor:`, and `chore:`. Follow that style, for example `fix: add profile autocomplete attributes`. Mention user-facing behavior, build results, and manual test coverage in PR notes when applicable.
