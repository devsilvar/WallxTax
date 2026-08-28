# Frontend Optimization & Refactor Plan — PayMyTax / WallxTax

**Date:** 2026-08-28
**Branch:** `arena/01a04987-wallxtax`
**Scope:** Frontend only (Vite + React 19 + TS + Tailwind 4 + Zustand). Backend (`devsilvar/paymy-tax`, Render) is referenced but not modified — cross-repo items are flagged `[BE]`.
**Method:** full manual scan of all 70+ source files (~22,000 lines), a production build for real bundle numbers, and a full `eslint` run for the lint baseline.

> **Note on `rules.txt`:** there is no `rules.txt` in this repository (checked local checkout, full git history, and `origin/main`). This plan is therefore self-contained and applies the standard rule set a senior engineer uses for a fintech React app: **KISS**, **don't fix what isn't broken**, **no big-bang rewrites**, **money-path code gets the least refactoring and the most testing**, and the React canonical rules (stable deps, request cancellation, lazy boundaries, memoization *only* when measured, derived state over duplicated state).

---

## 1. Executive summary

The app is in **better shape than it first appears**: routes are lazy, the axios layer has a sane retry + token-refresh policy, the Zustand stores already implement stale-while-revalidate caching with in-flight deduplication, and a dashboard invalidation bus exists. The real problems are concentrated in **5 areas**:

| # | Area | Headline finding | Impact |
|---|------|------------------|--------|
| 1 | Stale-data bug | `Settings` saves business changes but calls `fetchBusinesses()` **without `force`**, so the 5-min cache suppresses the refetch → UI shows stale data for up to 5 minutes after a save | Correctness |
| 2 | Fintech data hygiene | AI chat history is persisted to `localStorage` (`ai_chat_<bizId>`) and **never cleared on logout** — the next user on the same tab can read the previous user's financial Q&A | Security |
| 3 | No request cancellation on list pages | Sales, Expenses, Payments, Reminders, TaxReports refetch on filter/page change with no `AbortController` or sequence guard → out-of-order responses can paint stale rows (the CommandPalette already does this right) | Correctness + perceived perf |
| 4 | First-load weight | Login→Dashboard pulls ~271 KB gz JS incl. a 71.6 KB gz `vendor-charts` chunk (recharts+d3) that the stale config comment claims is "only used in TaxReports analytics tab" — it isn't; the Dashboard imports it statically. Plus 31 woff2 font files (484 KB on disk) for 5 unused scripts (Cyrillic/Greek/Vietnamese) and a 645 KB JPG on the landing page, zero `loading="lazy"` in the whole repo | Perf (4G/Nigeria) |
| 5 | Duplicated list-page machinery | Sales/Expenses are ~90% twins (~800 duplicated lines); `formatNaira`/`formatDate`/`statusBadge` are copy-pasted into ~12 files; Account.tsx is a 1,521-line component with 40+ `useState` calls, a dead QR modal, and a ledger tab unreachable except by hand-typing `?tab=ledger` | Maintainability / KISS |

**Top 10 actions (ordered by value ÷ risk):**

1. Fix `fetchBusinesses()` → `fetchBusinesses(true)` after business save (1 line).
2. Clear `ai_chat_*` keys (and audit other per-user `localStorage` keys) in `logout()`.
3. Add request cancellation/sequence guard to the 5 list pages (pattern already exists in `CommandPalette`).
4. Delete dead code: `AnimatedCounter`, `HandDrawnArrow`, `HandDrawnCircle`, `DVADiagnostics`, `useRequireAuth`, `PinModal`, `Dashboard.backup-2026-08-15-original.tsx` (≈1,600 lines, the backup is currently **compiled** by `tsc` — it wastes every build).
5. Font import: latin subset only → ~21 woff2 files and most of the 168 KB CSS disappear.
6. Lazy-load + compress `public/images/*` (team-efficiency.jpg 645 KB → WebP ~80–120 KB); `loading="lazy" decoding="async"` on all below-fold `<img>`.
7. Dedupe DVA transaction fetch+mapping in Account.tsx; extract `useDvaTransactions` hook.
8. Single source of truth for formatters → `src/lib/format.ts`.
9. Collapse the 9-field `useState` farm in Settings into one form object (kill the 25-prop drilling into `BusinessPanel`).
10. Fix lint baseline: the 18 `exhaustive-deps` warnings live exactly on data-fetching effects — they are the race bugs of item 3 wearing a lint costume.

---

## 2. Codebase snapshot

**Product:** tax-compliance SaaS for Nigerian MSMEs — sales/expense tracking, 7.5% FIRS tax on gross profit, monthly tax reports (calculate → finalize → pay via Paystack), dedicated virtual account (DVA) via Paystack/Wema with auto-captured transfers, BVN identity verification, invoices with WhatsApp delivery + PDF, bank statements, reminders, AI assistant, admin panel. i18n: English + Nigerian Pidgin.

**Stack:** Vite 8 · React 19 · TypeScript 5.9 · Tailwind 4 · Zustand 5 · React Router 7 · Axios + axios-retry · Recharts 3 · i18next · react-hot-toast · lucide-react · qrcode.react. Deploy: Vercel. Backend: Express + Prisma on Render (separate repo `devsilvar/paymy-tax`; Render free-tier cold starts are the reason `axios-retry` exists — see `src/lib/axios.ts` comments).

**Numbers (verified against this commit):**

- ~22,000 lines of TS/TSX, 26 route pages, 8 Zustand stores, ~90 API call sites.
- Build: `vendor 295 KB (101 KB gz)` · `vendor-charts 279 KB (71.6 KB gz)` · `vendor-react 175 KB (55 KB gz)` · `index.css 168 KB (22.7 KB gz)` · Landing 69 KB, Account 58 KB, Settings 32.5 KB, Dashboard 33.4 KB (all raw; page chunks are fine).
- Fonts: 31 woff2 files, 484 KB on disk — 10 latin, **10 cyrillic, 6 greek, 5 vietnamese**.
- Images in `public/images/`: 10 JPGs, ~996 KB total, largest `team-efficiency.jpg` 645 KB.
- Lint baseline: **96 problems (78 errors — mostly `no-explicit-any` — and 18 warnings, 7 of them `react-hooks/exhaustive-deps`)**.
- **`loading="lazy"` occurrences in `src`: 0.**

**Architecture (as-is):**

```
App.tsx (all pages lazy)
├── GuestRoute → Login / Register / Forgot / Reset (AuthLayout)
├── ProtectedRoute → AppLayout(Sidebar, TopBar, NotificationBell, UserMenu, CommandPalette)
│   ├── Dashboard, Sales, Sales/Unverified, Test/TransferSimulator, Expenses,
│   │   Invoices, InvoiceForm, InvoiceDetail, AI, Tax(reports+analytics), Payments,
│   │   Reminders, Account, Settings
├── AdminRoute → AdminLayout (login, dashboard, users, user detail, businesses, audit logs)
└── Landing / NotFound

Data: Zustand stores (auth, business, invoice, ledger, pin, reminder, language, dashboard-events)
      → single axios instance (retries GET 502/503/504; 401 → refresh+replay)
Caching: hand-rolled SWR in stores via src/lib/cache.ts (STALE.short 30s / medium 60s / long 5min)
Invalidation: dashboard.store.ts event counter — mutations bump it, Dashboard debounces a refetch
```

---

## 3. Who is calling which API (usage map)

"Who is using the APIs" — every consumer of the backend, grouped. This map is the contract surface: anything here is **behavior we must not change** while refactoring.

| Consumer (file) | Endpoints | Notes |
|---|---|---|
| `stores/auth.store.ts` | `POST /auth/login`, `POST /auth/register`, `GET /auth/me` | logout() wipes all domain stores — keep |
| `lib/axios.ts` | `POST /auth/refresh` | token refresh + replay of original request |
| `stores/business.store.ts` | `GET /businesses`, `POST /businesses` | SWR 5-min cache + in-flight dedupe |
| `pages/Login.tsx` / `pages/admin/AdminLogin.tsx` | `GET /auth/me` | **duplicate of App.tsx's `fetchMe()` on login — 2 calls (item P0-4)** |
| `stores/invoice.store.ts` | `GET/POST/PUT/DELETE /businesses/:id/invoices…`, `…/send`, `…/send-whatsapp`, `…/mark-paid`, `…/cancel`, `…/pdf` | SWR 60s per (business+query) key; mark-paid emits dashboard invalidation |
| `stores/ledger.store.ts` | `GET /businesses/:id/ledger` | filters: scope/type/search/date/page |
| `stores/reminder.store.ts` | `GET /businesses/:id/reminders/active`, `PATCH …/mark-sent`, `DELETE …/:id` | optimistic UI with revert |
| `stores/pin.store.ts` | `GET/POST/PUT /auth/pin/…`, `GET/DELETE /auth/sessions…` | step-up token for money mutations |
| `pages/Dashboard.tsx` | `GET /tax/dashboard?months=6`, `GET /sales?limit=5`, `GET /expenses?limit=5`, `GET /tax/reports?limit=3` | 4 parallel calls; module-level SWR bundle cache per business |
| `components/dashboard/SalesExpenseChart.tsx` | `GET /sales/overview` | **no cache — refetches on every mount / period change (item P2-2)** |
| `pages/Sales.tsx` | `GET/POST/PUT/DELETE /sales…`, `GET /sales/summary`, `POST /sales/:id/verify`, `GET /transaction-classifications` | no list caching, no cancellation |
| `pages/Expenses.tsx` | `GET/POST/PUT/DELETE /expenses…`, `GET /expenses/summary` | twin of Sales |
| `pages/TaxReports.tsx` | `GET /tax/reports`, `POST /tax/calculate`, `POST /tax/reports/:id/finalize`, `…/unfinalize`, `POST /tax/pay` | Paystack redirect — money path |
| `pages/TaxAnalytics.tsx` | `GET /tax/analytics` | lazy chunk (good) |
| `pages/Payments.tsx` | `GET /tax/payments`, `GET /tax/payments/:id/verify` | money path |
| `pages/Account.tsx` | `GET /dva/virtual-account`, `GET /dva/transactions`, `POST /dva/setup-virtual-account`, `POST /dva/validate-customer`, `POST /dva/settlement/resolve`, `POST /dva/settlement/connect`, `GET /banks`, `PATCH /auth/me` | **10 s polling + 5 min timeout during BVN validation**; DVA map duplicated in `onVerifySuccess` |
| `components/TransactionDetailPanel.tsx` | `GET /receipts/tax-payments/:id` (blob), `GET /receipts/dva-transfers/:id` (blob), `POST /sales/:id/verify`, `POST /sales/:id/reclassify` | |
| `components/StatementExportModal.tsx` | `GET /tax/statements/ledger` (blob), `POST /tax/statements/ledger/email` | |
| `pages/Invoices.tsx` / `InvoiceDetail.tsx` / `InvoiceForm.tsx` | via invoice.store | Copy-link button calls the **mutating** `send-whatsapp` endpoint just to get a URL (item P2-5) |
| `pages/SalesImportModal.tsx` | `GET /sales/import/template` (blob), `POST …/preview`, `POST …/commit` | 100-row cap |
| `pages/UnverifiedTransactions.tsx` | `GET /sales/unverified`, `POST /sales/:id/verify`, `POST /sales/:id/reclassify`, `GET /transaction-classifications` | **left-in console.logs** |
| `pages/AIAssistant.tsx` | `POST /ai/chat` | history in localStorage — never cleared on logout (item P0-2) |
| `pages/Reminders.tsx` | `GET /reminders`, `POST /reminders/generate`, `PATCH …/mark-sent`, `DELETE …/:id` | |
| `pages/Settings.tsx` | `PUT /businesses/:id`, `POST/DELETE /businesses/:id/logo`, `PUT /auth/change-password` | stale-cache bug on save (item P0-1) |
| `components/CommandPalette.tsx` | `GET /businesses/:id/search` | the only call site using `AbortController` |
| `pages/admin/*` | `GET /admin/dashboard`, `GET /admin/users(…/:id)`, `PATCH …/status`, `PATCH …/email-verification`, `GET /admin/businesses`, `GET /admin/audit-logs` | |
| `pages/TestTransferSimulator.tsx` | `GET /test/businesses-with-dva`, `POST /test/simulate-transfer` | dev tool, routed behind auth |

**Request volume on the hot path (login → Dashboard):** `/auth/me` ×2, `/businesses`, `/businesses/:id/tax/dashboard`, `/sales?limit=5`, `/expenses?limit=5`, `/tax/reports?limit=3`, `/reminders/active`, `/sales/overview` (chart), plus font/CSS/JS. On a cold Render start, every one of those can take 2–5 s; the 4 dashboard calls + chart call are 5 sequential round-trips of latency we *could* collapse.

---

## 4. What is already good — **do not touch**

These patterns are correct and are the reason the app feels OK today. Every phase below must preserve them:

1. **Route-level code splitting** in `App.tsx` — every page is `lazy()`.
2. **`manualChunks`** in `vite.config.ts` (react / charts / icons / vendor) — keep the shape; only fix the stale comment.
3. **`src/lib/axios.ts`** — GET-only retries on 502/503/504 + network, 401 refresh + replay, lazy import to break the auth-store cycle. This file is production-hardened; do not restructure it.
4. **Store-level SWR** (`business`, `invoice`) + **in-flight dedupe** (`inflight` variable) + `lastFetchedAt` keys.
5. **`logout()` wiping every domain store** — multi-tenant hygiene on shared devices. (Extend it — don't redesign it.)
6. **Dashboard invalidation bus** (`dashboard.store.ts` event counter) — decoupled and correct; keep the contract, only reduce how often the refetch fires.
7. **Optimistic UI with revert** in `reminder.store.ts` (markRead/dismiss) — the pattern we want to copy, not delete.
8. **Skeletons + ErrorBoundary + route guards** (`ProtectedRoute`, `AdminRoute`, `GuestRoute`).
9. **Debounced search** in Invoices (300 ms) and CommandPalette (200 ms + AbortController).
10. **Lazy `qrcode.react`** in Account and **lazy `TaxAnalytics`** (recharts) in TaxReports.
11. **i18n eager loading** — the code comment already weighs this: 2 languages × 5 tiny namespaces (~15 KB) is fine. Revisit only if languages grow.

### Pages/features to **deliberately not over-optimize** (breakage risk > reward)

| Area | Why to leave alone |
|---|---|
| **Auth + token refresh flow** | Battle-tested, security-critical. Only fix the duplicate `/auth/me` (P0-4) and never reorder the refresh/replay logic. |
| **Tax money path**: calculate → finalize → Paystack `window.open(authorizationUrl)` → lock, and **Payments verify** | A 500 ms "optimization" here can lose a tax payment. No refactor; add test coverage instead. |
| **Invoice WhatsApp share** (native share → desktop fallback → PDF download) | Works across mobile/desktop edge cases with careful `AbortError` handling. Only the *copy-link* side effect changes, and only with a backend endpoint (P2-5). |
| **Landing hero/brand visuals** | Marketing surface. Only add lazy/async images, explicit dimensions, and `prefers-reduced-motion` for the 11 infinite animations — zero layout changes. |
| **Recharts on Dashboard** | 71.6 KB gz is defensible for the product's core screen. Do **not** strip charts from the first paint; instead consider lazy-mounting the chart *below the KPIs* (P1-3) so the numbers paint first. Measure before committing. |
| **DVA 10 s validation polling** | Correct for the UX it serves ("bank verification takes 1–2 min"). Only de-dupe overlapping fetches (P3-2). |

---

## 5. Work plan

Conventions: each item lists **Files · Fix · Risk · Win**. Risk: L = near-zero, M = needs the QA matrix in §6, H = needs extra review. Phases are strictly ordered — do not merge Phase 3+ changes into the same PR as Phase 0/1.

### Phase 0 — Correctness & fintech hygiene (1–2 days, all low-risk)

**P0-1. Stale business data after Settings save** — `L`
- **Files:** `src/pages/Settings.tsx` (`handleBusinessUpdate`).
- **Problem:** after `PUT /businesses/:id` succeeds it calls `fetchBusinesses()` (no force). The business store's 5-minute SWR cache is still fresh, so it returns immediately and the UI keeps showing the old name/TIN/state/tax config until the TTL expires.
- **Fix:** `await fetchBusinesses(true)` (or, better, patch the store from the PUT response — the store already has `createBusiness` doing optimistic set; add `patchBusiness(id, patch)` and use it, falling back to forced fetch).
- **Win:** correctness — currently users can "save" and see nothing change for 5 minutes.

**P0-2. AI chat history survives logout** — `L` (security, fintech)
- **Files:** `src/pages/AIAssistant.tsx`, `src/stores/auth.store.ts`.
- **Problem:** chat (which contains financial questions/answers) is persisted to `localStorage['ai_chat_<bizId>']`; `logout()` never removes it. Next user on the same device/browser can scroll back and read it.
- **Fix:** in `logout()`, remove all `ai_chat_*` keys (`Object.keys(localStorage).filter(k => k.startsWith('ai_chat_')).forEach(k => localStorage.removeItem(k))`). Keep the `lang` key.
- **Win:** closes a data-leak path; 5 lines.

**P0-3. List pages can paint stale rows (no cancellation / no sequence guard)** — `M`
- **Files:** `pages/Sales.tsx`, `pages/Expenses.tsx`, `pages/Payments.tsx`, `pages/Reminders.tsx`, `pages/TaxReports.tsx` (list), `pages/UnverifiedTransactions.tsx`.
- **Problem:** fetch effects re-fire on `page/filter` changes with no guard; a slow response for page 3 arriving after page 4's response overwrites newer state. On flaky 4G + Render cold starts this is a real race, not a theoretical one.
- **Fix (KISS — no new deps):** replicate the pattern already in `CommandPalette.tsx`: `const ctrl = new AbortController()` in the effect, pass `signal` to `api.get`, cleanup aborts. For the 2 pages that call `fetch*` from *multiple* places (Sales: effect + post-mutation), the simplest correct shape is a `useRef` sequence counter: only apply the response if its seq is the latest. ~15 lines per page.
- **Win:** correctness + fewer wasted in-flight requests.

**P0-4. Duplicate `GET /auth/me` on login** — `L`
- **Files:** `src/pages/Login.tsx`, `src/pages/admin/AdminLogin.tsx`, `src/App.tsx`.
- **Problem:** Login does `await api.get('/auth/me')` to pick the redirect target; then `isAuthenticated` flips and `App`'s effect calls `fetchMe()` again. Two identical calls on the hottest transition in the app.
- **Fix:** have `auth.store.login()` itself fetch the user (it already has the token) and store it, so `App`'s effect sees `user` is present and skips (guard: `if (!get().user) fetchMe()`). Or, minimal version: delete the manual call in Login and let the existing `App` effect + `GuestRoute` role redirect do it — verify redirect behavior for admin first (QA step).
- **Win:** −1 round trip on every login.

**P0-5. Left-in debug logging** — `L`
- **Files:** `pages/UnverifiedTransactions.tsx` (~20 `console.log`s with emojis, including logging full API responses with user data), plus scan results: `Dashboard.tsx` has `console.log` behind `import.meta.env.DEV` (fine — keep those, they're guarded).
- **Fix:** delete the unguarded logs.
- **Win:** log privacy + hygiene.

**P0-6. Dead code deletion (≈1,600 lines)** — `L`
- **Files (verified zero importers):** `components/AnimatedCounter.tsx`, `components/HandDrawnArrow.tsx`, `components/HandDrawnCircle.tsx`, `components/DVADiagnostics.tsx` (referenced only in a *comment* in Dashboard.tsx — delete the comment import too), `hooks/useRequireAuth.ts`, `components/PinModal.tsx` (the pin flow actually lives in Settings' SecurityPanel), `pages/Dashboard.backup-2026-08-15-original.tsx` (a full 1,314-line backup of Dashboard — **it is compiled by `tsc` today** because `tsconfig.app.json` includes all of `src`; git history already preserves it).
- **Fix:** delete the files; keep `Dashboard.skeleton.tsx` (in use).
- **Win:** smaller type-check on every build, no confusion, KISS.
- **Also:** `.env` is committed while `.env.example` says "NOT in git" — add `.env` to `.gitignore` (it holds only a public `VITE_` URL, so no secret rotation, just convention).

**Phase 0 exit criteria:** `npm run build` green; `npm run lint` errors ≤ 78 (no *new*); QA matrix rows: login (user+admin), settings save → see change immediately, unverified transactions page, AI assistant.

---

### Phase 1 — First-load performance (2–4 days)

**P1-1. Font subsets: latin only** — `L`
- **Files:** `src/index.css`.
- **Problem:** `@import "@fontsource/inter/400.css"` (and 4 more) pulls **all** unicode subsets: the build emits 31 woff2 (484 KB) — 10 cyrillic, 6 greek, 5 vietnamese that a Nigeria-only product never renders. The CSS itself (168 KB raw / 22.7 KB gz) is dominated by those `@font-face` blocks.
- **Fix:** import the latin entrypoints only: `@fontsource/inter/latin-400.css`, `latin-500.css`, `latin-600.css`, `@fontsource/montserrat/latin-400.css`, `latin-600.css` (verify `latin-ext` if we want proper handling of any rare Latin-extended glyphs — Nigerian Pidgin text is plain ASCII, latin is sufficient).
- **Win:** −21 font files, CSS −~60%, less parse work on low-end Android. (Browsers only fetch needed subsets, so this is mostly CSS/parse win + repo hygiene — still the single cheapest byte win available.)

**P1-2. Landing page images** — `L` (marketing page, zero logic risk)
- **Files:** `pages/Landing.tsx`, `public/images/*`, `index.html`.
- **Problem:** 0 `loading="lazy"` in the entire repo; the landing eager-loads ~996 KB of JPGs incl. `team-efficiency.jpg` (645 KB) and `team-collaboration.jpg` (116 KB) — and the testimonials section reuses `dashboard-hero.jpg` as a full-bleed background. `logo.png` has no width/height (layout shift).
- **Fix, in order:**
  1. Convert the 10 public JPGs to WebP (keep names in a new `webp` set or swap in place) — expect 60–80 % size cuts on these photos (645 KB → ~100 KB class). `sharp` or `cwebp` one-off script; leave originals in git history.
  2. Add `loading="lazy" decoding="async"` + explicit `width`/`height` to every below-fold `<img>` (gallery, steps, features, testimonials bg). Hero-area images stay eager.
  3. `fetchpriority="high"` on the single above-fold hero asset if we adopt one.
- **Win:** landing LCP on 4G drops by the weight of the gallery (roughly −700 KB transfer).

**P1-3. Defer the chart, keep the numbers** — `M`
- **Files:** `pages/Dashboard.tsx`, `components/dashboard/SalesExpenseChart.tsx`, `vite.config.ts`.
- **Problem:** `SalesExpenseChart` is a static import in Dashboard, so the 279 KB `vendor-charts` chunk (recharts + d3) must be fetched and parsed before the *numbers* on the first post-login screen. The `vite.config.ts` comment ("used only in TaxReports analytics tab") is stale and hides this.
- **Fix (KISS, preserves behavior):**
  1. `const SalesExpenseChart = lazy(() => import('@/components/dashboard/SalesExpenseChart.tsx'))` in Dashboard (and in Sales' overview toggle), wrapped in a `Suspense` fallback that mirrors the card's KPI strip height (no layout jump).
  2. Fix the `vite.config.ts` comment to state the truth.
  3. The chunk itself stays in `vendor-charts` — it's now just *later*, not smaller.
- **Win:** dashboard numbers/KPIs paint ~1 chunk earlier on 4G; charts arrive milliseconds behind on good networks.
- **Guardrail:** if Lighthouse comparison shows LCP regression (chart card sits high on large screens), revert just this item — it's a one-line revert.

**P1-4. `vendor` chunk triage** — `L`
- **Files:** `vite.config.ts`.
- **Findings:** `vendor` (295 KB / 101 KB gz) = i18next (+ detector + react-i18next), axios (+retry), react-hot-toast, zustand, qrcode.react. qrcode.react is lazy-*used* (Account) but lands here because `manualChunks` buckets the whole package.
- **Fix:** (a) move `qrcode.react` into its own chunk by matching it before the generic `node_modules` branch; (b) verify i18next ships from its ESM build (the CJS dist is 81 KB — if Vite resolves CJS, that's a free ~20–30 KB min win via an alias to `dist/esm`); (c) keep axios+react-hot-toast+zustand in `vendor` — splitting further gains <2 KB each and violates KISS.
- **Win:** ~25–50 KB gz off the critical path for non-Account pages; cleaner chunk semantics.

**P1-5. Landing ambient animation cost** — `L`
- **Files:** `pages/Landing.tsx`, `src/index.css`.
- **Problem:** 11 infinite animations, several of them `blur(30–120px)` blobs + a 20 s spinning conic-gradient with `blur(30px)` — continuous compositor/GPU work on mid-range Android, and they keep running off-screen.
- **Fix:** wrap the ambient layers in a `prefers-reduced-motion: reduce` kill-switch (one CSS media query); give the blob morphs a cheaper `transform`-only variant; the conic ring can drop `filter: blur(30px)` (the opacity-30 look survives without it). No visual redesign — the page must look identical in motion-enabled mode.
- **Win:** battery/thermal on the page Nigerian users hit most from their phones.

**Phase 1 exit criteria:** Lighthouse mobile (Slow 4G preset) on `/` and `/dashboard` before/after; bundle diff review; visual diff of landing (animations identical in default mode).

---

### Phase 2 — Cache & request economy (2–3 days)

**P2-1. One dashboard round-trip `[BE]` (optional, cross-repo)** — `M`
- **Files:** frontend `pages/Dashboard.tsx`; backend `devsilvar/paymy-tax` (tax.controller / business.routes).
- **Problem:** cold dashboard = 4 parallel GETs (tax/dashboard, sales?limit=5, expenses?limit=5, tax/reports?limit=3). On a cold Render start that's 4 × 2–5 s of latency even though they're parallel (connection setup + per-request auth).
- **Fix:** backend adds `GET /businesses/:id/dashboard-bundle` returning the same 4 payloads; frontend swaps `fetchDashboardBundle` to one call, keeping the *exact same* response shape so the SWR cache + invalidation bus are untouched.
- **Win:** −3 round trips on the app's most important screen; also simplifies the frontend function to one `api.get`.
- **Status:** coordinate with backend; skip if backend is frozen — the existing 4-call version is acceptable.

**P2-2. Cache `GET /sales/overview`** — `L`
- **Files:** `components/dashboard/SalesExpenseChart.tsx`.
- **Problem:** the chart refetches on every mount and every period/daterange change; Dashboard and Sales page can both mount it in a session → duplicate identical requests; and the same `period` re-fetches on every navigation.
- **Fix (KISS):** module-level `Map<cacheKey, {data, fetchedAt}>` exactly like `Dashboard.tsx`'s `dashboardCache` (key = `bizId|period|from|to`), 30 s freshness via the existing `STALE.short` + `isFresh` helpers, serve-then-revalidate when stale. ~25 lines, no new deps, no store changes.
- **Win:** navigation Dashboard ↔ Sales → overview toggling stops refetching; halves duplicate chart calls.

**P2-3. Cache `/transaction-classifications`** — `L`
- **Files:** `pages/Sales.tsx`, `pages/UnverifiedTransactions.tsx`.
- **Problem:** global, near-static reference data, fetched on mount of each of the two pages (2+ round trips per session, identical bodies).
- **Fix:** tiny module-level promise cache (fetch once, share; reset on logout via the existing store-clear pattern or a `reset()`). No store needed — KISS.
- **Win:** −1 request per session; also removes one of the two `loadingClassifications` spinner paths from first paint.

**P2-4. Banks list** — keep as-is.
- `GET /banks` is fetched lazily only when a form opens (Account) and the backend already has a `bank_cache` table. No change.

**P2-5. "Copy link" must not be a mutation `[BE]` (optional)** — `M`
- **Files:** `pages/InvoiceDetail.tsx` (`handleCopyLink`), backend invoice controller.
- **Problem:** copying the public PDF link calls `POST …/send-whatsapp` — which flips invoice status to sent *and* returns the whole PDF base64 in the response — purely to read a URL.
- **Fix:** backend exposes the share URL non-mutatingly (e.g. `GET …/share` or the URL already in `GET …/:id` meta); frontend uses it. Until backend lands, current behavior is *safe but heavy* — note it, don't hotfix.
- **Win:** lighter copy, no accidental status flip, no megabyte base64 payload for a clipboard action.

**Phase 2 exit criteria:** network tab QA — navigate Dashboard→Sales→Dashboard→Account and count requests (expect fewer, no new); SWR semantics unchanged (mutate → dashboard numbers update within the 500 ms debounce).

---

### Phase 3 — KISS refactors (3–5 days, one PR per item, each behind the QA matrix)

These change structure, not behavior. Each is independently shippable and revertable.

**P3-1. `src/lib/format.ts` — single source of truth for formatters** — `L`
- **Files:** new `src/lib/format.ts`; ~12 files (`Sales`, `Expenses`, `Payments`, `Reminders`, `TaxReports`, `TaxAnalytics`, `Invoices`, `InvoiceDetail`, `InvoiceForm`, `UnverifiedTransactions`, `Account`, `admin/*`, `CommandPalette`, `SalesExpenseChart`).
- **Problem:** `formatNaira`, `formatDate`, `formatMonth`, `statusBadge`-style helpers are copy-pasted with *slightly different* options (e.g. InvoiceDetail always shows 2 decimals, others 0–2 — that difference is real product behavior and must be preserved per-call-site).
- **Fix:** export `formatNaira(n, opts?)`, `formatDate(iso, withTime?)` from one file; keep per-page badge components (they're UI, not data). Do a mechanical rename; grep-verify every call site.
- **Win:** one place to fix a currency format bug; −150 lines.

**P3-2. Account.tsx — split the 1,521-line god component** — `M`
- **Files:** `pages/Account.tsx`.
- **Problems (verified):**
  - 40+ `useState` hooks in one component.
  - DVA transaction fetch+map exists **twice** with *divergent* mapping logic (`fetchTransactions` vs the inline copy in `TransactionDetailPanel`'s `onVerifySuccess` — one labels rows `From <name>`, the other `<hint> || <name>`; user-visible inconsistency).
  - **Dead QR modal:** `showQR` is never set to `true` anywhere — ~30 lines of unreachable UI (keep the lazy `QRCode` import only if we re-wire; otherwise delete both).
  - **Unreachable ledger tab:** the tab switcher is commented out, so the entire `?tab=ledger` surface (~350 lines + `ledger.store.ts` usage) is reachable only by hand-typing the URL.
  - Settlement form, BVN form, phone form each ~80 lines of inline JSX.
- **Fix, in this order (each its own commit):**
  1. Extract `hooks/useDvaTransactions(bizId)` — one fetch, one mapper, derived `moneyIn` totals via `useMemo`. Delete the duplicated inline fetch in `onVerifySuccess` (call `refetch()` from the hook instead).
  2. Extract `components/account/SettlementCard.tsx`, `BvnForm.tsx`, `PhoneForm.tsx` (pure extraction, same markup).
  3. **Product decision needed on the ledger tab** — restore the switcher, or promote the ledger to its own route `/account/ledger` (cleaner; keeps the sidebar honest), or delete it. Do **not** ship this phase with the tab left half-dead.
  4. Delete dead QR state/modal or wire it to the "Share Details" button (product call).
- **Win:** file drops ~1,500 → ~600 lines; the two DVA mappers become one (bug fix included); money-path behavior untouched (DVA verify/reclassify stay exactly as-is).

**P3-3. Settings business form — one state object** — `M`
- **Files:** `pages/Settings.tsx`.
- **Problem:** 9 separate `useState` hooks + 9 setters drilled as props into `BusinessPanel` (the component takes **25 props**); `initial` snapshot + `isDirty` compare 9 fields by hand; a duplicated `Card` component shadows `@/components/ui/Card.tsx` with a different API.
- **Fix:** single `businessForm` state (object + one `patch(k, v)`); `useMemo` dirty-check against a snapshot; `BusinessPanel` receives `value`, `onChange(k,v)`, `onSubmit`, `onReset`, `initial`. Extend `ui/Card` with `title/subtitle/action` (it's already the app card) and delete the local one.
- **Win:** −120 lines, −20 props, adding a 10th field is 1 line instead of 4.
- **Note:** keep the sticky save bar + unsaved-changes UX exactly as-is (it's good UX).

**P3-4. `Payments.tsx` detail-data helper** — `L`
- **Files:** `pages/Payments.tsx`.
- **Problem:** the 18-line `setSelectedPayment({…})` object literal appears **4 times** (desktop row, desktop receipt button, mobile card, mobile receipt button).
- **Fix:** `const toDetail = (p: TaxPayment): TransactionDetailData => ({…})`; 4 call sites become `toDetail(p)`.
- **Win:** −55 lines, single place to fix if the detail shape changes.

**P3-5. Shared list-page primitives for Sales/Expenses (phased)** — `M`
- **Files:** new `src/components/list/*` (or `src/hooks/usePagedList.ts`); `pages/Sales.tsx`, `pages/Expenses.tsx` (later: `Reminders`, `Payments`, `TaxReports` if it still helps).
- **Problem:** Sales and Expenses are ~90% twins: same skeleton (header → summary card w/ month stepper → inline form → filter bar → desktop table + mobile card list → pagination), same `formatNaira`, same fetch shape. ~800 duplicated lines; a bug fix (e.g. P0-3's cancellation) must be done twice.
- **Fix — do it in 3 steps, each shippable:**
  1. `usePagedList<T>({ fetch, page, filters, limit })` returning `{ rows, pagination, loading, refetch }` with the P0-3 sequence guard baked in. Sales and Expenses adopt it *without* any markup change.
  2. Extract `<FilterBar>`, `<ListPagination>`, `<DesktopTable|MobileCards>` into presentational components.
  3. Only then consider a `useMonthlySummary` hook for the two summary cards.
- **Win:** future list pages (or bug fixes) cost ~1/3 the lines; P0-3's guard is written once.
- **Guardrail:** step 1 must produce byte-identical UI (diff screenshots); if a page fights the abstraction, keep that page on the old pattern — KISS means the abstraction serves the pages, not the other way round.

**P3-6. Lint/type cleanup pass** — `L`
- **Files:** repo-wide; start where it matters (`stores/*`, `lib/*`, the 7 files with `exhaustive-deps` warnings).
- **Problem:** 96 lint problems; 78 are `no-explicit-any` (mostly in error-handling: `catch (err: any)` — `getErrorMessage(err)` in `lib/axios.ts` already types this properly, most sites should call it); 18 warnings include `exhaustive-deps` on fetch effects.
- **Fix:** fix the `exhaustive-deps` in data files by making fetch fns `useCallback` with honest deps (this is the structural twin of P0-3); replace `catch (err: any)` with `getErrorMessage(err)` / typed casts; add `@typescript-eslint/no-explicit-any` to `eslint` errors config once the sweep is done so it can't rot.
- **Win:** the lint gate becomes a real guardrail instead of noise; stale-closure bugs get caught in CI.

**Phase 3 exit criteria:** full QA matrix (§6) after *each* item; visual diff for Settings/Account/Payments.

---

### Phase 4 — Test floor (optional but recommended for a fintech, 2–3 days)

**P4-1. Vitest + React Testing Library, stores first** — `L`
- No test framework exists in the frontend today. The stores are where all caching/invalidation/logout-wipe logic lives — unit-testing them is the highest-ROI coverage in the repo:
  - `business.store`: cache hit/miss, in-flight dedupe, `force`, `clear()` wipes.
  - `invoice.store`: SWR key behavior, `patchInList`, logout wipe.
  - `auth.store.logout`: **asserts every domain store + `ai_chat_*` keys are cleared** (locks in P0-2).
  - `reminder.store`: optimistic revert on failure.
- **Then** one component test each for the P0-3 pages (page 3 → page 4 → slow page 3 response must not paint).
- **Fix:** add `vitest` + `@testing-library/react` + `jsdom` as devDeps, `test` script, `src/test/setup.ts`. No testing-library for everything — KISS: cover stores + the race fix, stop there until the team wants more.

**P4-2. Bundle budget** — `L`
- Add `size-limit` (or a CI step comparing `npm run build` output to committed numbers) with budgets: `vendor-charts ≤ 285 KB`, `vendor ≤ 290 KB`, `index.css ≤ 80 KB raw` (post P1-1), landing images total ≤ 400 KB. A budget makes regressions visible instead of annual.

---

### Phase 5 — Cross-repo / product items (track, not do here)

| Item | Where | Why |
|---|---|---|
| `GET /businesses/:id/dashboard-bundle` | `devsilvar/paymy-tax` | P2-1 — 4 calls → 1 |
| Non-mutating invoice share-link endpoint | `devsilvar/paymy-tax` | P2-5 |
| `Etag`/`Cache-Control` on `GET /banks` & `/transaction-classifications` | `devsilvar/paymy-tax` | Lets the frontend use native HTTP caching instead of module caches if we ever drop the in-memory ones |
| Product call: ledger tab (restore / route / delete) | this repo | P3-2 step 3 |
| Product call: QR-to-pay modal (dead code) | this repo | P3-2 step 4 |
| Render cold-start mitigation (spinning reserve / always-on) | infra | The retry policy is a band-aid; every ms of backend cold start multiplies every frontend optimization's perceived value |

---

## 6. QA matrix (run after each phase, and after every Phase 3 item)

Environment: production URL + a 3G/4G-throttled mobile Chrome (the real user) and desktop.

| # | Scenario | Expected |
|---|---|---|
| 1 | Fresh login (user) | no double `/auth/me`; dashboard paints with skeleton → data; numbers correct |
| 2 | Login as admin | lands on `/admin`, sidebar admin link visible |
| 3 | Log out → log in as different user | no previous user's businesses/invoices/reminders/**AI chat** anywhere |
| 4 | Settings → change business name + TIN → save | new values visible **immediately** (P0-1) |
| 5 | Settings → upload + remove logo | logo updates via `fetchBusinesses(true)` paths (already force — regression check) |
| 6 | Sales: flip pages/filters rapidly on throttled network | newest request wins; no stale-row flash (P0-3) |
| 7 | Create/edit/delete a sale → open Dashboard | numbers update within ~1 s (invalidation bus intact) |
| 8 | Invoice: draft → send → mark paid → cancel a draft | status badges, linked sale on dashboard, WhatsApp share on mobile *and* desktop, copy-link, PDF download |
| 9 | Account: DVA setup → BVN validation (test env) | 10 s polling works, success toast, transactions list; verify/reclassify a transfer → **label format identical before/after** (P3-2 mapper dedupe) |
| 10 | Account: change settlement bank | resolve → connect → `fetchBusinesses(true)` shows new bank |
| 11 | Tax: calculate → finalize → Pay Now (test mode) → pay → lock | status chain correct, Payments page shows remittance, receipt PDF downloads |
| 12 | Reminders: open bell → mark read / dismiss (with network killed) | optimistic UI reverts with toast |
| 13 | Command palette (⌘K): search invoices/customers, switch business, esc/enter | unchanged |
| 14 | Landing on mobile 4G | LCP improvement (P1-2); animations identical in default mode; `prefers-reduced-motion` respected (P1-5) |
| 15 | i18n: toggle English ↔ Pidgin on a mid-session page | labels switch, no key leaks |

## 7. Success metrics (measure before/after each phase)

- **TTFB-independent:** Lighthouse mobile (Slow 4G) on `/` and `/dashboard`: LCP, TBT, Total JS gz transferred.
- **Targets:** dashboard first-screen JS −40–60 KB gz (P1); landing transfer −600 KB (P1-2); requests on the login→dashboard path ≤ 8 (P0-4 + P2-1); zero `exhaustive-deps` warnings in `stores/*` + list pages (P0-3/P3-6).
- **Guardrail metrics:** 0 behavioral diffs in the QA matrix; `vendor-charts` still lazy-loadable; no new CLS on landing (explicit img dimensions).

## 8. Rollback & process

- Every item is a separate commit; every phase is a separate PR. Phase 3 items are individually revertable by design (pure extraction).
- Nothing in this plan touches: token refresh, Paystack redirect flow, invoice send/mark-paid endpoints, the store `clear()` contract, or the invalidation-bus event names.
- If a "safe" item (P1-3, P3-5) shows any UX regression in QA, revert that item and re-baseline — the rest of the plan does not depend on it.

## 9. Appendix — verified inventory

**Dead code (zero importers, verified by grep across `src`):** `AnimatedCounter.tsx` (56 L), `HandDrawnArrow.tsx` (64 L), `HandDrawnCircle.tsx`, `DVADiagnostics.tsx` (310 L, referenced only in a Dashboard comment), `hooks/useRequireAuth.ts` (24 L), `PinModal.tsx` (221 L), `pages/Dashboard.backup-2026-08-15-original.tsx` (1,314 L, **compiled today**), `Dashboard.tsx`'s `showQR` state (unreachable modal).

**Lint baseline (2026-08-28):** 96 problems — 78 errors (predominantly `@typescript-eslint/no-explicit-any` in `catch` blocks + `Settings`'s `user: any`/`biz: any`), 18 warnings (7× `react-hooks/exhaustive-deps` in `PinModal`, `NotificationBell`, `AIAssistant`, `Reminders`, `TaxReports`, `TestTransferSimulator`, `AdminUsers`; remainder unused-import/other).

**Bundle baseline (2026-08-28, `npm run build`):** see §2. Fonts: 31 woff2 / 484 KB (10 latin, 10 cyrillic, 6 greek, 5 vietnamese). CSS: 168 KB / 22.7 KB gz.

**`localStorage` keys (audit for logout):** `accessToken`, `refreshToken`, `activeBusinessId` (cleared ✓), `lang` (keep ✓), `ai_chat_<bizId>` (✗ — P0-2).
