# UnionOps — Executive Audit Summary

**Audit date:** 2026-07-22
**Scope:** Full read of the `hackmods/union-communications` workspace (main branch, `3d1994d`) — Next.js 16 App Router platform for public Comms tools + authenticated Officer Hub (grievance, college bumping, workforce time, QOL modules). Live context: unionops.org.
**Method:** Direct read of core docs (`AGENTS.md`, `docs/*`, `.cursor/rules/*`) + primary-source reads of types/adapters/API routes/auth + four parallel deep-dive passes (domain logic, comms tools, UI/UX/a11y/SEO, security/RBAC/self-hosting). Every file path cited in this audit was verified against `git ls-files` — nothing below is a hallucinated path.

This is a brutally honest snapshot, not a takedown: the codebase is unusually well-documented and disciplined for its size (532 tracked files), but it is still a **pre-persistence MVP**. Read this alongside `active-context.md` (technical reference) and `execution-backlog.md` (tickets).

---

## Section 1 — Architectural Strengths & Weaknesses

### Strengths
1. **Docs-as-code discipline is real.** `AGENTS.md` → `docs/VISION.md` / `ARCHITECTURE.md` / `RBAC.md` / `COMPLIANCE.md` / `ROADMAP.md` / `PROGRESS.md` form a coherent, current chain, cross-linked from `.cursor/rules/*.mdc`. Very few docs were stale; the ones that were (see below) are minor.
2. **Multi-tenancy modeling is genuinely disciplined.** Every domain type (`Grievance`, `BumpingCase`, `TimeEntry`, `AttachmentMeta`, `CaSnippet`, `SharedTemplate`) carries `unionId` + `localId` + optional `bargainingUnitId`, and there is a real, testable, server-callable RBAC layer (`src/lib/grievance/access.ts`, `src/lib/qol/access.ts`, `src/lib/bumping/access.ts`, `src/lib/time/access.ts`) that most confidential-module API routes actually call — not just UI-side gating.
3. **The comms export pipeline is unusually hardened for a volunteer project.** `src/lib/export/image-export.ts` explicitly works around a real production bug class (CSP `connect-src 'self'` blocking `fetch(data:...)`), prefers `toBlob` over data URLs, and has a documented WebKit fallback path. Heavy office-export libraries (`pizzip`, `exceljs`, `pptxgenjs`) are dynamically imported.
4. **Real cryptography exists where the team claims it exists.** The Hybrid export (`src/lib/crypto/passphrase.ts`) is PBKDF2-SHA-256 at 310,000 iterations + AES-GCM-256 with per-file salt/IV — not security theater.
5. **i18n coverage is structurally enforced** (next-intl, `messages/en.json` + `messages/fr.json`, hreflang/canonical via `src/lib/seo/build-page-metadata.ts`).

### Weaknesses
1. **Everything confidential lives in a JavaScript array in one Node process.** `src/lib/grievance/memory-adapter.ts`, `bumping/memory-adapter.ts`, `time/memory-adapter.ts`, `attachments/memory-adapter.ts`, and `audit/memory-adapter.ts` are the *entire* datastore for grievances, bumping cases, time entries, attachment metadata, and the audit log. There is no Postgres, no `pg`/`prisma`/`drizzle` dependency in `package.json`, and `docker/docker-compose.yml` has exactly one service (`web`) — no database. **Every restart, redeploy, or crash silently erases all case data.** This is the single most important fact about the platform's current state and it is *not* surfaced anywhere in the UI.
2. **MFA is not MFA.** `src/app/api/mfa/verify/route.ts` checks a single shared 6-digit code (`AUTH_MFA_CODE` / `AUTH_DEV_MFA_CODE`, default literal `"000000"`) for every user in every union on the instance. Worse, the verify endpoint never actually binds `mfaVerified` into the session server-side — the client sets it via `session.update({ mfaVerified: true })` (see `src/app/[locale]/app/mfa/page.tsx`), which any authenticated browser session can call directly, bypassing MFA entirely for grievance/bumping/time modules that ADR-009 and `docs/RBAC.md` describe as requiring it.
3. **Route protection has silently drifted from what the docs claim.** `docs/ARCHITECTURE.md` says "Middleware protects `/app/*`." There is no `middleware.ts`; Next.js 16 uses `src/proxy.ts` instead, and its matcher explicitly excludes `api` routes. That's fine *in practice* because most API routes do call `auth()` themselves — but the architectural claim is inaccurate, `/app/audit/page.tsx` and the Hub dashboard (`src/app/[locale]/app/page.tsx`) only gate client-side via `useSession`, and there is no single enforced choke point to audit.
4. **The product is a case-tracking + comms tool, not a Basecamp replacement**, despite the AGENTS.md/VISION framing implying general officer collaboration. There are no message boards, to-dos, chat, or a real document vault anywhere in the codebase — see Section 2.
5. **Login itself is a demo, not a product.** `src/lib/auth/demo-users.ts` plaintext-compares against a fixed roster (password `demo123` for everyone); `bcryptjs` is a declared dependency but is never called by the live auth path.

---

## Section 2 — The "Basecamp Parity" Gap Report

| Basecamp capability | UnionOps today | Verdict |
|---|---|---|
| **Message Boards** (project posts, threaded replies, boosts) | Nothing. `CaSnippet` (`src/lib/snippets/memory-adapter.ts`) is a searchable CA-clause library; `SharedTemplate` (`src/lib/marketplace/memory-adapter.ts`) is a within-union template exchange. Neither has threads, replies, or reactions. | **Absent** |
| **To-dos** (assignable task lists, due dates) | None. The closest analogue is the static handoff checklist in `src/lib/handoff/package.ts` and per-grievance `GrievanceEvent` timeline entries — neither is a general task list. | **Absent** |
| **Docs & Files vault** | None. `AttachmentMeta` (`src/types/attachments.ts`) is metadata-only — `storageKey` is a `memory://` placeholder; no file bytes are durably stored, no object storage is wired up. CBAs/minutes have nowhere to live except CA snippet text. | **Absent (stub only)** |
| **Campfire / group chat** | None, anywhere in the tree. | **Absent** |
| **Schedule** (shared team calendar) | Only per-grievance `ScheduledMeeting` + ICS export (`src/lib/calendar/event-ics.ts`) and Comms-side public event ICS. No union/local shared calendar product. | **Partial, case-scoped only** |
| **Hill charts / Card tables** | None. | **Absent** |
| **Automatic check-ins** | None. | **Absent** |
| **Grievance lifecycle (union-specific, not Basecamp)** | Real and reasonably complete for an MVP: configurable `CAConfig` steps, deadline calculator (`src/lib/grievance/deadlines.ts`), escalation events, immutable notes, copy-only email drafts, ICS meetings, member communication log, export bundle. **Missing:** no arbitration outcome/award entity, no settlement terms, no appeal-deadline tracking distinct from step `responseDays`, no `GrievanceDocument`-as-evidence workflow (attachments are bolted on separately, not part of `GrievanceWithRelations`). | **Solid MVP, thin at Step 4+** |
| **Seniority & College Bumping** | `BumpingCase.seniorityDate` is a stored string with **zero** calculation logic. There is no cascading-displacement engine, no member seniority roster, no vacancy/posting model. The module is a structured **committee decision-recording tool** (PDF diff viewer + checklist + free-text decision record) — it does not, and currently cannot, compute who bumps whom. | **Committee aid, not a bumping engine** |
| **Steward↔Executive handoff** | Real and shipped: `/app/handoff` reassigns `assignedStewardId`, appends a note, and produces a downloadable JSON package. Single-purpose, works. | **Shipped, narrow** |
| **Time / QOL tracking** | Real 8-lite/8-lite+ system: clock in/out, manual/retro ranges, bulk union-business events, expected-window "needed" board, approve/reject, CSV + union-business report. No PTO, no OT/pay-period engine, no scheduling. | **Solid MVP for a niche use case** |

**Bottom line:** UnionOps is a purpose-built **union casework + comms toolkit**, not a general officer collaboration platform. If the product ambition includes "Basecamp for the local," items 1–4 in the table above (boards, to-dos, docs vault, chat) are 100% greenfield work, not incremental — see `FEAT-` tickets in the backlog.

---

## Section 3 — Self-Hosting & Security Posture

**Can a non-technical union volunteer safely self-host this today for real casework? No.** Concretely:

1. **No persistence layer.** `docker/docker-compose.yml` ships one `web` container with a hardcoded placeholder `AUTH_SECRET` and no database. `docker/entrypoint.sh` says outright: no migrations, in-memory adapters. A local that stands this up and starts filing real grievances will lose everything on the next container restart with zero warning in the product UI.
2. **The only login path is the demo roster.** Real unions cannot create real officer accounts. There is no signup, no invite flow wired to real credentials, no password reset — `docs/RBAC.md`'s "Invitation Flow (Phase 6 onboarding)" is fully aspirational; nothing in `src/app/api` implements it.
3. **MFA is a shared static code, and it's bypassable client-side** (Section 1, item 2). This directly contradicts ADR-009 ("MFA required; immutable audit log on all access") for the exact module class (grievance/bumping) the ADR was written to protect.
4. **`AUTH_SECRET` silently falls back to a hardcoded literal** (`"dev-secret-change-in-production"`, `src/auth.ts` / `src/auth.config.ts`) if the operator forgets to set it — a misconfigured host doesn't fail closed, it fails open with a guessable secret, forging valid session JWTs.
5. **PATCH routes on grievances/bumping cases spread raw request bodies onto stored records** (`src/lib/grievance/memory-adapter.ts` update path) without a field allowlist or a schema validator (no `zod` or equivalent anywhere in `package.json`) — a client that sends extra JSON keys risks overwriting tenant-identity fields like `unionId`/`localId`.
6. **CSP is Vercel-only.** `vercel.json` defines real security headers (with `'unsafe-inline'`/`'unsafe-eval'`, worth tightening), but `next.config.ts` only sets a header for `/sw.js` — a CapRover/Docker/self-host deployment gets **no CSP at all** unless the operator's reverse proxy adds one, which `docs/guides/DEPLOY.md` does not walk through.
7. **What is genuinely solid:** the RBAC *logic* (grievance/bumping/time access functions), the audit log call sites on nearly every mutating route, the tenant-scoping discipline in every list query, and the Hybrid export's real client-side encryption. The architecture for "eventually correct" security is in place; what's missing is turning the placeholders (MFA, secrets, persistence) into production-grade defaults.

**Recommended framing for the team:** the platform is safe today for **demos, training workshops, and UI/UX iteration** — exactly as `docs/COMPLIANCE.md`'s "Evaluation builds" caveat already says. It is *not yet* safe for a real local's real grievance data, and nothing in the current self-host path stops an eager volunteer from trying anyway. Closing that gap (Postgres + RLS, real MFA, real onboarding/signup) is Phase 6/7 as already scoped in `docs/ROADMAP.md` — this audit's job is to make the size and shape of that gap explicit and ticketed (see `execution-backlog.md`, `SEC-*` and `FEAT-*` tickets).

---

## Files reviewed for this audit (representative, not exhaustive)

`docs/VISION.md`, `ARCHITECTURE.md`, `RBAC.md`, `COMPLIANCE.md`, `ROADMAP.md`, `PROGRESS.md`, `DATA_MODELS.md`, `DECISIONS.md`, `docs/modules/{GRIEVANCE,COLLEGE_BUMPING,WORKFORCE_TIME,CALENDAR_MEETINGS,COMMS,COMMS_BACKLOG}.md`; `src/types/*.ts`; `src/lib/{grievance,bumping,time,handoff,snippets,marketplace,attachments,audit,hybrid,auth,qol,data,export,pwa,seo,crypto}/**`; `src/app/api/**/route.ts`; `src/auth.ts`, `src/auth.config.ts`, `src/proxy.ts`; `docker/*`, `.env.example`, `env.example`, `vercel.json`, `next.config.ts`; `src/components/{ui,tools,hub,layout,grievance,bumping,time,qol}/**` (sampled); `e2e/*.spec.ts`.

A note on tooling: the `Glob` search tool in this environment returned several **stale/phantom file paths** during this audit (e.g. `docs/modules/LOCAL_PORTAL.md`, `.cursor/rules/local-portal.mdc`, `src/components/portal/CircleWorkspace.tsx`, `e2e/portal.smoke.spec.ts`) that do **not** exist in `git ls-files`. Every path cited in these four audit documents was cross-checked against `git ls-files` output before being written down. Future agents should do the same — do not trust a single tool's file listing without a `git ls-files` / `Test-Path` cross-check.

---

### Critical Blind Spots & Unknown Unknowns

Red-team pass, outside the scope of the domain-by-domain audit above. These are the things most likely to hurt a real Ontario local or a solo maintainer, not just code quality issues.

- **Grievance deadlines are calendar-day math with false authority, and that can end a real case.** `calculateStepDueDate()` in `src/lib/grievance/deadlines.ts` is `due.setDate(due.getDate() + step.responseDays)` — no business-day logic, no Ontario statutory-holiday calendar, no timezone anchoring. Most real CBAs count response windows in *business* days. The UI presents this number ("days left," overdue/upcoming) as if it's authoritative. If a local trusts it and a Step deadline is actually a business day earlier or later than the CBA's real count, the grievance can be time-barred — a **Duty of Fair Representation** exposure for the union, not just a software bug. This needs a loud "verify against your CBA" disclaimer *at minimum* today, and real business-day/holiday-calendar support before Phase 3 ships arbitration outcomes (`FEAT-004`).
- **PIPEDA rights have no tooling, and "evidence loss" isn't just a persistence bug.** There is no way for a local (or the platform operator) to answer "show me everything you hold on member X" or honour a deletion/correction request — no cross-entity search-by-member exists anywhere in the schema. Separately: `docs/COMPLIANCE.md` says "prefer Canadian data residency" but nothing enforces it (default Vercel/CapRover hosting can land anywhere); and the in-memory-only persistence already flagged as `SEC-003` isn't just an availability bug — if it wipes data mid-arbitration, that's **spoliation of evidence** a local may be legally required to preserve.
- **The public Comms tools have zero provenance or abuse resistance.** Flyer/Board Notice/QR/Solidarity Poster makers are anonymous, unauthenticated, and produce union-branded-looking output with no watermark, signature, or rate limit. Nothing stops a bad-faith actor (management, a rival caucus, an external agitator, or just a troll) from generating a convincing fake "official" notice, a QR poster pointing at a phishing/anti-union site, or a flood of spam exports — and nothing in the product lets a member tell a real notice from a forged one.
- **Hybrid export is an unmonitored data-exfiltration path.** Any MFA-passed user can pull their entire accessible grievance/bumping slice via `/api/hybrid/slice` to a local file with no volume/frequency alerting, no export audit trail beyond a single log line, and no revocation once it's out the door. Until `SEC-002` lands, "MFA-passed" currently means "knows the one shared code the whole local uses" — so today this is effectively an ungated bulk-export of every member's confidential case data.
- **Solo-maintainer bus factor is compounded by the license, not mitigated by it.** `LICENSE` is source-available, not open source: locals may run and modify their own instance but may **not** redistribute, fork-and-share, or pay a third party to host a patched version as a competing service. If the sole steward becomes unavailable, every adopting local is stuck on a frozen, unpatched instance with no legal path to a community fork — a real continuity risk for any local treating this as their system of record for grievances. There's also no documented backup/disaster-recovery plan for the (future) Postgres store, and no security-disclosure SLA beyond `SECURITY.md`'s contact info.
