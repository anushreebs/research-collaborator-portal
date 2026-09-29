# Repository audit and implementation record

Audit baseline recorded before the incremental UI changes in this branch. The
repository contains a Vite, React 19, and strict TypeScript frontend; a small
Node HTTP server using GraphQL Yoga; PostgreSQL through `pg` in production and
PGlite for a local synthetic demo; and Node's built-in test runner. The React
application was concentrated in `src/main.tsx`, with the research-question
search as its only separately extracted feature component.

## Existing behavior

- The researcher and administrator can sign in through role-specific signed
  sessions. Local development auto-signs into the synthetic demo; production
  rejects the public demo passwords and requires private credentials.
- Researchers can browse and locally search four seeded synthetic studies,
  filter by research area, inspect metadata and request access.
- Administrators can list the requests and approve or deny pending requests.
  Both roles read request state from the GraphQL API after login.
- The server enforces role checks for request creation, decisions and downloads.
  A researcher download is denied until the database records approval.
- Approved synthetic CSV files can be downloaded locally. With an S3 bucket
  configured, the server checks authorization and returns a short-lived
  presigned URL. No S3 object retrieval was verified in this audit.
- Dataset recommendations use a deterministic metadata-only fallback and an
  optional structured model call. AI is optional and recommendation validation
  prevents invented dataset IDs or fields from being presented as grounded.
- A server-side QuickSight registered-user embed URL path exists. The local
  interface clearly presents a synthetic chart fallback when QuickSight is
  unavailable; a live dashboard was not verified.
- Tests cover synthetic CSV generation, grounded recommendations and the
  researcher request → admin approval → authorized download API workflow.
- Render deployment configuration, environment examples, AWS setup and
  deployment notes already existed. No deployed URL or cloud credentials were
  present for live deployment verification.

## Gaps found

- The main view used in-memory tab, filter and selected-dataset state, so a
  refresh or shared link could not restore the catalog context or selected
  dataset, and browser navigation did not track those transitions.
- The catalog had search and category filtering but no user-facing sort or
  clear-filters action.
- `src/main.tsx` owned API transport, domain types, shell, dashboard, catalog,
  request handling, detail drawer and download feedback in one large component.
- Network errors could expose raw GraphQL messages, and loading used a plain
  text notice instead of preserving the shape of dataset cards.
- There is no configured ESLint/lint script or frontend unit/E2E test runner.
  Existing Node integration tests validate the core backend/API workflow.
- Browser testing at mobile/tablet/desktop sizes, keyboard-only walkthrough,
  hosted PostgreSQL, S3 retrieval, QuickSight rendering and a public deployment
  remain unverified.

## Preserve and improve

Keep the established Yoga/PostgreSQL boundary, role enforcement, synthetic
fixtures, S3 authorization-before-signing flow, QuickSight boundary, grounded
recommendation fallback and server integration tests. Improve the frontend
incrementally around URL state, loading/error feedback and feature-oriented
component/API/type boundaries. Avoid treating configured cloud paths as live
integrations until they have been verified against real services.

## Incremental implementation completed

- Added URL-backed navigation, catalog search/area/sort state and dataset
  selection, plus clear-filters behavior.
- Added a URL-addressable Analytics view that compares the existing synthetic
  study series, provides an equivalent data table, and keeps the QuickSight
  embed request on the server-backed GraphQL path.
- Reduced `src/main.tsx` from approximately 1,060 lines to a 12-line React
  bootstrap. `src/App.tsx` composes the app shell and feature pages; access
  state, session, dialog focus, GraphQL operations, transport, domain types,
  and feature UI live in their dedicated folders.
- Added `AppShell`, `DashboardPage`, `DatasetCatalogPage`,
  `DatasetDetailDrawer`, `RequestsPage`, `AnalyticsPage`, shared feedback
  components, and dataset card/chart components. URL/filter logic is in a
  small hook with a separately testable parser and URL serializer.
- Added Vite/Vitest/jsdom + Testing Library component tests and an isolated
  Playwright Chromium setup. Added a Biome lint gate and frontend/server
  TypeScript gate. Biome is used instead of ESLint because the repository's
  current TypeScript 7 compiler is newer than the installed typescript-eslint
  parser supports; there is no second state-management or GraphQL client.
- Added loading skeletons, explicit safe network errors/retry, empty-result
  recovery, explicit button types, synthetic chart text/table equivalents,
  reduced-motion CSS, and a keyboard-trapped dialog rendered in a body portal
  so the inert application background does not disable the modal.
- Made access-request submission a native form with validation and keyboard
  submission. Approval and download actions now prevent duplicate actions and
  announce progress/failures accessibly.
- Presigned S3 responses now request an attachment filename. This improves the
  browser download behavior but does not verify a live S3 object.
- `npm ci` completed before implementation. Baseline `npm test` passed all six
  server tests and baseline `npm run build` passed. The initial source bundle
  was 255.09 kB raw / 79.58 kB gzip.
- Final local checks: lint passed with 11 non-blocking CSS selector-specificity
  ordering warnings; client/server typecheck passed; `npm test`
  passed 6 server + 11 frontend tests; `npm run test:e2e` passed 7 Chromium
  tests, including researcher request → admin approval → researcher CSV
  download, URL Back/Forward/deep-link/invalid route behavior, failure+retry,
  and 375/768/1440px horizontal-overflow and drawer-width checks. Production
  build passed with a 264.17 kB raw / 81.79 kB gzip JS bundle (1901 modules).
- Playwright headless Chromium was used for the browser checks. These are
  automated viewport and behavior checks, not a manual visual review by a
  screen-reader user. No Lighthouse score or accessibility audit score was
  measured.
- API HTTP tests verify 403 before approval and a real local synthetic CSV
  response after approval. S3 object retrieval, QuickSight rendering, hosted
  PostgreSQL persistence, and a public deployment remain unverified.

## Security/QA re-audit — September 28, 2026

The repository now contains the feature refactor described above plus these
security and reliability changes:

- `server/config.ts` validates production passwords, session-secret length,
  exact HTTPS `WEB_ORIGIN`/optional `API_ORIGIN`, PostgreSQL
  `sslmode=verify-full`, and refusal of `NODE_TLS_REJECT_UNAUTHORIZED=0`.
  The deployment still needs a real connection test against a managed database.
- `server/index.ts` applies role authorization, explicit unauthenticated errors,
  one-hour signed sessions, an AST query guard (depth 8, 40 fields, 10 aliases),
  64 KiB GraphQL body cap, no batching or uploads, POST-only GraphQL, production
  introspection disablement, bounded search/recommendation/purpose inputs,
  request-origin restriction, security headers, approved-before-download checks,
  canonical dataset IDs and a fixed synthetic S3 key prefix.
- `server/database.ts` does not create/use a local PGlite fallback in production
  and rejects database URLs without verified TLS mode. The existing local
  `data/` directories were not deleted. During one initial local server start,
  the server used the default `data/portal-db` path briefly and applied only
  idempotent schema creation plus fixed synthetic seed inserts with
  `ON CONFLICT DO NOTHING`; no access request or decision was submitted. See
  the final verification note for this side effect.
- `src/api/graphql.ts`, `src/hooks/usePortalSession.ts` and
  `src/hooks/useAccessWorkflow.ts` keep tokens in memory, validate configured
  production API URLs, clear protected records on expiry, prevent repeated
  actions and keep user-facing errors generic. A client expiry timer mirrors
  the server token expiration.
- `AppShell` and the request/search forms now state that this is an independent,
  synthetic, non-clinical demo and warn against entering real patient,
  participant or other personal information. The request page identifies its
  shared researcher identity and shared purpose visibility.
- Google Fonts was removed, so the browser makes no default font-provider
  request. Production hashed assets can be cached; API, HTML and downloads stay
  `no-store`.
- The API test now checks absent/expired/tampered credentials, wrong roles,
  denied/pending/approved state, duplicate/concurrent requests, repeated
  decisions, malformed/path-substitution IDs, ID substitution, input/body/query
  limits, CORS origin rejection, local CSV response and production config.
  Playwright covers expiry clearing/retry, full approval/download including a
  failed download retry, responsive widths, keyboard dialog behavior, URLs,
  API outage retry, analytics fallback and absence of default third-party
  browser requests.
- `docs/SECURITY_REVIEW.md` records the current P0–P3 risk register, transport
  paths and external verification gaps. Its major remaining release gates are
  public HTTPS/DevTools verification, real PostgreSQL certificate and at-rest
  checks, AWS S3 object retrieval and private-bucket/IAM review, QuickSight
  rendering/licensing, and real model-provider behavior. Do not treat config
  validation or a local synthetic fixture as proof of a remote service.

The interface copy pass now centralizes user-visible English messages in
`src/locales/en.json`, accessed through a typed `t()` API with named
interpolation and one/other plural forms. Synthetic study metadata and user
request purposes remain content. Translation-ready structure exists; no other
language has been added or reviewed. There is also no production database
migration ledger beyond the existing idempotent initial schema file, no
backup/restore drill, no public deployment, and no human screen-reader or
contrast audit. See the security review for the ordered risk register and
residual risks.

The final pass added synchronous in-flight locks for access requests,
administrative decisions, and downloads so repeated callbacks cannot issue
duplicate network operations before React commits a state update. A focused
hook test verifies one request is sent and a later retry can succeed after the
first operation completes. No performance score or WCAG conformance claim is
made.

## Final verification — September 28, 2026

- `npm ci`: completed before the security changes; dependency manifests were
  not modified afterward.
- `npm run lint`: passed, 47 files checked, zero findings after correcting
  selector specificity.
- `npm run typecheck`: passed for client and server TypeScript.
- `npm test`: 10 API tests and 17 frontend tests passed, zero failures.
- `npm run test:e2e`: 9/9 Chromium tests passed. The isolated end-to-end
  workflow includes request, approval, authorized synthetic CSV and download
  retry; other tests cover URL history, error retry, expired session, keyboard
  dialog behavior, Analytics fallback/text table, third-party requests, and
  375/768/1440px overflow.
- `npm run build`: passed; 1,903 modules, JavaScript 276.64 kB raw / 84.96 kB
  gzip, CSS 17.87 kB raw / 4.98 kB gzip.
- `npm audit --omit=dev`: 0 production dependency vulnerabilities.
- `npm pack --dry-run --json`: 63 entries; no database data, generated CSV
  fixture directory, environment file, build output, dependency directory or
  test artifacts were included.
- A separate headless Chromium run against the actual local frontend/API used
  a temporary `/tmp` database. It measured document widths 375/375, 768/768
  and 1440/1440, completed the BHP-004 shared-role request/approval/download
  path and recorded zero page errors. This does not test a public HTTPS host,
  DevTools on a deployment, a human screen reader, or a cloud service.

The source archive contains no `.git` directory, so tracked-file history and
Git status could not be inspected. `.gitignore` now excludes runtime
`data/`, `synthetic/`, `postmaster.pid`, `node_modules/`, `dist/`, env
files except the blank `.env.example`, and test outputs. The first short-lived
manual server startup inherited the default `data/portal-db` path before the
isolated path was set. Its startup only applied idempotent `CREATE TABLE IF NOT
EXISTS` statements and inserted the four fixed synthetic seeds with
`ON CONFLICT DO NOTHING`; no request or access decision was submitted, and
no database content was deleted. Subsequent browser and automated tests used
isolated temporary databases. Because no pre-start database snapshot was
available, whether that initial seed step inserted a seed that had been absent
cannot be proven; existing rows were not overwritten.
