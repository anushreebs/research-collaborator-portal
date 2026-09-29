# Research Collaborator Portal

An independent frontend-heavy portfolio prototype inspired by a Center for BrainHealth Software Developer posting. **This project is not affiliated with UT Dallas or the Center for BrainHealth. All catalog records, counts, identifiers and trends are generated synthetic examples with no scientific meaning. This is not a clinical tool and does not diagnose. Never enter real patient, research-participant or other personal information; this shared-role demo does not protect it.**

## Problem and solution

Research collaborators need a clear way to discover study data, understand access status, request permission and retrieve authorized files. This portal demonstrates that workflow with a React and TypeScript interface backed by GraphQL Yoga and PostgreSQL-compatible storage. The local demo uses PGlite and synthetic fixtures, so reviewers can explore without accounts or cloud credentials.

## What works

- URL-backed workspace routes, catalog search, research-area filters, sorting and selected dataset details. Search/filter edits replace the current history entry; navigation and dataset selection remain navigable with Back/Forward.
- Researcher request form with validation, pending state, duplicate prevention, admin approve/deny actions, and shared researcher-role state updates without reloading. Request purposes are visible to every visitor using the shared role; do not enter personal information.
- Server-enforced signed roles: only researchers request access and download; only admins decide requests. Frontend role controls describe the demo experience and do not replace server authorization.
- Approved synthetic CSV download in local mode. When S3 is configured, the server checks access then creates a 60-second presigned URL; **no live S3 object retrieval has been verified**. A signed URL is a temporary bearer credential and appears in the browser's download request while it is used.
- Synthetic trend analytics with accessible SVG names and a tabular equivalent. The QuickSight request is server-side; the local chart is explicitly a fallback and is **not** a live QuickSight dashboard.
- Application-owned interface messages are in typed `src/locales/en.json`, with named interpolation and singular/plural support. Dataset metadata and user-entered request purposes remain content rather than interface copy.
- Metadata-only research question recommendations. The question and allowlisted catalog metadata go to the external model only when configured; never enter personal or participant information. A validated model response may be used; otherwise deterministic metadata fallback is labeled. Recommendations do not authorize access or provide clinical/scientific conclusions.
- Loading skeletons, retryable workspace errors, empty-state recovery, keyboard-operable modal drawer, and responsive layouts.

## Architecture

```text
React + TypeScript
  ├─ feature pages and UI state (src/components, src/hooks)
  ├─ typed English messages (src/locales/en.json + typed t() helper)
  ├─ URL/History API state (usePortalLocation)
  └─ GraphQL transport + operations
       ↓
GraphQL Yoga API (server/index.ts) → PostgreSQL (`DATABASE_URL`)
                                  ↘ PGlite for local demo

React → authorized GraphQL/API request → server role/access check
                                      → local synthetic CSV or short-lived S3 URL
React → GraphQL dashboard request → server QuickSight SDK → embed URL
```

The browser owns transient UI state (dialog, current form, busy indicators); workspace records come from GraphQL. Catalog view/filter/selection state is encoded in the URL. The server verifies signed role tokens and checks database access before download or admin decisions. The browser never receives AWS permanent credentials.

Production configuration fails closed unless `DATABASE_URL` uses `sslmode=verify-full`, `WEB_ORIGIN` is an exact HTTPS origin, and private role passwords/session secret are configured. Same-origin hosting is the supported default. `VITE_API_URL`, when used, must be HTTPS in production. See [the current risk register and transport review](docs/SECURITY_REVIEW.md); none of these local checks verifies an unconfigured cloud account or deployed domain.

## Run locally

Use Node 24 (Vite requires Node 20.19+ or 22.12+). From the repository root:

```bash
npm ci
DB_PATH=/tmp/research-collaborator-portal-demo npm run dev
```

Open <http://localhost:5173>. The API listens on <http://localhost:4000> and the GraphQL endpoint is `/graphql`. Local development auto-signs into synthetic demo sessions; select Researcher or Admin from the role control. The command above uses an isolated PGlite database under `/tmp`. If you intentionally want the project-persistent `data/portal-db` database, omit `DB_PATH` only after checking that existing directory and ensuring no other API process uses it. Do not delete it to reset a demo. If ports are occupied, inspect the existing process before restarting.

Production startup requires `DATABASE_URL` with `sslmode=verify-full`, a random `SESSION_SECRET` of at least 32 characters, distinct private `ADMIN_DEMO_PASSWORD` and `RESEARCHER_DEMO_PASSWORD` values of at least 16 characters, and exact `WEB_ORIGIN=https://...`. Optional `API_ORIGIN` must also be HTTPS; same-origin deployments omit it. Startup applies the idempotent initial schema and seeds only missing synthetic study rows; it does not erase the database. See [deployment](docs/DEPLOYMENT.md) and [AWS setup](docs/AWS_SETUP.md). Do not delete the existing local `data/` directory without first checking whether you need its contents.

## Quality checks

```bash
npm run lint       # Biome lint (zero findings)
npm run typecheck  # client and server TypeScript
npm test           # Node API tests + frontend unit/component tests
npm run test:e2e   # isolated local API/frontend + Playwright Chromium
npm run build      # typecheck + production Vite bundle
npm audit --omit=dev # production dependency advisory check (requires npm registry access)
```

The API tests bind a temporary localhost HTTP server. Playwright starts isolated servers on ports 4174/5175 and uses a temporary PGlite directory under `/tmp`; install its browser once with `npx playwright install chromium`. Final local verification passed: 10 API tests, 17 frontend tests, 9 Chromium E2E tests, lint (47 files, no findings), client/server typecheck, and production build (1,903 modules; JS 276.64 kB / 84.96 kB gzip, CSS 17.87 kB / 4.98 kB gzip). `npm audit --omit=dev` reported 0 vulnerabilities. A separate live headless-Chromium walkthrough verified 375/768/1440px page widths (no overflow) and the request→approval→CSV download path with no browser page errors. No hosted service or real AWS integration is included in that evidence. `npm run test:e2e` needs permission to bind local ports in restricted environments.

## Security and optional integrations

Authentication and authorization decisions are enforced in the API/database. UI hiding and protected routes are usability controls only. The app limits GraphQL request bodies and query complexity, disables batching/uploads, and disables production introspection. S3 uses server-held credentials and short-lived presigned URLs, while QuickSight requests are generated on the server. OpenAI, when enabled, receives the user-entered research question and an explicit allowlist of catalog metadata fields, never CSV rows. Keep secrets out of source and all `VITE_*` variables.

This prototype has one shared identity per role, in-memory one-hour browser sessions, no institutional SSO, no per-researcher ownership, no consent/IRB workflow, and no production research records. Researcher visitors share one request list and can see each other's submitted purposes. Live PostgreSQL TLS/at-rest configuration, S3 downloads, QuickSight rendering, model-provider calls and public HTTPS behavior remain unverified until configured and exercised against the relevant accounts/domain. This prototype is not appropriate for actual research data.

## Repository map

```text
src/
  App.tsx, main.tsx             composition and bootstrap
  api/                          GraphQL transport and operations
  components/                   shell, dashboard, catalog, drawer, requests, analytics
  hooks/                        URL state, role session, access workflow, dialog focus
  locales/                      typed English interface messages
  types/                        research domain types
  ResearchSearch.tsx            metadata-only recommendations
server/
  config.ts                     production TLS/origin/secret fail-closed checks
  index.ts                      GraphQL API, authorization, download and SPA serving
  database.ts, migrations/      PostgreSQL/PGlite boundary and schema
  dashboard.ts                  optional QuickSight URL generation
  recommendations.ts            grounded model/deterministic fallback
e2e/                            Playwright workflow and responsive checks
docs/                           audit, deployment and AWS verification notes
```

Detailed findings and a P0–P3 risk register are in [docs/AUDIT.md](docs/AUDIT.md) and [docs/SECURITY_REVIEW.md](docs/SECURITY_REVIEW.md). `.gitignore` excludes `data/`, generated `synthetic/` fixtures, PostgreSQL `postmaster.pid`, `node_modules/`, `dist/`, `.env` files and test artifacts; retain any existing local database work and never package it.
