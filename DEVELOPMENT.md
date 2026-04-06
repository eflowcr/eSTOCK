# Development Guide — eSTOCK Frontend

Welcome! This doc explains how to work on the frontend, how the CI/CD builds the Docker image, and how to ship a production release.

---

## Branch Strategy

| Branch | Purpose | Deploys automatically? |
|--------|---------|----------------------|
| `dev`  | Active development | Yes, on every push |
| `main` | Production | Yes, when a version tag is pushed |

Work happens on `dev`. When it's stable and tested, you merge to `main` and tag a release.

---

## Local Development

### Setup (first time)

```bash
npm install
```

### Running the app

The app needs an `API_BASE` pointing to the backend. The easiest way is a `.env` file in the project root:

```bash
# .env  (gitignored — never commit this)
API_BASE=http://localhost:8080/api
```

Then start the dev server:

```bash
npm start   # runs prebuild (generates environment.ts) then ng serve
```

The app will be available at `http://localhost:4200`.

### How environment files work

We don't commit environment-specific config. Instead:

1. You create a `.env` file locally (gitignored)
2. `scripts/load-env.js` reads it and writes `src/environment/environment.generated.ts` (also gitignored)
3. Angular uses that generated file at build time

The `prebuild` and `prestart` npm hooks run this automatically, so you never need to call the script manually.

```
.env  →  scripts/load-env.js  →  environment.generated.ts  →  ng build
```

---

## Daily Development

### Starting a new feature or fix

```bash
git checkout dev
git pull origin dev
git checkout -b feat/my-feature
```

Work, commit, open a PR into `dev`. Once merged it auto-deploys.

### Pushing directly to `dev` (small changes)

```bash
git checkout dev
# ... make changes ...
git commit -m "fix: sidebar closes on mobile after navigation"
git push origin dev
```

This triggers the **dev pipeline**:
1. TypeScript type-check + Angular build (development config)
2. Docker build (with `ENVIRONMENT=development`, `TESTING=true`)
3. Pushes `ghcr.io/eflowcr/estock-frontend:dev` + `:dev-<sha>`
4. Notifies VPS Manager → customer stacks pull the new image

---

## CI Workflows

### `deploy-dev.yml` — runs on every push to `dev`

```
push to dev
    → TypeScript type-check (ng build --configuration development)
    → docker build --build-arg ENVIRONMENT=development ...
    → push :dev + :dev-<sha> to GHCR
    → POST /stacks/update → k8s rolling update
```

### `deploy-prod.yml` — runs when a version tag is pushed

```
git push origin v1.3.0
    → TypeScript type-check (ng build --configuration production)
    → docker build --build-arg ENVIRONMENT=production --build-arg PRODUCTION=true ...
    → push :latest + :v1.3.0 to GHCR
    → POST /stacks/update → k8s rolling update (production)
```

### How the Docker build handles environment config

The Dockerfile creates a `.env` from Docker build-args, then `npm run build` triggers the `prebuild` hook which generates `environment.generated.ts`. This means every Docker image has the correct config baked in.

```dockerfile
ARG API_BASE=/api
ARG ENVIRONMENT=production
ARG VERSION=0.0.0
...
RUN printf "API_BASE=%s\nVERSION=%s\n..." "$API_BASE" "$VERSION" > .env
RUN npm run build -- --configuration=$ENVIRONMENT
```

---

## Shipping a Release

When `dev` is stable and ready for production:

```bash
# 1. Ensure dev is up to date
git checkout dev
git pull origin dev

# 2. Merge dev into main
git checkout main
git pull origin main
git merge dev --no-ff -m "release: v1.3.0"
git push origin main

# 3. Tag — triggers the prod workflow
git tag -a v1.3.0 -m "v1.3.0: brief description"
git push origin v1.3.0

# 4. Create GitHub Release
gh release create v1.3.0 --title "v1.3.0" --generate-notes --latest
```

The tag push is what triggers production CI. No tag = no prod deploy.

---

## Rolling Back

### Option A — Manual dispatch on GitHub

Go to **Actions → Build & Deploy Frontend (Prod) → Run workflow**, enter the tag (e.g. `v1.2.0`).

### Option B — CLI

```bash
gh workflow run deploy-prod.yml -f tag=v1.2.0
```

---

## Image Tags Reference

| Tag | What it is | Created when |
|-----|-----------|-------------|
| `:dev` | Latest dev build (mutable) | Every push to `dev` |
| `:dev-abc1234` | Specific dev build (immutable) | Every push to `dev` |
| `:latest` | Current production (mutable) | Every version tag |
| `:v1.3.0` | Specific release (immutable) | Tag `v1.3.0` pushed |

---

## Running Tests Locally

```bash
# Unit tests (watch mode)
npm test

# Unit tests (headless, one run — same as CI)
npm run test:ci

# TypeScript type-check + build
npx ng build --configuration development
```

---

## Quick Reference

```bash
# Start local dev server
npm start

# Build locally for production (to check it works before tagging)
npm run build -- --configuration=production

# Deploy to dev
git checkout dev && git push origin dev

# Release to production
git checkout main && git merge dev --no-ff -m "release: vX.Y.Z"
git push origin main
git tag -a vX.Y.Z -m "vX.Y.Z: what changed"
git push origin vX.Y.Z

# Rollback
gh workflow run deploy-prod.yml -f tag=vX.Y.Z
```
