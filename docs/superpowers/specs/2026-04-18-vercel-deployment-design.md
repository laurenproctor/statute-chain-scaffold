# Vercel Deployment Design

**Date:** 2026-04-18  
**Status:** Approved

## Overview

Deploy the `apps/web` Next.js application (part of a pnpm monorepo) to Vercel with a Vercel Postgres (Neon-backed) database. Start with an empty database; data ingestion runs after the app is live.

## Architecture

- **Frontend:** Vercel hosts the Next.js app (`apps/web`)
- **Database:** Vercel Postgres (Neon), linked to the Vercel project so `DATABASE_URL` injects automatically into all environments (production, preview, development)
- **Monorepo:** pnpm workspace at repo root; `apps/web` depends on `packages/*` workspace packages

## Configuration

### `vercel.json` (repo root)

Tells Vercel where the app lives and how to install dependencies from the workspace root:

```json
{
  "installCommand": "pnpm install --frozen-lockfile",
  "buildCommand": "cd apps/web && pnpm build",
  "outputDirectory": "apps/web/.next",
  "framework": "nextjs"
}
```

### Vercel Project Settings

- **Root Directory:** leave as repo root (config handled by `vercel.json`)
- **Framework Preset:** Next.js
- **Node version:** 20.x

### Environment Variables

`DATABASE_URL` is automatically set when Vercel Postgres is linked to the project. No manual env var entry needed for the database.

## Deployment Steps

1. Push `vercel.json` to the repo
2. Connect the GitHub repo to a new Vercel project via the Vercel dashboard
3. Provision a Vercel Postgres database from the Storage tab and link it to the project
4. Trigger a deploy (Vercel auto-deploys on push to `master`)
5. Verify the app loads and the `/api/debug/db` endpoint returns a healthy DB connection

## Data Ingestion (post-deploy)

After the app is live, run ingestion scripts locally pointed at the production `DATABASE_URL`:

```bash
DATABASE_URL=<prod-url> pnpm ingest:ny
```

Or via Vercel CLI environment pull to get the production URL locally:

```bash
vercel env pull .env.local
pnpm ingest:ny
```

## Error Handling

- If the build fails due to missing workspace packages, verify `transpilePackages` in `next.config.mjs` covers all `@statute-chain/*` packages (already configured)
- If `DATABASE_URL` is undefined at runtime, the Postgres link in the Vercel dashboard is missing — re-link and redeploy

## Database Schema

The schema lives in `packages/database/schema.sql`. Apply it to the production database once after provisioning:

```bash
vercel env pull .env.local   # pulls DATABASE_URL into .env.local
psql $DATABASE_URL -f packages/database/schema.sql
```

## Out of Scope

- Custom domain (can be added in Vercel dashboard post-deploy)
- CI/CD beyond Vercel's built-in GitHub integration
