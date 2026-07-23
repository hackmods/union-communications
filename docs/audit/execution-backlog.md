# UnionOps — Execution Backlog

Generated 2026-07-22 from a four-domain codebase audit (see `executive-summary.md`, `active-context.md`). Every file path below was verified against `git ls-files` before being recorded. Tickets are grouped by category, ordered by severity within each group. Use this as the source backlog for sprint planning; cross-reference `docs/ROADMAP.md` Phase 6/7 for sequencing dependencies (most `SEC-0xx` and `FEAT-0xx` tickets below are pre-requisites for, or components of, the already-planned "Postgres + RLS" and "Multi-union onboarding" milestones).

---

## SECURITY (`SEC-`)

### [SEC-001]
**Category:** Security
**Severity/Priority:** Critical
**Problem/Gap Statement:** MFA can be bypassed entirely from an authenticated client. `POST /api/mfa/verify` validates the code but never writes `mfaVerified` into the server-side session/JWT — the client sets that flag itself via NextAuth's `session.update({ mfaVerified: true })` call after receiving `{ success: true }`. Any authenticated browser session can call `update()` directly (e.g. from devtools or a modified client) and unlock grievance/bumping/time modules without ever calling `/api/mfa/verify`.
**Affected Architecture/Files:** `src/app/api/mfa/verify/route.ts`, `src/app/[locale]/app/mfa/page.tsx`, `src/auth.config.ts` (`jwt()` callback, `trigger === "update"` branch)
**Implementation Blueprint:**
1. Have `/api/mfa/verify` mint or update a short-lived server-signed marker (e.g. re-issue the JWT via a NextAuth `unstable_update`/database session, or store a per-session "mfa verified at" timestamp in a server-side store keyed by session id) instead of trusting a client-supplied flag.
2. Change `src/auth.config.ts`'s `jwt()` callback to only accept `mfaVerified` transitions that originate from a trusted server call (e.g. check a signed nonce or re-derive from a server-side MFA-state store), never directly from arbitrary `session.update()` payloads.
3. Add a unit/integration test that calls `session.update({ mfaVerified: true })`-equivalent without a valid `/api/mfa/verify` call and asserts the confidential module APIs still reject the request.
4. Apply the same pattern to `localId`/`bargainingUnitId` context-switch updates (see SEC-005).

### [SEC-002]
**Category:** Security
**Severity/Priority:** Critical
**Problem/Gap Statement:** MFA for "highly confidential" grievance/bumping data (per ADR-009, `docs/RBAC.md`) is a single shared static 6-digit code for the entire instance (`AUTH_MFA_CODE` / `AUTH_DEV_MFA_CODE`, default literal `"000000"`), not per-user, not TOTP. Any user who knows or guesses the code can "verify MFA" as themselves for any account. `.env.example` doesn't even document the variable, so most self-hosters will run on the `"000000"` default indefinitely.
**Affected Architecture/Files:** `src/app/api/mfa/verify/route.ts`, `.env.example`, `docs/guides/SETUP.md`
**Implementation Blueprint:**
1. Implement per-user TOTP (RFC 6238) — add a `totpSecret` field to the user record, generate/display a QR provisioning URI at first MFA setup, verify submitted codes against the user's own secret (e.g. `otpauth`/`speakeasy`-equivalent, or hand-rolled HMAC-SHA1 TOTP with no new heavy dependency if avoiding new deps is a priority).
2. Keep the shared-code path only behind an explicit, loudly-logged `AUTH_MFA_MODE=shared_code_insecure` opt-in for demo/workshop hosts, and make the default `AUTH_MFA_MODE=totp`.
3. Fail closed in production (`NODE_ENV=production`) if MFA mode is unset — refuse to enable grievance/bumping/time modules rather than silently defaulting to `"000000"`.
4. Document the new variable(s) in `.env.example` and update `docs/guides/SETUP.md`'s stale "MFA accepts any 6-digit code" line (see UX-013 / doc-drift note).

### [SEC-003]
**Category:** Security
**Severity/Priority:** Critical
**Problem/Gap Statement:** All confidential union casework (grievances, bumping cases, time entries, attachment metadata, audit log) lives only in module-scoped in-memory JS arrays with zero disk/DB persistence. `docker/docker-compose.yml` has no database service. Every process restart, redeploy, or crash silently discards all case data, with no warning surfaced to officers using the product.
**Affected Architecture/Files:** `src/lib/grievance/memory-adapter.ts`, `src/lib/bumping/memory-adapter.ts`, `src/lib/time/memory-adapter.ts`, `src/lib/attachments/memory-adapter.ts`, `src/lib/audit/memory-adapter.ts`, `docker/docker-compose.yml`, `docker/entrypoint.sh`
**Implementation Blueprint:**
1. Stand up PostgreSQL with Row-Level Security per ADR-008/ADR-013 (`unionId`/`localId`/optional `bargainingUnitId` policies) — this is already scoped as the Phase 6 headline item in `docs/ROADMAP.md`; this ticket exists to make it a `SEC-` blocker, not just a roadmap line.
2. Introduce a real query/ORM layer (`drizzle-orm` or `pg` + hand-written SQL — no dependency exists yet) behind the *existing* `*Adapter` interfaces (`src/lib/grievance/adapter.ts`, etc.) so route/RBAC code does not need to change.
3. Add a Postgres service to `docker/docker-compose.yml` with a named volume, and update `docker/entrypoint.sh` to run migrations on boot.
4. Until this ships, add a persistent, dismissible-but-recurring UI banner on every Hub page (reuse the existing `DemoSiteBanner.tsx` pattern) stating plainly: "This instance stores case data in memory only — it will be lost on restart. Do not use for real member casework." Gate it off only when a real DB adapter is confirmed active.

### [SEC-004]
**Category:** Security
**Severity/Priority:** Critical
**Problem/Gap Statement:** `AUTH_SECRET` silently falls back to a hardcoded literal (`"dev-secret-change-in-production"`) in both `src/auth.ts` and `src/auth.config.ts` if the environment variable is unset. A misconfigured self-host fails **open** with a publicly-known secret rather than failing to start, allowing anyone to forge valid session JWTs (including arbitrary roles/`unionId`/`localId` claims).
**Affected Architecture/Files:** `src/auth.ts` (line ~9), `src/auth.config.ts` (line ~4), `docker/docker-compose.yml` (hardcoded `AUTH_SECRET: local-docker-auth-secret-change-me`)
**Implementation Blueprint:**
1. Remove the fallback literal; throw a clear startup error when `process.env.AUTH_SECRET` is unset and `NODE_ENV === "production"`.
2. Keep a fallback only for `NODE_ENV === "test"`/local dev, clearly named (`"insecure-test-only-secret"`), never referenced by any production compose file.
3. Update `docker/docker-compose.yml` to require the operator to supply `AUTH_SECRET` via `.env` rather than a hardcoded default (fail the `docker compose up` with a clear error if unset, using Compose's `${AUTH_SECRET:?err message}` syntax).
4. Add a startup self-check (logged at boot) confirming `AUTH_SECRET` length/entropy is reasonable (e.g. ≥32 bytes base64).

### [SEC-005]
**Category:** Security
**Severity/Priority:** High
**Problem/Gap Statement:** A client can change its own session's `localId`/`bargainingUnitId` via NextAuth's `session.update()` (used legitimately by the Hub context switcher for elevated multi-local admins) with no server-side check that the requested value is actually in the user's `accessibleLocalIds` or that their role permits cross-local switching. A non-elevated user could, in principle, set an arbitrary `localId` client-side and have subsequent API calls scope reads/writes to that local.
**Affected Architecture/Files:** `src/auth.config.ts` (`jwt()` callback, `trigger === "update"` branch), `src/components/hub/HubContextSwitcher.tsx`
**Implementation Blueprint:**
1. In the `jwt()` callback's update branch, validate any incoming `localId`/`bargainingUnitId` against the *existing* token's `accessibleLocalIds` and role before accepting the change; reject/ignore otherwise.
2. Add a matching server-side check (not just UI hiding) on every route that reads `session.user.localId` for list-scoping, confirming the value is still consistent with `accessibleLocalIds`.
3. Add a regression test: attempt to switch to a `localId` outside `accessibleLocalIds` and assert the session is unchanged / the request is rejected.

### [SEC-006]
**Category:** Security
**Severity/Priority:** High
**Problem/Gap Statement:** PATCH routes on grievances and bumping cases spread the raw parsed request body directly onto the stored record (`{...existing, ...input}` pattern in the memory adapters) with no field allowlist and no schema validator (no `zod`/`yup`/etc. dependency exists in the repo). A client that includes extra JSON keys in a PATCH body risks overwriting tenant-identity fields (`unionId`, `id`, `localId`) at the adapter layer, even though the RBAC/ACL check happens before the update call.
**Affected Architecture/Files:** `src/lib/grievance/memory-adapter.ts` (update path), `src/lib/bumping/memory-adapter.ts` (update path), `src/app/api/grievances/[id]/route.ts`, `src/app/api/bumping/cases/[id]/route.ts`
**Implementation Blueprint:**
1. Add `zod` (or a hand-written strict allowlist function) as a dependency; define explicit input schemas for `UpdateGrievanceInput` / `UpdateBumpingCaseInput` matching the existing TypeScript types in `src/types/grievance.ts` / `src/types/bumping.ts`.
2. Parse and validate every PATCH/POST body against its schema before calling into the adapter; reject unknown keys.
3. In the adapter update functions, explicitly whitelist the mutable fields rather than spreading the entire input object onto the existing record.
4. Add unit tests asserting a PATCH body containing `{ unionId: "other-union" }` does not change the stored record's `unionId`.

### [SEC-007]
**Category:** Security
**Severity/Priority:** High
**Problem/Gap Statement:** Login is only possible via a hardcoded demo roster with plaintext password comparison (`demo123` for every account). There is no real signup, invite-acceptance, or password-reset flow, despite `docs/RBAC.md`'s "Invitation Flow (Phase 6 onboarding)" describing one. `bcryptjs` is a declared dependency but is never imported/called anywhere in the live auth path.
**Affected Architecture/Files:** `src/lib/auth/demo-users.ts`, `src/auth.ts`, `package.json` (`bcryptjs` dependency)
**Implementation Blueprint:**
1. Build a real user table (Postgres, once SEC-003 lands) with bcrypt-hashed passwords (`bcryptjs.hash`/`compare`), replacing `findDemoUser`'s plaintext check.
2. Implement the invite flow described in `docs/RBAC.md` §"Invitation Flow": `union_admin`/`local_president` creates an invite record → emails a signed accept-link → invitee sets their own password → role assigned per the invite.
3. Keep the demo roster available only behind an explicit `NEXT_PUBLIC_DEMO_SITE=true` gate (already used elsewhere for the demo banner) and never enabled by default for a fresh self-host.
4. Add a password-reset flow (token + expiry) once transactional email exists (tracked separately in `docs/ROADMAP.md`).

### [SEC-008]
**Category:** Security
**Severity/Priority:** Medium
**Problem/Gap Statement:** `next.config.ts` only sets response headers for `/sw.js`. The strong CSP/security headers that exist in `vercel.json` (X-Frame-Options, CSP, referrer/permissions policy) apply **only** to Vercel deployments. Self-hosted CapRover/Docker deployments (the primary supported self-host path per `docs/guides/DEPLOY.md`) get **no CSP at all** unless the operator's own reverse proxy happens to add one — which the deploy guide does not instruct them to do.
**Affected Architecture/Files:** `next.config.ts`, `vercel.json`, `docs/guides/DEPLOY.md`
**Implementation Blueprint:**
1. Move the CSP/security-header definitions from `vercel.json` into `next.config.ts`'s `headers()` function so they apply on every deployment target, not just Vercel.
2. Tighten the existing CSP: remove `'unsafe-inline'`/`'unsafe-eval'` from `script-src` where possible (audit inline scripts — the preferences FOUC script noted in `active-context.md` §10 is a likely offender and would need a nonce or hash), and add missing directives (`object-src 'none'`, `base-uri 'self'`, `form-action 'self'`, `worker-src 'self'`).
3. Add a note in `docs/guides/DEPLOY.md` confirming CSP is application-level (works on CapRover/Docker/Vercel identically) once this ships.

### [SEC-009]
**Category:** Security
**Severity/Priority:** Medium
**Problem/Gap Statement:** The Hybrid export/import API (`GET /api/hybrid/slice`) returns **plaintext** JSON over the authenticated MFA session; the client encrypts it afterward before saving to disk. This is documented/intentional (server never stores the passphrase), but it means the plaintext grievance/bumping slice transits the network and briefly exists unencrypted in browser memory/JS heap — worth explicitly documenting as a residual risk rather than leaving implicit.
**Affected Architecture/Files:** `src/app/api/hybrid/slice/route.ts`, `src/lib/hybrid/encrypt.ts`, `docs/modules/GRIEVANCE.md` (Hybrid mode section)
**Implementation Blueprint:**
1. Document explicitly in `docs/COMPLIANCE.md` and the Hybrid UI (`/app/hybrid`) that the export transits as plaintext over TLS and is encrypted client-side only after receipt — this is by design (server never learns the passphrase) but should be stated, not implied.
2. Consider adding `Cache-Control: no-store` and confirming no server-side logging captures the response body for this route.
3. No code change required if TLS is enforced end-to-end in deployment guides — cross-check `docs/guides/DEPLOY.md` explicitly requires HTTPS (`AUTH_URL` uses `https://` in production).

### [SEC-010]
**Category:** Security
**Severity/Priority:** Low
**Problem/Gap Statement:** Two environment example files exist with different philosophies: `.env.example` (blank `AUTH_SECRET=`, referenced by `docs/guides/SETUP.md`) and `env.example` (pre-filled with the literal `dev-secret-change-in-production`, not referenced by docs). A self-hosting operator who copies the wrong one, or who is unaware of the second file, could deploy with the known placeholder secret from SEC-004.
**Affected Architecture/Files:** `.env.example`, `env.example`
**Implementation Blueprint:**
1. Delete the redundant `env.example` (or clearly mark it deprecated with a comment pointing to `.env.example`) to remove ambiguity.
2. Ensure the remaining canonical file never contains a real-looking secret value, only a comment instructing `openssl rand -base64 32` (as `.env.example` already does).

---

## RBAC (`RBAC-`)

### [RBAC-001]
**Category:** RBAC
**Severity/Priority:** High
**Problem/Gap Statement:** `canDeleteSharedContent(roles, ownerId, userId)` in `src/lib/qol/access.ts` correctly implements "owner or elevated officer" logic, but the CA-snippet delete route does not call it — any user who passes `canManageQolContent` (which includes every `local_steward`) can delete **any** union's snippets, not just their own. The marketplace delete route has its own separate inline check that omits `division_admin`, diverging from the shared helper.
**Affected Architecture/Files:** `src/app/api/snippets/[id]/route.ts` (DELETE), `src/app/api/marketplace/[id]/route.ts` (DELETE), `src/lib/qol/access.ts`
**Implementation Blueprint:**
1. Update the snippet `DELETE` handler to call `canDeleteSharedContent(roles, snippet.createdById, session.user.id)` instead of (or in addition to) `canManageQolContent`.
2. Update the marketplace `DELETE` handler to use the same shared `canDeleteSharedContent` helper instead of its bespoke inline check, so `division_admin` is included consistently.
3. Add unit tests: a non-owner `local_steward` should be rejected from deleting another steward's snippet; a `local_president`/`division_admin` should be allowed.

### [RBAC-002]
**Category:** RBAC
**Severity/Priority:** Medium
**Problem/Gap Statement:** There is no single enforced choke point for `/app/*` server-rendered pages (see `active-context.md` §3) — `src/proxy.ts` handles most, but confidential-looking pages like `/app/audit` are plain client components gated only by `useSession()`. Data is still protected at the API layer today, but this pattern is fragile: a future page that fetches data during SSR (rather than via a client `useEffect` + `fetch`) would have no equivalent protection.
**Affected Architecture/Files:** `src/proxy.ts`, `src/app/[locale]/app/audit/page.tsx`, `src/app/[locale]/app/page.tsx`
**Implementation Blueprint:**
1. Convert `/app/audit/page.tsx` and the Hub dashboard `page.tsx` to Server Components that call `auth()` directly and `redirect()` server-side when unauthenticated/unauthorized, rather than relying purely on client-side `useSession()` + `useEffect` redirect.
2. Write an architecture test (e.g. a small script or ESLint rule) that fails CI if a new file under `src/app/[locale]/app/**/page.tsx` is added without either a server-side `auth()` call or an explicit documented exception.
3. Update `docs/ARCHITECTURE.md` to describe `src/proxy.ts`'s actual matcher/behavior instead of the stale "Middleware protects `/app/*`" line.

### [RBAC-003]
**Category:** RBAC
**Severity/Priority:** Low
**Problem/Gap Statement:** `docs/RBAC.md`'s permissions matrix and hard rules are well-specified, but there is no automated test suite that asserts the matrix against the actual `access.ts` functions across all modules in one place — today's tests (`src/lib/grievance/grievance.test.ts`, `src/lib/bumping/bumping.test.ts`, `src/lib/time/time.test.ts`) cover each module individually but not as a single cross-module contract.
**Affected Architecture/Files:** `docs/RBAC.md`, `src/lib/grievance/access.ts`, `src/lib/bumping/access.ts`, `src/lib/time/access.ts`, `src/lib/qol/access.ts`
**Implementation Blueprint:**
1. Add a single `src/lib/rbac-matrix.test.ts` that encodes the `docs/RBAC.md` permissions table as data and asserts each module's `access.ts` functions against every role.
2. Fail CI if `docs/RBAC.md` and the test's encoded matrix diverge (or add a comment linking the two so a docs change reminds the author to update the test).

---

## FEATURE PARITY (`FEAT-`)

### [FEAT-001]
**Category:** Feature Parity
**Severity/Priority:** High
**Problem/Gap Statement:** There is no shared document/file vault anywhere in the platform. `AttachmentMeta` (`src/types/attachments.ts`) is metadata-only with `storageKey` set to a `memory://` placeholder — file bytes are never durably stored. Locals have nowhere to keep CBAs, meeting minutes, or scanned grievance evidence beyond ad-hoc external tools, despite this being a headline "Basecamp parity" expectation.
**Affected Architecture/Files:** `src/types/attachments.ts`, `src/lib/attachments/memory-adapter.ts`, `src/lib/attachments/scan.ts`, `src/app/api/grievances/[id]/attachments/route.ts`
**Implementation Blueprint:**
1. Add S3-compatible object storage integration (MinIO for self-host, S3/R2 for cloud) behind the existing `AttachmentMeta.storageKey` field — swap the memory adapter for a real upload/download-URL flow (signed PUT/GET URLs).
2. Wire a real virus scanner (ClamAV via a sidecar container is the most self-host-friendly option) into `src/lib/attachments/scan.ts`, replacing the EICAR-sniff stub; keep `skipped_dev` only for local dev without the scanner running.
3. Build a general-purpose "Documents" area per Local/Collection (not just grievance-attached files) so CBAs and meeting minutes have a home independent of a specific grievance — this is new UI + a new `unionId`/`localId`-scoped entity, not just an extension of `AttachmentMeta`.
4. Add encryption-at-rest for the object storage bucket/volume (SSE-S3 minimum, customer-managed keys as a stretch goal) given the "highly confidential" classification in `docs/COMPLIANCE.md`.

### [FEAT-002]
**Category:** Feature Parity
**Severity/Priority:** High
**Problem/Gap Statement:** No message-board / threaded-discussion feature exists anywhere. `CaSnippet` and `SharedTemplate` are content libraries (create/list/delete), not discussions — no replies, no threading, no @mentions, no notifications. Officers have no in-product way to discuss a grievance, a bumping case, or general local business asynchronously.
**Affected Architecture/Files:** `src/lib/snippets/memory-adapter.ts`, `src/lib/marketplace/memory-adapter.ts` (nearest existing analogues), `src/types/qol.ts`
**Implementation Blueprint:**
1. Design a new `DiscussionThread` / `DiscussionPost` entity scoped by `unionId`/`localId`/optional `bargainingUnitId`, optionally attached to a `grievanceId`/`bumpingCaseId`, or standalone ("local business").
2. Ship a minimal v1: create thread, reply, list by recency — no reactions/boosts yet — as a new Hub module (`"discussions"` in `HubModule`, added to `src/lib/modules/registry.ts` following the existing `comms|grievance|bumping|time` pattern).
3. Reuse the existing RBAC pattern (`requireGrievanceSession`-style gate) scoped to the new module; grievance-attached threads should inherit grievance view/edit ACL via `canViewGrievance`/`canEditGrievance`.
4. Defer real-time (websocket) delivery — poll-on-load is acceptable for v1 given the platform's existing "no third-party services" posture.

### [FEAT-003]
**Category:** Feature Parity
**Severity/Priority:** Medium
**Problem/Gap Statement:** There is no general to-do/task list feature. The only task-like structures are the static handoff checklist (`src/lib/handoff/package.ts`) and per-grievance `GrievanceEvent` timeline entries — neither supports assigning an arbitrary task to an officer with a due date outside the grievance/handoff context.
**Affected Architecture/Files:** `src/lib/handoff/package.ts`, `src/types/qol.ts`
**Implementation Blueprint:**
1. Add a `Task` entity (`id, unionId, localId, bargainingUnitId?, title, assigneeId, dueAt?, status: open|done, relatedGrievanceId?, relatedBumpingCaseId?, createdById, createdAt`).
2. Ship CRUD API (`/api/tasks`) following the existing memory-adapter → (future) DB-adapter pattern, and a simple list UI on the Hub dashboard ("My tasks" widget) plus a full `/app/tasks` board.
3. Allow tasks to optionally attach to a grievance/bumping case (surfaced on the case detail page) or stand alone for general local business.
4. RBAC: any hub role can create/self-assign; only assignee or elevated roles can mark complete/reassign — mirror the `canEditGrievance` local_exec-can-view-but-not-edit pattern.

### [FEAT-004]
**Category:** Feature Parity
**Severity/Priority:** Medium
**Problem/Gap Statement:** The Grievance module has no structured arbitration outcome, settlement-terms, or appeal-deadline entity. Step 4 ("Arbitration") in the reference CAConfig seed has `responseDays: null`, meaning no deadline is ever computed for it, and there is no way to record the arbitrator's decision, remedy granted, or settlement terms in a queryable field — only free-text notes.
**Affected Architecture/Files:** `src/types/grievance.ts`, `seed/reference-tenant-opseu-caat.json`, `src/lib/grievance/deadlines.ts`
**Implementation Blueprint:**
1. Add a `GrievanceOutcome` type: `{ id, grievanceId, outcomeType: "upheld"|"denied"|"settled"|"withdrawn", remedy?, settlementTerms?, arbitratorName?, hearingDate?, decidedAt, recordedById }`, mirroring the structure `DecisionRecord` already establishes in the bumping module.
2. Extend `CAConfig`/`GrievanceStep` to optionally support a fixed or negotiated appeal-deadline window for the arbitration step rather than leaving `responseDays: null` un-actionable.
3. Surface outcome recording in the grievance detail UI, gated by the same edit ACL as other grievance mutations.
4. Include the outcome in the export bundle (`src/lib/grievance/export.ts`) for arbitration-ready packages.

### [FEAT-005]
**Category:** Feature Parity
**Severity/Priority:** Medium
**Problem/Gap Statement:** The College Bumping module cannot compute seniority-based bumping eligibility or cascading displacement chains — `seniorityDate` is a stored string with no comparison logic, and there is no member seniority roster or vacancy/posting entity. The module is effectively a committee note-taking + PDF-diff aid, not a bumping *calculator*, despite the module name implying otherwise.
**Affected Architecture/Files:** `src/types/bumping.ts`, `src/lib/bumping/memory-adapter.ts`, `src/lib/bumping/diff.ts`
**Implementation Blueprint:**
1. Add a `MemberSeniorityRecord` entity (`memberRef, unionId, localId, seniorityDate, classification, active`) as a queryable roster, separate from individual `BumpingCase` rows.
2. Add a `VacancyPosting` entity (`positionTitle, classification, postedAt, requirements`) so a bumping case can reference the actual vacancy being contested.
3. Implement a pure, testable seniority-comparison function (`compareSeniority(a, b): -1|0|1` and `rankEligibleBumpers(vacancy, roster): MemberSeniorityRecord[]`) that surfaces a **suggested** eligibility order in the UI — explicitly labeled as an aid, not a binding decision, consistent with the existing "not legal advice" disclaimer in `docs/modules/COLLEGE_BUMPING.md`.
4. Keep `DecisionRecord` as the final, human-entered record of what the committee actually decided — the calculator informs, it does not replace, committee judgment.

### [FEAT-006]
**Category:** Feature Parity
**Severity/Priority:** Low
**Problem/Gap Statement:** There is no shared org-wide calendar/schedule feature — only per-grievance `ScheduledMeeting` (+ ICS export) and public-facing Comms event ICS exist. Officers cannot see a unified view of upcoming grievance meetings, bumping committee sessions, and general local events in one place.
**Affected Architecture/Files:** `src/types/qol.ts` (`ScheduledMeeting`), `src/lib/calendar/event-ics.ts`, `src/types/bumping.ts` (`CommitteeSession`)
**Implementation Blueprint:**
1. Add a `/app/calendar` view that aggregates `ScheduledMeeting` (grievance) + `CommitteeSession` (bumping) + (once FEAT-002/003 ship) discussion/task due-dates into one union/local-scoped list, sorted by date.
2. Reuse the existing ICS export helper (`event-ics.ts`) to offer a single "subscribe" ICS feed per officer (filtered by their accessible locals/roles) rather than per-item export only.
3. This is explicitly deferred behind Postgres in `docs/ROADMAP.md`/`docs/modules/CALENDAR_MEETINGS.md`'s "Deferred" section for the *public* meeting-reminder feature — this ticket scopes only the *authenticated Hub* read-only aggregation view, which does not require new persistence beyond what already exists.

---

## UX (`UX-`)

### [UX-001]
**Category:** UX
**Severity/Priority:** High
**Problem/Gap Statement:** There are zero Next.js `error.tsx`, `loading.tsx`, or `not-found.tsx` files anywhere under `src/app/` (confirmed via full-repo search), and no shared `<ErrorBoundary>` component exists. An unhandled exception in any Hub route (grievances, bumping, time, audit) falls through to Next.js's generic error UI with no union-branded messaging, no "what to do next" guidance, and no automatic error reporting hook.
**Affected Architecture/Files:** `src/app/[locale]/app/**` (all Hub routes), `src/app/[locale]/layout.tsx`
**Implementation Blueprint:**
1. Add `src/app/[locale]/app/error.tsx` (client component, receives `error`/`reset`) with branded copy in EN/FR and a "try again" / "sign out" action.
2. Add `src/app/[locale]/app/loading.tsx` using a new shared `Skeleton` primitive (see UI-005) instead of route-level blank flashes.
3. Add a top-level `src/app/[locale]/error.tsx` for public Comms routes too, matching the tone of the rest of the site.
4. Add `not-found.tsx` at both levels for consistent 404 handling with EN/FR copy and a link back to the tool catalog / Hub dashboard.

### [UX-002]
**Category:** UX
**Severity/Priority:** Medium
**Problem/Gap Statement:** Loading and empty states across the Hub are ad-hoc, inconsistent plain-text (`<p>{t("loading")}</p>`, `…`, or gray `<p>` empty copy) with no shared visual language — grievances, bumping, time, and audit each hand-roll their own version. There is no shared `Skeleton` or `EmptyState` component in `src/components/ui/` (which only has `Button`, `Input`, `Card`, `Callout`, `Emoji` — five files total).
**Affected Architecture/Files:** `src/components/ui/*` (missing `Skeleton.tsx`, `EmptyState.tsx`), `src/components/grievance/GrievanceDashboard.tsx`, `src/components/bumping/BumpingDashboard.tsx`, `src/components/time/TimeDashboard.tsx`, `src/app/[locale]/app/audit/page.tsx`
**Implementation Blueprint:**
1. Add `src/components/ui/Skeleton.tsx` (simple pulsing block primitive, respects `prefers-reduced-motion` per the existing accessibility preferences system) and `src/components/ui/EmptyState.tsx` (icon/illustration slot + heading + body + optional CTA button, i18n-ready).
2. Replace every ad-hoc `{loading && <p>...</p>}` / gray-text empty block across grievance/bumping/time/audit/snippets/marketplace/handoff components with the new shared primitives.
3. Add Storybook-less visual smoke coverage (a Playwright screenshot or simple render test) to prevent regressions to bespoke one-off patterns going forward.

### [UX-003]
**Category:** UX
**Severity/Priority:** Medium
**Problem/Gap Statement:** The `ContrastChecker` widget shown on Flyer Maker and Graphic Maker hardcodes a `#FFFFFF` comparison background regardless of the tool's actual computed ink color (which is correctly auto-picked via `pickContrastingInk` elsewhere in the same tools). This can show a misleading pass/fail relative to what will actually render and export, undermining user trust in the accessibility tooling.
**Affected Architecture/Files:** `src/app/[locale]/tools/flyer-maker/page.tsx`, `src/app/[locale]/tools/graphic-maker/page.tsx`, `src/components/tools/ContrastChecker.tsx`
**Implementation Blueprint:**
1. Change both call sites to pass the tool's actual computed ink color (the same value passed to `pickContrastingInk` for the live canvas) into `ContrastChecker` instead of a hardcoded white.
2. Add a unit test asserting `ContrastChecker`'s displayed pass/fail matches a manually-computed WCAG contrast ratio for a few known brand-color pairs.
3. Audit `quote-card/page.tsx` (which the comms-tools review found already does this correctly) as the reference implementation to copy from.

### [UX-004]
**Category:** UX
**Severity/Priority:** Medium
**Problem/Gap Statement:** Brand Kit colour selection is only advisory for accessibility — `ContrastChecker` displays a pass/fail `role="status"` message, but nothing blocks saving a Brand Kit with primary/secondary/accent colours that fail WCAG AA contrast against the text/background they'll actually be used with. Locals can unknowingly ship low-contrast materials.
**Affected Architecture/Files:** `src/lib/utils/ink.ts`, `src/store/brand-store.ts`, `src/components/brand/LogoSettings.tsx` (or wherever Brand Kit save is triggered)
**Implementation Blueprint:**
1. On Brand Kit save, run the existing `coloursClash`/contrast helpers against the saved primary/secondary/accent combination.
2. If a failure is detected, show a non-blocking confirmation dialog ("This colour combination may be hard to read — save anyway?") rather than silently allowing it or hard-blocking (unions may have fixed institutional colours they must use regardless of contrast score).
3. Surface the same warning inline in the Brand Kit editor UI, not just at save time.

### [UX-005]
**Category:** UX
**Severity/Priority:** Low
**Problem/Gap Statement:** `src/app/sitemap.ts`'s guide-path list includes individual sub-guides but appears to omit the bare `/guide` index route from its bilingual alternates, per the UI/UX review of that file (verify against current `PUBLIC_PATHS` array before implementing, since this specific claim came from a sub-agent pass rather than a full line-by-line audit of that file).
**Affected Architecture/Files:** `src/app/sitemap.ts`
**Implementation Blueprint:**
1. Read `src/app/sitemap.ts`'s `PUBLIC_PATHS` (or equivalent) array and confirm whether `/guide` (the Blueprint/Guides index) is present alongside its sub-routes.
2. If missing, add it with the same bilingual-alternates pattern used for the other guide routes.
3. Add a unit test asserting the generated sitemap always includes every top-level route under `src/app/[locale]/guide/` automatically (derive from the filesystem rather than a hand-maintained array, to prevent future drift).

---

## UI / MEDIA (`UI-`)

### [UI-001]
**Category:** UI/Media
**Severity/Priority:** Medium
**Problem/Gap Statement:** `src/components/ui/` contains only five primitives (`Button`, `Input`/`Textarea`, `Card`, `Callout`, `Emoji`) — there is no shared `Select`, `Checkbox`, `Radio`, `Dialog`/`Modal`, `Toast`, `Badge`, or `Tabs` component. This drives raw, one-off `<input>`/`<button>` usage in data-dense Hub screens (e.g. `TimeDashboard.tsx` has ~16 raw `<input>` elements) instead of a consistent, accessible, reusable control set.
**Affected Architecture/Files:** `src/components/ui/*`, `src/components/time/TimeDashboard.tsx`, `src/app/[locale]/tools/document-generator/page.tsx`
**Implementation Blueprint:**
1. Add `Select.tsx`, `Checkbox.tsx`, `Radio.tsx`, `Dialog.tsx`, `Badge.tsx` to `src/components/ui/`, matching the existing `Button`/`Input` conventions (labeled, `useId()`-based association, focus-visible rings, EN/FR-ready via children/props rather than hardcoded copy).
2. Migrate `TimeDashboard.tsx` and `document-generator/page.tsx` form fields to the new primitives as the first consumers, to validate the API before wider rollout.
3. Add each new primitive to whatever lightweight visual-regression/unit test pattern the existing `Button`/`Input` components use, if any, or establish one.

### [UI-002]
**Category:** UI/Media
**Severity/Priority:** Medium
**Problem/Gap Statement:** The authenticated Hub (`src/app/[locale]/app/**`, and components under `src/components/{grievance,bumping,time,qol}/**` excluding the more mobile-aware `TimeDashboard.tsx`) has sparse Tailwind responsive breakpoint usage compared to the public Comms canvas tools, which are consistently built mobile-first via `ToolEditorLayout`. Stat blocks and list views in grievance/bumping dashboards skew desktop-linear.
**Affected Architecture/Files:** `src/components/grievance/GrievanceDashboard.tsx`, `src/components/bumping/BumpingDashboard.tsx`, `src/app/[locale]/app/layout.tsx`
**Implementation Blueprint:**
1. Audit `GrievanceDashboard.tsx` and `BumpingDashboard.tsx` stat/list layouts and add `sm:`/`md:` grid breakpoints matching the density `TimeDashboard.tsx` already achieved (per `.cursor/rules/roadmap-next.mdc`'s "Steward mobile read-only" goal — stewards are explicitly expected to use these screens on shop-floor phones).
2. Add `@mobile` Playwright coverage (the project already has an `@mobile` tag pattern used for canvas tools) for the grievance/bumping/time dashboards specifically.
3. Cross-reference `.cursor/rules/responsive-layouts.mdc` for the project's existing responsive conventions before making changes, to stay consistent with intent already documented there.

### [UI-003]
**Category:** UI/Media
**Severity/Priority:** Medium
**Problem/Gap Statement:** Axe-core accessibility smoke coverage (`e2e/smoke.spec.ts`, `e2e/builders.smoke.spec.ts`) exercises only a handful of pages (home, guide index, `/accessibility`, `/brand-kit`, `/app/login`, graphic-maker, logo-builder, print guide). No authenticated Hub route (grievances, bumping, time, audit, handoff, marketplace, snippets, overdue, hybrid) has any axe coverage, and most canvas tools beyond graphic-maker/logo-builder are also unscanned.
**Affected Architecture/Files:** `e2e/smoke.spec.ts`, `e2e/builders.smoke.spec.ts`
**Implementation Blueprint:**
1. Add axe-core scans (serious+critical, matching the existing pattern) for at least one representative authenticated page per Hub module: `/app/grievances`, `/app/bumping`, `/app/time`, `/app/audit`, `/app/handoff` — using the project's existing demo-login E2E helper (`e2e/helpers/auth.ts`) to authenticate first.
2. Extend the canvas-tool axe list to cover the remaining tools not yet scanned (board-notice, flyer-maker, QR tools, website-template, document-generator, solidarity-poster, meeting-background, board-banner).
3. Gate these new scans behind the existing `@smoke` tag so they run in the standard `npm run test:smoke` pass without needing a separate CI job.

### [UI-004]
**Category:** UI/Media
**Severity/Priority:** Low
**Problem/Gap Statement:** No `next/font` usage anywhere — `globals.css` declares `--font-sans: system-ui, -apple-system, "Segoe UI", Roboto, sans-serif`, a pure system-font stack with no self-hosted webfont, no font-loading strategy, and no documented CLS/font-metric control. This may be an intentional "no third-party asset loading" privacy choice (consistent with ADR-006's "no analytics, cookies, third-party scripts, or network calls") rather than an oversight — confirm intent before treating as a defect.
**Affected Architecture/Files:** `src/app/globals.css`, `src/app/layout.tsx`
**Implementation Blueprint:**
1. Confirm with the product owner whether the system-font stack is an intentional zero-external-request decision (likely, given ADR-006) or an oversight.
2. If intentional: document it explicitly as a decision in `docs/DECISIONS.md` (a new ADR) so future contributors don't "fix" it by adding a Google Fonts import that would violate ADR-006.
3. If a self-hosted brand typeface is desired later, use `next/font/local` (bundles the font file with the app, no external request) rather than `next/font/google`, to preserve the zero-third-party-request posture.

### [UI-005]
**Category:** UI/Media
**Severity/Priority:** Low
**Problem/Gap Statement:** Canvas tool previews are styled `<div>` trees (not `<canvas>`/SVG), which is good for keeping text content in the DOM, but none of them expose a `role="img"` + accessible name summarizing the composed graphic for screen-reader users navigating past the preview region — a screen reader will read through dozens of individually-styled text nodes rather than getting one coherent description.
**Affected Architecture/Files:** `src/components/tools/ToolEditorLayout.tsx`, representative canvas components (`BoardTrimCanvas.tsx`, graphic-maker/flyer-maker canvas layouts, `solidarity-poster/page.tsx`)
**Implementation Blueprint:**
1. Add an optional `previewAccessibleName` prop to `ToolEditorLayout` that wraps the preview region in a labeled `<figure role="group" aria-label="...">` (avoid `role="img"` on a DOM tree with real focusable/text content — `group`/`figure` with `aria-label` is more correct for a composite live region).
2. Populate `previewAccessibleName` per tool with a short dynamic summary (e.g. "Flyer preview: [headline] on [primary colour] background") generated from the tool's own state.
3. Verify with a screen reader (NVDA/VoiceOver) that navigating past the preview announces the summary rather than reading every internal node individually (consider `aria-live="off"` + programmatic focus management rather than fully hiding content with `aria-hidden`, to avoid regressing the "text stays in DOM" positive noted in this audit).

---

## COMMS TOOLS (`TOOL-`)

### [TOOL-001]
**Category:** Comms Tools
**Severity/Priority:** High
**Problem/Gap Statement:** `src/lib/data/local-storage-adapter.ts` does not wrap `localStorage.getItem`/`setItem` calls in try/catch. In Safari private browsing (which throws on `setItem`) or when the browser's storage quota is exceeded, saving or loading the Brand Kit throws an unhandled exception rather than failing gracefully — a volunteer communicator using a locked-down or low-storage device could lose their in-progress Brand Kit edits with a crashed UI and no error message.
**Affected Architecture/Files:** `src/lib/data/local-storage-adapter.ts`, `src/store/brand-store.ts`
**Implementation Blueprint:**
1. Wrap every `localStorage.getItem`/`setItem`/`removeItem` call in the adapter in try/catch; on failure, return `null` for reads and resolve (not reject) for writes while surfacing a non-fatal warning.
2. Add a lightweight in-memory fallback cache in the adapter so a save that fails to persist still keeps the current session's data available (degrades to session-only rather than fully failing).
3. Surface a one-time, dismissible toast/banner in the Brand Kit UI when a save fails ("Your browser blocked saving — changes will be lost when you close this tab") instead of the current silent/crash behavior.
4. Add unit tests that mock `localStorage.setItem` to throw `QuotaExceededError`/`SecurityError` and assert the adapter degrades gracefully rather than throwing out of `saveBrandKit()`.

### [TOOL-002]
**Category:** Comms Tools
**Severity/Priority:** High
**Problem/Gap Statement:** Export failures are silent on most canvas tools. `solidarity-poster/page.tsx`, `flyer-maker/page.tsx`, and others call the PNG/PDF export helpers with no try/catch around the async export call — if `html-to-image` throws (e.g. a cross-origin image in the composition, or a WebKit rendering quirk), the user sees no error, no loading indicator resolution, and no explanation for why nothing downloaded. `board-banner/page.tsx`'s multi-sheet export additionally has a `continue`-on-null-blob path that silently drops failed sheets from a multi-page kit without warning the user a sheet is missing.
**Affected Architecture/Files:** `src/app/[locale]/tools/solidarity-poster/page.tsx`, `src/app/[locale]/tools/flyer-maker/page.tsx`, `src/app/[locale]/tools/board-banner/page.tsx`, `src/lib/export/image-export.ts`, `src/lib/export/pdf-export.ts`
**Implementation Blueprint:**
1. Add a shared `useExportHandler()` hook (or a wrapper function in `image-export.ts`) that standardizes try/catch around every export call, sets a `exportError` state, and returns/throws a user-readable message.
2. Adopt this wrapper across every canvas tool page (`solidarity-poster`, `flyer-maker`, `board-notice`, `quote-card`, `qr-card`, `qr-board`, `board-banner`, `meeting-background`) — use the tools that already handle this correctly (`logo-builder`, `resizer`, `document-generator`, per the comms-tools audit) as the reference pattern.
3. Fix `board-banner/page.tsx`'s multi-sheet export to collect failed-sheet names and show a summary ("3 of 4 sheets exported — Side Rail failed, try again") instead of silently continuing.
4. Add a `Callout` (existing shared component) error state to `ToolEditorLayout` that any tool can populate on export failure, for visual consistency.

### [TOOL-003]
**Category:** Comms Tools
**Severity/Priority:** Medium
**Problem/Gap Statement:** The PWA offline shell (`public/sw.js`, `src/lib/pwa/shell.ts`) precaches and falls back to `/en/` only — French-locale users get a degraded or broken offline/install experience, since the service worker's navigation fallback always resolves to the English shell regardless of the user's locale.
**Affected Architecture/Files:** `public/sw.js`, `src/lib/pwa/shell.ts`, `src/app/manifest.ts` (`start_url`)
**Implementation Blueprint:**
1. Precache both `/en/` and `/fr/` shells in `public/sw.js`, and make the navigation-fallback logic choose based on the request URL's locale prefix (or the last-known locale, stored via a simple cache entry) instead of hardcoding `/en/`.
2. Make `src/app/manifest.ts`'s `start_url` locale-aware — derive it from the request's `Accept-Language`/cookie rather than a fixed `/en/`.
3. Add a unit test (extending the existing `shell.test.ts` pattern) asserting both locale shells are present in the precache list and that the fallback picks the correct one for `/fr/...` navigation failures.

### [TOOL-004]
**Category:** Comms Tools
**Severity/Priority:** Medium
**Problem/Gap Statement:** `html-to-image` is statically imported at the top of `src/lib/export/image-export.ts` (and `jsPDF` similarly in `pdf-export.ts`), unlike the office-export libraries (`pizzip`, `exceljs`, `pptxgenjs`) which are correctly dynamic-imported. Every route that imports `image-export.ts` — i.e. nearly every canvas tool page — pulls the full `html-to-image` library into its client bundle even if the user never clicks export.
**Affected Architecture/Files:** `src/lib/export/image-export.ts`, `src/lib/export/pdf-export.ts`
**Implementation Blueprint:**
1. Convert the top-level `import { toBlob, toPng, toSvg } from "html-to-image"` and the `jsPDF` import in `pdf-export.ts` to dynamic `await import(...)` calls inside the exported functions, matching the pattern already used for JSZip (`downloadZip`) and the office-export libraries.
2. Verify with a bundle-analyzer pass (`next build` output / `@next/bundle-analyzer` if available) that per-tool-route JS shrinks measurably.
3. Re-run the existing `image-export.test.ts` / add a `pdf-export.test.ts` (currently missing entirely) to confirm the dynamic-import refactor doesn't change behavior.

### [TOOL-005]
**Category:** Comms Tools
**Severity/Priority:** Medium
**Problem/Gap Statement:** `src/lib/export/pdf-export.ts` has zero unit test coverage (confirmed: only `image-export.test.ts`, `office-export.test.ts`, `office-docx-builders.test.ts`, and `brand-logo-bytes.test.ts` exist under `src/lib/export/`), and there are zero `*.test.ts`/`*.test.tsx` files anywhere under `src/components/tools/` — every canvas tool's rendering and export-triggering logic is verified only by manual QA and the limited Playwright smoke suite.
**Affected Architecture/Files:** `src/lib/export/pdf-export.ts`, `src/components/tools/**`
**Implementation Blueprint:**
1. Add `src/lib/export/pdf-export.test.ts` covering: single-page export happy path, multi-page pagination logic, and the empty/failed `toPng` guard path (mirroring how `image-export.test.ts` tests `dataUrlToBlob`).
2. Add component-level tests (Vitest + `@testing-library/react`, already a dependency) for at least the shared `ToolEditorLayout.tsx` and one representative canvas component (`BoardTrimCanvas.tsx`) covering prop-driven rendering and the mobile Edit/Preview tab behavior.
3. Treat this as an incremental backlog item, not a one-shot rewrite — prioritize the tools most recently touched or most complex (board-banner, solidarity-poster) first.

### [TOOL-006]
**Category:** Comms Tools
**Severity/Priority:** Low
**Problem/Gap Statement:** Brand Kit's v1.1 → v2.0 migration (`normalizeBrandKit` in `src/lib/utils/local-links.ts`) happens only in memory on read — the underlying `localStorage` payload is not rewritten to v2 until the next explicit save. A kit that is only ever read (never edited/saved) stays tagged `"1.1"` in storage indefinitely, which is harmless today but is exactly the kind of latent inconsistency that causes bugs when a future migration (v2 → v3) needs to detect "already migrated" state reliably.
**Affected Architecture/Files:** `src/lib/data/local-storage-adapter.ts`, `src/lib/utils/local-links.ts`
**Implementation Blueprint:**
1. In the adapter's `getBrandKit()`, after calling `normalizeBrandKit()`, write the normalized (now v2) result back to `localStorage` immediately rather than waiting for the next explicit save.
2. Add a unit test: load a v1.1 fixture, call `getBrandKit()`, then read the raw `localStorage` value directly and assert it is now tagged `"2.0"`.

### [TOOL-007]
**Category:** Comms Tools
**Severity/Priority:** Low
**Problem/Gap Statement:** The Brand Kit / onboarding / preferences `localStorage` keys retain legacy `opseu-*` naming (`opseu-brand-kit`, `opseu-onboarding-complete` in `src/lib/data/adapter.ts`) despite the platform's multi-union, union-agnostic rebrand (ADR-012, the UnionOps rebrand). This is cosmetic/internal-only (not user-visible) but is exactly the kind of "OPSEU/CAAT migrates to tenant config" debt `docs/VISION.md` §"v1 code debt" flags as outstanding.
**Affected Architecture/Files:** `src/lib/data/adapter.ts` (`BRAND_KIT_KEY`, `ONBOARDING_KEY` constants)
**Implementation Blueprint:**
1. Rename the storage key constants to neutral names (e.g. `unionops-brand-kit`, `unionops-onboarding-complete`).
2. Add a one-time read-migration in `local-storage-adapter.ts`: on `getBrandKit()`/`isOnboardingComplete()`, if the new key is empty but the legacy `opseu-*` key has data, read it, then write it under the new key (and optionally clear the old key) — so existing users' browsers don't silently "lose" their saved Brand Kit on the rename.
3. Add a unit test covering the legacy-key fallback/migration path.

---

## Sequencing note for agents picking up this backlog

`SEC-003` (Postgres + RLS) is a hard dependency for making `SEC-007` (real accounts), `FEAT-001` (real attachment storage), and most of the "Basecamp parity" `FEAT-` tickets durable rather than another layer built on sand. Do `SEC-001`/`SEC-002`/`SEC-004` (MFA + secret hardening) first — they are self-contained, high-severity, and do not require the database migration to land. `.cursor/rules/roadmap-next.mdc` already sequences Postgres before onboarding UI before attachments; this backlog does not contradict that sequencing, it fills in the ticket-level detail underneath it.

---

## FUTURE PHASE — NICE-TO-HAVE FEATURE PROPOSALS (`FUTURE-`)

Added 2026-07-23 from a follow-up feasibility review (not part of the original four-domain gap audit above — these are net-new proposals toward "definitive tool for an Ontario union local," not gaps in existing functionality). All file paths cited were verified against `git ls-files`. None of these are scheduled in `docs/ROADMAP.md`; treat this whole section as a candidate backlog to slot into a future phase, sequenced after — or in one case (`FUTURE-001`) interleaved with — the `SEC-`/`FEAT-` work above.

**Priority order of these six, cheapest/highest-value first:**

1. `FUTURE-002` DFR guide, `FUTURE-003` seniority playbook, `FUTURE-004` right-to-refuse guide — pure content, near-zero architectural risk, ship any time.
2. `FUTURE-001` Steward Quick-Log — high domain value, ~80% pattern reuse, no new persistence risk beyond what already exists (i.e. no worse than today's `SEC-003` exposure).
3. `FUTURE-005` Action Card / QR petition builder (MVP scope only) — same effort class as an existing tool (`qr-card`), but see the scope-guard in its ticket before building the "full" version.
4. `FUTURE-006` Pulse Poll Creator — hold until `SEC-003` (Postgres) lands; this is the only one of the six that requires genuinely new public-facing data collection infrastructure.

### [FUTURE-001]
**Category:** Feature Parity
**Severity/Priority:** Medium (high value, low architectural risk)
**Problem/Gap Statement:** Many CBAs require (or strongly reward) documenting an informal discussion/attempt-to-resolve *before* a Step 1 grievance is filed — "Steward Quick-Log." Today the closest entity, `MemberCommunication` (`src/types/qol.ts`), hard-requires a `grievanceId`, so nothing can be logged until a grievance formally exists. There is no pre-filing capture mechanism anywhere in the codebase.
**Affected Architecture/Files:** `src/types/qol.ts` (`MemberCommunication`), `src/lib/qol/access.ts`, new `src/lib/informal-log/memory-adapter.ts`, new `src/app/api/informal-log/**`, new `src/app/[locale]/app/informal-log/page.tsx`
**Implementation Blueprint:**
1. Do **not** overload `MemberCommunication` — add a sibling entity `InformalLogEntry: { id, unionId, localId, bargainingUnitId?, memberPseudonym?, topic, channel, summary, occurredAt, loggedById, loggedByName, convertedToGrievanceId?, createdAt }`, deliberately shaped like `MemberCommunication` so a later "promote to grievance" action can copy fields 1:1 into the new `Grievance` + first `GrievanceEvent`/`MemberCommunication` records.
2. Follow the exact existing module-scaffolding pattern: memory adapter → API routes → list/detail Hub page, mirroring `src/lib/snippets/memory-adapter.ts` and `src/app/[locale]/app/snippets/page.tsx` as the nearest-shape precedent (simple create/list/delete, no step machine).
3. RBAC: reuse `canManageQolContent()` (`src/lib/qol/access.ts`) unchanged — this is the same role set (steward/president/elevated) that already writes CA snippets.
4. Ship the "convert to grievance" action last (v1 can be log-only); when built, it should pre-fill `CreateGrievanceInput` from the log entry and stamp `convertedToGrievanceId` on the source log row so the pre-filing history stays visible from the grievance detail page.
5. Register as a new entry in `src/lib/modules/registry.ts`'s `HubModule` set (opt-in per union, per the multi-union `enabledModules` rule) rather than bundling it into the existing `grievance` module.

### [FUTURE-002]
**Category:** Feature Parity (content)
**Severity/Priority:** Low (effort) / High (trust value)
**Problem/Gap Statement:** No Duty of Fair Representation (DFR) guide exists. This is a foundational literacy gap for exactly the audience (stewards, local officers) this platform targets, and it's a natural companion to the grievance module given `SEC-001`'s finding that missed deadlines are a DFR exposure vector.
**Affected Architecture/Files:** new `src/app/[locale]/guide/dfr/page.tsx`, `messages/en.json` + `messages/fr.json` (`dfrGuide.*` namespace)
**Implementation Blueprint:**
1. Scaffold with the existing static-guide pattern exactly as `src/app/[locale]/guide/crisis/page.tsx` does: `GuideLayout` + `SourcesBlock`, chapter-key array driving i18n lookups (no MDX/new rendering pipeline needed).
2. Content sections: what DFR means in Ontario labour relations, the "arbitrary / discriminatory / bad faith" test, common failure modes (missed deadlines, no investigation, no communication with the member), and a link back to `/app/grievances` and the new `FUTURE-001` quick-log once shipped.
3. Add the required "not legal advice, confirm with your CBA/national union legal department" disclaimer `Callout`, matching the tone already used in `docs/COMPLIANCE.md` and `docs/modules/COLLEGE_BUMPING.md`.
4. Add the route to `src/app/[locale]/guide/page.tsx`'s related-links list and to `src/app/sitemap.ts`.

### [FUTURE-003]
**Category:** Feature Parity (content)
**Severity/Priority:** Low (effort) / Medium (trust value)
**Problem/Gap Statement:** `FEAT-005` (already in this backlog) correctly identifies that the College Bumping module has no seniority-calculation *engine* — but until that ships, officers have no guidance at all on how to manually work through a bumping/seniority scenario. A playbook is the pre-`FEAT-005` stopgap and becomes the in-app help content once the calculator exists.
**Affected Architecture/Files:** new `src/app/[locale]/guide/seniority-bumping/page.tsx`, `messages/{en,fr}.json` (`seniorityGuide.*`), cross-link from `src/app/[locale]/app/bumping/page.tsx`
**Implementation Blueprint:**
1. Same static-guide scaffold as `FUTURE-002`. Content: worked examples of seniority comparison, cascading displacement walk-throughs, common pitfalls (posting date vs. seniority date, classification boundaries), explicitly framed as "aid, not the calculator" per the existing disclaimer language quoted in `FEAT-005`.
2. Optionally generate a printable worksheet using the existing document-export stack (`docxtemplater`/`exceljs`, already dependencies — see `src/app/[locale]/tools/document-generator/page.tsx` for the established client-side generation pattern) rather than only prose, so committees can work a case on paper.
3. Add an in-Hub "Guide" link from the bumping case detail page (`src/app/[locale]/app/bumping/[id]/page.tsx`) so officers find it in-context, not only via the public `/guide` index.
4. When `FEAT-005`'s `compareSeniority`/`rankEligibleBumpers` ship, update this guide to reference the in-tool calculator rather than replace it — keep the manual walkthrough for officers auditing/double-checking the tool's output.

### [FUTURE-004]
**Category:** Feature Parity (content) + Comms Tools (stretch)
**Severity/Priority:** Low (effort) / Medium (trust value)
**Problem/Gap Statement:** No Health & Safety "right to refuse unsafe work" guide exists (Ontario OHSA s.43). This is squarely in scope for a college-sector union tool and pairs naturally with a printable pocket-card artifact, which the platform already has the exact machinery to generate.
**Affected Architecture/Files:** new `src/app/[locale]/guide/right-to-refuse/page.tsx`, `messages/{en,fr}.json` (`rightToRefuseGuide.*`); optional stretch: new preset on an existing card-style tool (nearest precedent: `src/app/[locale]/tools/qr-card/page.tsx` / `src/components/tools/qr-board/QrBoardCanvas.tsx`)
**Implementation Blueprint:**
1. Guide: same static scaffold as `FUTURE-002`/`FUTURE-003`. Content: the OHSA s.43 refusal procedure step-by-step (report → JHSC/MOL investigation → work reassignment rules), explicitly labeled **Ontario-specific** per the multi-union principle (no silent assumption other provinces/jurisdictions follow the same steps — flag this clearly in the guide intro, not just in code).
2. Stretch: add a "H&S Right to Refuse" preset/mode to a wallet-card-style tool (either a new lightweight page reusing `ToolEditorLayout` + `Card`, or a new preset object in `src/lib/constants/qr-card-presets.ts` if a QR-to-guide link is the desired payload) so stewards can print/export a pocket reference card — this is presentation-layer only, no new data model or persistence, consistent with every other Comms tool's local-first/no-backend posture.
3. Do not hardcode this guide's steps as authoritative for non-Ontario tenants; gate any tenant-specific legal-step content behind the existing `CAConfig`/tenant-config pattern if this ever needs to vary by union, per platform.mdc rule #4 ("CA/grievance steps from CAConfig, not hardcoded").

### [FUTURE-005]
**Category:** Comms Tools
**Severity/Priority:** Low–Medium, **scope-gate required before starting**
**Problem/Gap Statement:** No petition/action-card tool exists. A print/QR "action card" (share a cause, link to a sign-on) fits the existing Comms tool architecture almost exactly. A *full* petition tool with in-product signature/pledge collection does **not** fit the current architecture at all — it would require the platform's first public-facing personal-data-collection surface (names, contact info, potentially per-member signatures) from anonymous, unauthenticated visitors, which is a materially larger privacy/compliance surface than anything else in the product and is not something the local-first Comms tools (or the "no first-party member portal" rule in `.cursor/rules/roadmap-next.mdc`) were designed to hold.
**Affected Architecture/Files:** new `src/app/[locale]/tools/action-card/{layout,page}.tsx`, new `src/components/tools/action-card/*` (nearest precedent: `src/app/[locale]/tools/qr-card/page.tsx`, `src/lib/export/qr.ts`)
**Implementation Blueprint (MVP — build this):**
1. Clone the `qr-card` pattern almost verbatim: brand-store-driven theme, headline/ask/deadline text fields, a QR code pointing at a destination URL the officer supplies (their existing external petition tool — Google Forms, ActionNetwork, a union national's own sign-on page, etc.), export PNG/PDF via the existing `image-export.ts`/`pdf-export.ts` helpers.
2. This requires zero new persistence, zero new privacy surface, and zero new RBAC — it is a content/layout variant of an existing tool, not a new subsystem. Ship this as the entire scope of `FUTURE-005`.
**Implementation Blueprint (Full petition/signature collection — do NOT build without a separate design + compliance pass):**
3. If ever pursued, this needs its own ADR: a new public API surface accepting anonymous submissions scoped by `unionId`/`localId`, explicit consent copy at point of collection (parallel to the existing `ConsentModal.tsx` pattern for member photos), a retention/deletion policy, and it is blocked on `SEC-003` (Postgres) for the same reason `FUTURE-006` is — there is nowhere durable to put the data today. Do not build this as an in-memory-adapter MVP; unlike internal casework, a lost public petition/pledge list is a reputational and possibly legal (implied consent to be contacted) problem, not just a data-loss annoyance.

### [FUTURE-006]
**Category:** Feature Parity, **blocked on `SEC-003`**
**Severity/Priority:** Medium, deferred
**Problem/Gap Statement:** No bargaining-survey/pulse-poll tool exists. Unlike the Comms canvas tools, a survey's value is in *aggregating* responses across many members — that is structurally not "local-first, on-device" (the officer authoring the survey and the members answering it are different people/devices), so this cannot reuse the client-only Comms tool pattern the way `FUTURE-005`'s MVP can. It needs a real (if minimal) public submission endpoint and a Hub-side results view.
**Affected Architecture/Files:** new `src/app/[locale]/tools/pulse-poll/{layout,page}.tsx` (authoring, local-first, reuses `ToolEditorLayout`), new public response route (e.g. `src/app/[locale]/poll/[slug]/page.tsx`), new `src/app/api/polls/**`, new `src/lib/polls/memory-adapter.ts` (temporary) → DB-backed adapter once `SEC-003` lands
**Implementation Blueprint:**
1. Authoring UI (officer-side) can ship early and stay fully local-first: build the question set, theme it, and get a print/QR-shareable link — this half mirrors `qr-card`/`board-notice` exactly.
2. The response-collection half (member-side) is the blocked part: it needs a public route that accepts anonymous submissions scoped to `unionId`/`localId`/optional `bargainingUnitId`, basic anti-abuse (single-submission token in the shared link, or simple rate-limit by IP+fingerprint — no third-party analytics/tracking per the platform's "Do Not" rule), and a Hub-side aggregate results view gated by the same RBAC tier as CA snippets (`canManageQolContent`).
3. Do not ship the response-collection half on the in-memory adapters — a poll that silently loses responses (per `SEC-003`) actively damages trust in a bargaining campaign at the exact moment the union needs members to trust the tool. Gate this ticket's public-facing half behind `SEC-003` explicitly; the authoring half has no such dependency and can be prototyped anytime.
4. Once built, results should export via the existing document-generation stack (`exceljs` for a raw CSV/XLSX dump, consistent with the Time module's existing CSV export precedent).
