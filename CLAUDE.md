# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev       # Start Vite dev server at http://localhost:5173
npm run build     # Production build
npm run preview   # Preview production build locally
```

Deployment is via Vercel. API endpoints in `/api/` are Vercel Serverless Functions. There is no test suite, no linter, and no type checker — `npm run build` is the only correctness gate.

## Architecture

**Velyr** is an AI-powered website + social audit SaaS. Free users get a scored audit; €9 unlocks the full report; €29/mo subscribers get the autonomous Growth Agent that opens GitHub PRs for the highest-impact fix every Monday.

### Frontend (`src/`)

Single-page React 18 app with **manual client-side routing — no React Router** (despite `react-router-dom` being in `package.json`, it is unused). `App.jsx` owns all routing and global state. Path matching is done with regex against `window.location.pathname`; navigation calls a local `navigate()` that does `window.history.pushState` + `setPath`. A `popstate` listener keeps state in sync with browser back/forward.

All top-level state lives in `App.jsx` — `path`, `scanData`, `reportData`, `liveData` (live scan progress), plus a parallel set of `premium*` versions. Scan handlers (`handleScanStart`, `handlePremiumScanStart`) drive the full pipeline and update `liveData` to feed the `ScanningScreen` progress UI.

Routes (regex-matched in `App.jsx`):
- `/` → `Home.jsx`
- `/report` and `/report/{uuid}` → `pages/Report.jsx` (UUID v4 only)
- `/premium` → `PremiumScanForm.jsx`
- `/premium/report` and `/premium/{uuid}` → `PremiumReport.jsx`
- `/agent`, `/agent/dashboard`, `/agent/login`, `/agent/register`, `/agent/reset-password`, `/agent/onboarding`
- `/agb`, `/impressum`, `/privacy`

**Auth hash interception**: `App.jsx` reads `window.location.hash` on mount and redirects Supabase magic-link / recovery flows: `type=recovery` → `/agent/reset-password`, `access_token`/`type=signup` → `/agent/dashboard`. Don't strip this `useEffect` — it's how Supabase email links land.

### Scan Pipeline (free tier)

1. `Home.jsx` POSTs to `/api/scan` with URL + optional manual social handles
2. `/api/scan` runs in parallel: Google PageSpeed (perf + Core Web Vitals + a11y), HTML scrape (SEO), content analysis (copy/UX), industry detection
3. `App.jsx` POSTs `/api/scan` result to `/api/report` → OpenRouter Claude (`anthropic/claude-sonnet-4-5`) generates the plain-English report
4. `/api/save-report` writes to Supabase, returns UUID → `navigate('/report/{uuid}')`

`/api/get-report?id={uuid}` is the read path used when a UUID URL is loaded fresh (no in-memory state). For premium reports, the same endpoint takes `&type=premium` (reads from the `premium_reports` table). Premium scan/save flow uses dedicated endpoints: `/api/premium-scan`, `/api/premium-report`, `/api/save-premium-report`.

All scan/report functions set `export const config = { maxDuration: 60 }` — Vercel's 60s ceiling. PageSpeed itself is wrapped in a 25s `AbortSignal.timeout` plus a `withTimeout` race fallback.

### Scoring Model

Composite (0–100): **20% performance** + **20% SEO** (title length, meta description, H1, alt text, OG tags) + **20% copy/UX** (outcome-focused headline, CTA, social proof, pricing visibility) + **up to 40% social** (when handles provided, benchmarked against detected industry averages).

Industry detection uses URL + hero headline keywords to pick from fitness / SaaS / e-commerce / service benchmark sets.

### Agent System

Subscribers authenticate via Supabase Auth, connect GitHub via OAuth, and configure their site. `vercel.json` defines five cron entries that all hit `/api/agent/run` with different `?mode=` params:

- Mon 09:00 UTC — full run (no mode)
- Wed 09:00 UTC — `mode=midweek`
- Mon 09:00 UTC — `mode=evaluate_ab`
- Wed 10:00 UTC — `mode=rollback_check`
- Mon 08:00 UTC — `mode=weekly_summary`

**Important**: the full Monday run is too heavy for Vercel's 60s budget. `/api/agent/run` (no mode) **fires a request to a Supabase Edge Function `agent-run` and returns immediately without awaiting** (2s `AbortController` timeout, errors ignored). The actual analysis → GitHub PR → Telegram message happens inside the Edge Function. Quick modes (`evaluate_ab`, `midweek`, `rollback_check`, `weekly_summary`) run inline in Vercel.

Auth: cron requests must carry either Vercel's `x-vercel-cron` header or `x-cron-secret: $AGENT_CRON_SECRET`. The same endpoint handles user `?action=pause|resume|delete` calls authenticated via Bearer token (Supabase user JWT).

**Approval flow**: agent posts to Telegram via `@octokit/rest` + bot token; user replies `YES` or `NO` to the bot (or `approve <id>` / `reject <id>` as a power-user fallback). The simple `YES`/`NO` flow finds the most recent `waiting_approval` run for the chat's subscription via `findPendingRunForChat()`. `/api/webhooks/telegram` ingests these and merges or closes the PR. **Rollback safety**: 48h after deploy, agent checks bounce rate; if it rose ≥15pp, it auto-opens a rollback PR.

### API Layer (`api/`)

ES modules (`"type": "module"`). Browser automation uses `playwright-core` + `@sparticuz/chromium` (serverless Chromium). Database access is `@supabase/supabase-js` with the service-role key for backend ops.

`vercel.json` includes a SPA rewrite (`/(.*)` → `/index.html`) and security headers (HSTS, X-Frame-Options DENY, etc.). Don't add a route to `vercel.json` — frontend routes are handled by `App.jsx`.

### Analytics

PostHog is loaded inline in `index.html` (EU host, key `phc_kfqurzaEB9iZBg4Wc7wm7AV6amEKrgmLmz5jn5K5EtJ8`). Server-side capture uses `posthog-node` via `api/posthog.js`.

## Environment Variables

See `.env.example`. Note the **inconsistent prefixes** — Supabase uses `NEXT_PUBLIC_*` (legacy from a Next.js scaffold) even though this is Vite, so the frontend reads `import.meta.env.NEXT_PUBLIC_SUPABASE_URL`. PageSpeed is read as `process.env.PAGESPEED_API_KEY` in `api/scan.js` even though `.env.example` documents `GOOGLE_PAGESPEED_API_KEY` — both names appear in the codebase; check the file you're touching.

Required:
- `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY` — frontend Supabase client
- `SUPABASE_SERVICE_ROLE_KEY` — backend API operations (never expose)
- `OPENROUTER_API_KEY` — Claude AI report generation
- `PAGESPEED_API_KEY` (a.k.a. `GOOGLE_PAGESPEED_API_KEY`)
- `GITHUB_APP_ID` / `GITHUB_APP_PRIVATE_KEY_BASE64` / `GITHUB_CLIENT_ID` / `GITHUB_CLIENT_SECRET` — agent
- `TELEGRAM_BOT_TOKEN` / `TELEGRAM_WEBHOOK_SECRET`
- `STRIPE_SECRET_KEY` / `STRIPE_WEBHOOK_SECRET` / `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` / `STRIPE_PRICE_STARTER` / `STRIPE_PRICE_GROWTH` / `STRIPE_PRICE_SCALE`
- `AGENT_TOKEN_ENCRYPTION_KEY` (AES-256, 64 hex), `AGENT_APPROVAL_TOKEN_SECRET` (HMAC, 32 hex), `AGENT_CRON_SECRET` (32 hex)
