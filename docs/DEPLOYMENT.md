# Deployment and verification runbook

Status: prepared, not deployed. No public URL has been verified. All content must remain synthetic. This is an independent prototype, not affiliated with UT Dallas or the Center for BrainHealth.

## Cost decision (checked September 28, 2026)

Recommended starting setup: one **Render Free web service + Neon Free PostgreSQL**. React and the API share the Render origin, avoiding cross-origin session complexity. Estimated hosting base cost: $0 within the free allowances, excluding optional AWS/model usage. Free tiers are unsuitable for reliability promises.

- [Render Free limits](https://render.com/docs/free): service sleeps after 15 minutes idle, 750 free instance hours per workspace/month, ephemeral filesystem. Cold starts affect interview demos. Do not use its free database: it expires after 30 days.
- [Neon official free-plan description](https://neon.com/blog/neon-backend-is-ga): 100 CU-hours and 0.5 GB database storage per project. Monitor usage; a quota exhaustion can interrupt the demo. Use a region near the web service.
- [Render pricing](https://render.com/pricing): consult the account checkout for an always-on upgrade; this runbook does not authorize paid subscriptions.
- [QuickSight pricing](https://aws.amazon.com/quick/quicksight/pricing/): Author $24/user/month, Reader $3/user/month; capacity embedding starts at $250/month. Registered embedding must comply with AWS user licensing. Do not share one registered identity with arbitrary public visitors. This prototype's optional registered-user path is for an invited reviewer session; leave it disabled for public traffic pending account/licensing review.
- [S3 pricing](https://aws.amazon.com/s3/pricing/): region, requests, storage and egress determine cost. Four tiny CSV fixtures use little storage but are not a promise of zero cost.

## Deploy

1. Create a Neon Free project and copy its PostgreSQL connection string into the hosting secret manager as `DATABASE_URL`. Require TLS with certificate verification (`sslmode=verify-full`). Never paste credentials into source or chat.
2. Put this existing directory into your own Git repository. Do not commit `.env`, `data/`, `node_modules/`, or credentials. No repository or hosting CLI was connected during preparation.
3. In Render, create a Blueprint from that repository using `render.yaml`. Select the free plan. Alternatively create a Node web service with build `npm ci --include=dev && npm run build`, start `npm start`, health check `/health`, Node 24.21.0.
4. Set `NODE_ENV=production`, `DATABASE_URL`, `WEB_ORIGIN=https://YOUR-SERVICE.onrender.com`, a random `SESSION_SECRET` of at least 32 characters, and two **distinct private passwords** of at least 16 characters in `ADMIN_DEMO_PASSWORD` and `RESEARCHER_DEMO_PASSWORD`. The blueprint generates the session secret. Generate passwords using a password manager. Existing public local passwords are rejected in production.
5. For the combined Render service, leave `API_ORIGIN` and `VITE_API_URL` unset. The service serves `dist/`, `/graphql`, and `/download` from the same HTTPS origin. If the API is hosted separately, configure exact `API_ORIGIN=https://YOUR-API.example.com`, set the frontend build-time `VITE_API_URL` to that HTTPS API origin, and set `WEB_ORIGIN` to the exact frontend origin.
6. Leave `NODE_TLS_REJECT_UNAUTHORIZED` unset. Production refuses `0`; the backend requires `DATABASE_URL` to use `sslmode=verify-full`. Do not replace that with `require`, `no-verify`, or a custom insecure TLS handler.
7. Startup applies only the idempotent initial SQL file `server/migrations/001-initial.sql`, then inserts missing synthetic catalog seeds. It preserves requests and existing catalog rows. There is no migration ledger/automatic runner for future migrations; review and apply any later schema change deliberately and compatibly. Do not delete the database to deploy code.
8. Confirm `/health` is 200, then use a fresh browser session for the checklist below. Give reviewer credentials privately. Admin credentials must never appear in the public page, README, or email.
9. Before enabling HSTS, verify the public domain redirects HTTP to HTTPS, the HTTPS certificate is valid, all browser/API/download-initiation requests use HTTPS, and no mixed content appears in DevTools. Only then set `ENABLE_HSTS=true` and redeploy; the application emits a six-month HSTS header only when this opt-in is set and the host reports an HTTPS request.

Production startup refuses an absent/localhost database, weak/shared role passwords, weak session secrets, HTTP origins, unverified PostgreSQL TLS mode, and disabled TLS certificate verification. Render documents managed TLS certificates and automatic HTTP→HTTPS redirects; its load balancer terminates TLS before forwarding to the service. This repository has no deployment target yet, so the actual domain, proxy header, redirect, HSTS and DevTools checks remain required release gates. HSTS is off by default and must only be enabled after that deployed-domain verification; the app then sends the header when the host reports HTTPS. Sessions remain in browser memory and expire after one hour; refresh requires sign-in. Role passwords provide invite-only access for this small synthetic demo, not user-specific ownership, SSO, or protection for actual research records. Global persistent limits allow 30 login attempts and 10 recommendation requests per minute; multiple reviewers share these limits. A single visitor may consume the shared allowance.

API and downloads use `Cache-Control: no-store`; hashed build assets use immutable caching. No third-party fonts or analytics are loaded by default. The optional AI model request is server-to-server over HTTPS; the question is sent with allowlisted catalog metadata only. The optional QuickSight iframe and S3 download are HTTPS paths but remain unverified. PostgreSQL/S3 at-rest encryption is a provider-account setting and has not been checked here.

### Backup and restore

Before changing hosted schema/data, take a managed-provider snapshot and a logical PostgreSQL backup. Keep the connection string in the local shell/secret manager; do not paste it into chat or check it in:

```bash
pg_dump --format=custom --no-owner "$DATABASE_URL" --file=portal-backup.dump
```

Restore to a **separate empty test database** first, then verify `/health`, the four synthetic catalog rows, and a request approval/download before considering a recovery complete:

```bash
pg_restore --no-owner --dbname="$RESTORE_DATABASE_URL" portal-backup.dump
```

No backup or restore was run for this repository. Keep the existing local `data/` directory; if you need a local copy before touching it, stop the API and copy the directory to a separate backup path. Render code rollback does not roll back database changes; use additive schema changes compatible with both app versions.

## Release checklist — record evidence before changing README status

- [ ] Fresh browser: sign in as researcher; Overview and catalog each show four datasets.
- [ ] Search/filter works; clear search restores four; unsupported query has an honest empty state.
- [ ] Keyboard-only: open dataset, Tab stays in dialog, Escape closes and restores focus.
- [ ] At 375px, 768px and desktop width: readable navigation, forms and cards, no horizontal overflow.
- [ ] Request a dataset with a purpose; confirm pending state survives refresh/sign-in.
- [ ] API download returns 403 while pending. Missing/expired token returns 401; researcher approval mutation is forbidden.
- [ ] Sign in as admin; approve. Return as researcher; download and inspect CSV header/row count.
- [ ] Restart/redeploy service; request still approved (managed PostgreSQL persistence).
- [ ] Missing/invalid session gets no data; public local passwords fail in production.
- [ ] Search “sleep and reasoning”; inspect recommendations and supporting fields before requesting.
- [ ] Leave S3, QuickSight, and model-provider status unverified unless their actual live paths succeed.

The repository includes a local Chromium suite (9 checks). Reproduce all local checks with:

```bash
npm ci
npx playwright install chromium
npm run lint
npm run typecheck
npm test
npm run test:e2e
npm run build
npm audit --omit=dev
```

The E2E suite uses a fresh temporary PGlite path and strict ports 4174/5175. If those ports are already occupied, identify the process and either stop it or change `playwright.config.ts`; the suite intentionally does not reuse another API/database. Its 375/768/1440px checks verify page overflow and drawer width, and browser tests exercise URL history, invalid routes, workspace/download retry, session expiry, keyboard drawer use, shared-role access approval and authorized local CSV download. It checks that the default browser path makes no third-party requests. This automation does not verify the hosted deployment, a managed database, S3 object retrieval, QuickSight rendering, a real model-provider request, HSTS at a deployed hostname, or encryption at rest. No deployment or external resource was created for this work.
