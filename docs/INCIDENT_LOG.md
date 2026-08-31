# Security Incident Log

## 2026-09-01 — Job Queue Silently Broken for 2+ Months (BullMQ/Redis)

**What happened:**
Production runtime logs showed `Error: connect ECONNREFUSED 127.0.0.1:6379`
on `/api/jobs/trigger` — 30 occurrences since 2026-06-25 — plus 5
`Vercel Runtime Timeout Error: Task timed out after 30 seconds` on the same
route. This is the daily Vercel Cron (`vercel.json`, `0 6 * * *`) that
enqueues monthly billing and landlord disbursement jobs.

**Root cause:**
`src/lib/bullmq/queues.ts` instantiated 3 BullMQ `Queue` objects at
**module load time** (top-level `new Queue(...)`). Their connection came
from `src/lib/bullmq/connection.ts`, which read `process.env.REDIS_URL`
and silently fell back to `redis://localhost:6379` when unset —
`REDIS_URL` was never set in Vercel's production env vars (only
`UPSTASH_REDIS_REST_URL`/`TOKEN` existed, a separate REST-based client
used elsewhere for rate limiting, not BullMQ-compatible). Because
construction was eager, this fired on every cold start of any route
importing `queues.ts`, and during Next.js's build-time page-data
collection — confirmed identically in local build logs before the fix.

**Architectural finding:** the BullMQ `Worker` code (which actually
processes jobs) is correctly isolated in `src/worker.ts`, a standalone
entry point (`npm run worker`) — never imported by any Next.js route, so
there was no "Worker running inside a serverless function" anti-pattern.
But there was **no deployment configuration anywhere in the repo** for
that worker process (no `Procfile`/`railway.json`/`render.yaml`/
`Dockerfile`) — it's unverified whether it has ever run in production.
Even with Redis reachable, enqueued jobs may have piled up unprocessed
indefinitely with nothing surfacing that fact.

**Remediation taken:**
1. ✅ `src/lib/bullmq/connection.ts` / `queues.ts` — Queue construction is
   now lazy (Proxy-wrapped, matching the existing pattern in
   `src/lib/supabase/admin.ts`), and a missing `REDIS_URL` throws
   immediately with a clear message instead of attempting a doomed
   connection to `127.0.0.1`.
2. ✅ `src/lib/env-check.ts` — `REDIS_URL` added to the hard-fail list
   that already gates `SUPABASE_SERVICE_ROLE_KEY` etc.; a missing
   `REDIS_URL` now blocks the production build/deploy entirely, with a
   message distinguishing it from `UPSTASH_REDIS_REST_URL`.
3. ✅ `GET /api/jobs/queue-health` — new route, run every 6h via Vercel
   Cron, calls `getJobCounts()` on each queue and logs an ERROR-level line
   (this app has no Sentry/Datadog/similar — `console.error` surfaced via
   Vercel's runtime logs is the existing alerting mechanism) plus returns
   HTTP 503 if a queue's `waiting` count exceeds a per-queue threshold —
   so a dead/unhosted worker is loud within hours, not silent for months.
4. ✅ `Dockerfile.worker` + `.dockerignore` — deployment scaffolding so
   `npm run worker` can be pointed at Railway/Render/Fly/a VPS in minutes
   once that hosting decision is made. No provider was provisioned or
   chosen — that decision is still open.
5. ⬜ OPEN: decide where the worker process actually runs, deploy
   `Dockerfile.worker` there, and set `REDIS_URL` (+ this app's other
   secrets) in both Vercel and that provider.

**Prevention:**
A missing/misconfigured env var for a background system (queue, cron,
worker) must fail the build or alert loudly — never fall back to a
plausible-looking default (`localhost`) that only fails at the exact
moment the feature is used. `src/lib/env-check.ts`'s hard-fail-at-build
pattern and the new `queue-health` route are now the two safety nets for
this class of bug specifically for BullMQ; the same pattern should be
applied to any future background system this app adds.

**Status: PARTIALLY RESOLVED — code fix verified, infra deployment
decision (item 5) still open.**

---

## 2026-08-31 — Signup Verification Emails Never Sent (SMTP + App-Layer)

**What happened:**
Every user who registered at hauselink.com/register saw "Account Created
Successfully! Please check your email" but no verification email ever
arrived — not delivered, not bounced, never created. The "Resend
verification email" button was equally silent. At least one real user
(herijoshua4@gmail.com) was stranded: account created, unable to verify,
unable to log in.

**Discovery:**
User reported via Resend's dashboard: zero `POST /emails` calls from the
registration flow, ever.

**Two distinct, layered root causes:**

1. **App bug (fixed in commit `a3fd840`):** registration created the
   Supabase auth user via `supabaseAdmin.auth.admin.createUser()`. This
   API never sends a confirmation email regardless of the `email_confirm`
   flag — it only sets the row's confirmation state. Nothing in the
   codebase ever called anything that actually triggers Supabase's
   confirmation email. Fixed by switching to `supabase.auth.signUp()`
   (which does trigger it) and adding a real `POST
   /api/auth/resend-verification` endpoint with error handling, replacing
   a client-side `supabase.auth.resend()` call with no failure visibility.

2. **Infra bug (Supabase-side, not app code):** even after the app fix,
   every signup either hung for 30s (`FUNCTION_INVOCATION_TIMEOUT`) or
   failed fast with an opaque `AuthRetryableFetchError` / `status: 500`
   / empty body. This persisted across two SMTP port changes (465→587→465)
   and two different Resend API keys — ruling out TLS mode and the key
   itself. Root cause, found via Supabase's raw Auth logs (not visible in
   GoTrue's wrapped client error): `535 Authentication credentials
   invalid`. The SMTP password Supabase had stored for its Resend relay
   was corrupted/mistyped — re-saving the same key into Supabase's SMTP
   settings (verified character-by-character via the dashboard's Reveal
   toggle) resolved it immediately. **The port and the key were both red
   herrings; the credential storage/entry was the actual fault.**

**Secondary bug found during verification (fixed in the same pass):**
`/auth/confirm` only parsed a `?code=` query param
(`exchangeCodeForSession`). The real confirmation link Supabase sends for
a server-initiated `signUp()` (no client-side PKCE verifier) redirects
with the session in a `#access_token=...&refresh_token=...` URL *hash
fragment* instead, which `useSearchParams()` cannot see. Confirmed via a
live test with a real inbox: `email_confirmed_at` was correctly set
server-side by GoTrue's `/verify` endpoint regardless (so no accounts
were actually lost to this), but every user saw a false "This link has
expired or is invalid" error instead of the success screen. Fixed by
parsing `window.location.hash` and calling `supabase.auth.setSession()`
when `access_token`/`refresh_token` are present, keeping the `?code=`
path as a fallback.

**Remediation taken:**
1. ✅ App fix: `signUp()` instead of `admin.createUser()`, real
   resend-verification endpoint (commit `a3fd840`)
2. ✅ Infra fix: Supabase SMTP credential re-saved (done directly by the
   team, outside this codebase)
3. ✅ Frontend fix: `/auth/confirm` now handles the actual hash-fragment
   link format
4. ✅ Verified end-to-end with a real inbox: registration → email
   delivered → link clicked → correct domain → session established →
   `email_confirmed_at` set
5. ✅ herijoshua4@gmail.com recovered via the fixed resend-verification
   endpoint
6. ✅ All test accounts created during debugging deleted from both
   `auth.users` and `public.users`

**Prevention:**
When an external auth/email provider's error surface is generic (GoTrue
wraps SMTP failures as an opaque 500 with no detail), check the
provider's own raw logs (Supabase Auth Logs, not just the client SDK's
error) before assuming the app-layer config (port, key format) is at
fault — the client error shape did not change at all across two
different fixes that turned out not to be the problem.

**Status: RESOLVED**

---

## 2026-06-30 — Legacy DB Credential Exposure

**What happened:**
During early development (May 2026), the platform used Hostinger MySQL before migrating to Supabase PostgreSQL. A `prisma db pull` command run during a Claude Code session recorded the database password in plaintext in `~/.claude/settings.json` (local machine, outside the git repository).

**Discovery:**
Found via automated security audit (/cso) on 2026-06-30.

**Data exposed (potential):**
Legacy database `u509580790_hauslink` containing 4 records, all confirmed to be developer-created test/seed accounts (admin, landlord, tenant demo accounts plus one developer test signup using personal email). No real third-party user data was present.

**Remediation taken:**
1. ✅ Removed credentials from local Claude Code settings file (`~/.claude/settings.json`)
2. ✅ Rotated MySQL password in Hostinger cPanel
3. ✅ Confirmed all exposed records were developer test data, not real users
4. ✅ No user notification required (no real PII)
5. ⬜ RECOMMENDED: Delete legacy database entirely since platform now runs on Supabase

**Root cause:**
Plaintext credentials persisted in local AI coding assistant history during a `prisma db pull` command run inline with `DATABASE_URL=...` as a shell prefix. This is not a codebase vulnerability — HausLink's live Supabase production database and git history were never exposed.

**Prevention:**
Always use `.env.local` for `DATABASE_URL` rather than inline credentials in terminal commands during AI-assisted development sessions. The AI assistant's allowed-commands list stores approved command patterns verbatim, including any inline env vars.

**Status: RESOLVED**

---

**Next manual step:** Delete `u509580790_hauslink` from Hostinger cPanel (MySQL Databases → find the database → Delete) to eliminate any future exposure risk. The platform is fully migrated to Supabase and this database is no longer needed.
