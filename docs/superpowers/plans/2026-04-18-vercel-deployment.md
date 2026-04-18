# Vercel Deployment Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Deploy the `apps/web` Next.js app to Vercel with a Vercel Postgres database, starting from an empty database.

**Architecture:** A `vercel.json` at the repo root configures the monorepo build so Vercel can install pnpm workspace dependencies and build the Next.js app from `apps/web`. Vercel Postgres is provisioned via the dashboard and linked to the project so `DATABASE_URL` is injected automatically. The schema is applied via psql after provisioning.

**Tech Stack:** Next.js 14, pnpm workspaces, Vercel, Vercel Postgres (Neon), psql

---

## Task 1: Add `vercel.json` to repo root

**Files:**

- Create: `vercel.json`

- [ ] **Step 1: Create `vercel.json`**

Create the file at the repo root with this exact content:

```json
{
  "installCommand": "pnpm install --frozen-lockfile",
  "buildCommand": "cd apps/web && pnpm build",
  "outputDirectory": "apps/web/.next",
  "framework": "nextjs"
}
```

- [ ] **Step 2: Verify the build works locally**

Run from repo root:

```bash
pnpm install --frozen-lockfile && cd apps/web && pnpm build
```

Expected: build completes with no errors. You should see output ending in:

```text
✓ Compiled successfully
```

If you see `Module not found` errors for `@statute-chain/*` packages, check that `transpilePackages` in `apps/web/next.config.mjs` lists all workspace packages (it already should).

- [ ] **Step 3: Commit**

```bash
git add vercel.json
git commit -m "chore: add vercel.json for monorepo deployment"
```

---

## Task 2: Create Vercel project and connect GitHub repo

This task is done entirely in the Vercel dashboard — no code changes.

- [ ] **Step 1: Create a new Vercel project**

1. Go to <https://vercel.com/new>
2. Click **"Import Git Repository"**
3. Select the `statute-chain-scaffold` GitHub repository
4. Click **Import**

- [ ] **Step 2: Configure project settings**

On the "Configure Project" screen:

- **Framework Preset:** Next.js (should auto-detect)
- **Root Directory:** leave as `.` (repo root) — `vercel.json` handles routing to `apps/web`
- **Build and Output Settings:** leave all overrides empty — `vercel.json` provides them
- **Environment Variables:** leave empty for now — `DATABASE_URL` will be added in Task 3

- [ ] **Step 3: Deploy**

Click **Deploy**. The first deploy will likely fail or show a missing `DATABASE_URL` error — that's expected. We need this initial deploy so the project exists in Vercel before we can attach storage.

- [ ] **Step 4: Confirm the project exists in the Vercel dashboard**

Navigate to your Vercel dashboard and confirm the project `statute-chain-scaffold` (or similar) appears. Note the project name — you'll need it in Task 3.

---

## Task 3: Provision Vercel Postgres and link to project

This task is done in the Vercel dashboard.

- [ ] **Step 1: Go to the Storage tab**

In the Vercel dashboard, click **Storage** in the left sidebar, then click **Create Database**.

- [ ] **Step 2: Select Postgres**

Choose **Postgres** (powered by Neon). Click **Continue**.

- [ ] **Step 3: Name the database**

- Database name: `statute-chain-db`
- Region: choose the same region as your Vercel project (e.g., `us-east-1`)
- Click **Create**

- [ ] **Step 4: Link the database to your project**

After creation, you'll be on the database overview page. Click **Connect Project**, select your `statute-chain-scaffold` project, and confirm. This automatically adds `DATABASE_URL` (and related env vars) to all environments (Production, Preview, Development).

- [ ] **Step 5: Trigger a redeploy**

Go to your project → **Deployments** tab → find the most recent deployment → click the **⋯** menu → **Redeploy**. This time the build should succeed and the app should be live.

- [ ] **Step 6: Verify the app loads**

Open the deployment URL (e.g., `https://statute-chain-scaffold.vercel.app`). The app should load without errors.

---

## Task 4: Apply database schema

The app is live but the database is empty — no tables exist yet. Apply the schema.

- [ ] **Step 1: Install Vercel CLI if not already installed**

```bash
npm install -g vercel
```

Expected:

```text
added 1 package
```

- [ ] **Step 2: Log in to Vercel CLI**

```bash
vercel login
```

Follow the browser prompt to authenticate.

- [ ] **Step 3: Link the local repo to your Vercel project**

From the repo root:

```bash
vercel link
```

When prompted:

- "Set up and deploy?" → **N** (we just want to link, not deploy)
- Select your scope (personal account or team)
- Select the existing project `statute-chain-scaffold`

- [ ] **Step 4: Pull production environment variables**

```bash
vercel env pull .env.local
```

Expected: `.env.local` is created with `DATABASE_URL` pointing to your Vercel Postgres instance. Open it to confirm `DATABASE_URL` is present.

- [ ] **Step 5: Apply the schema**

```bash
psql "$(grep DATABASE_URL .env.local | cut -d'=' -f2-)" -f packages/database/schema.sql
```

Expected output:

```text
CREATE TABLE
CREATE TABLE
CREATE TABLE
```

If `psql` is not installed, install it:

```bash
brew install libpq && brew link --force libpq
```

- [ ] **Step 6: Verify schema was applied**

```bash
psql "$(grep DATABASE_URL .env.local | cut -d'=' -f2-)" -c "\dt"
```

Expected: lists tables `provisions`, `legal_references`, `aliases`.

- [ ] **Step 7: Confirm `.env.local` is gitignored**

```bash
grep ".env.local" .gitignore
```

Expected: `.env.local` is already listed. No action needed.

---

## Task 5: Verify end-to-end

- [ ] **Step 1: Hit the debug DB endpoint**

Open in your browser or run:

```bash
curl https://<your-deployment-url>/api/debug/db
```

Expected response:

```json
{
  "hasDatabaseUrl": true,
  "dbHost": "<neon-host>.neon.tech",
  "provisionsCount": 0
}
```

`provisionsCount: 0` is correct — database is empty until you run ingestion scripts.

- [ ] **Step 2: Confirm production deploys on push**

Push to `master` and confirm Vercel auto-triggers a new deployment:

```bash
git push origin master
```

Go to Vercel dashboard → your project → Deployments. A new deployment should appear within seconds of the push.

---

## Task 6: Run data ingestion (post-deploy)

With the schema in place, ingest the NY statutes.

- [ ] **Step 1: Run the NY ingestion script against production**

From repo root (with `.env.local` present from Task 4 Step 4):

```bash
pnpm ingest:ny
```

This runs `scripts/ingest-ny.ts` using the `DATABASE_URL` from `.env.local`.

- [ ] **Step 2: Verify data was ingested**

```bash
curl https://<your-deployment-url>/api/debug/db
```

Expected: `provisionsCount` is now greater than 0.
