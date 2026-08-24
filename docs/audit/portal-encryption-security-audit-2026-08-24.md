# Local Portal — Encryption & Security Audit

**Date:** 2026-08-24  
**Scope:** Local Portal only (`/[locale]/portal/*`, `/api/portal/**`, Portal send-feedback surface)  
**Auditor:** Agent security pass (code-verified; production health cross-check)  
**References:** [COMPLIANCE.md](../COMPLIANCE.md), [RBAC.md](../RBAC.md), [LOCAL_PORTAL.md](../modules/LOCAL_PORTAL.md), ADR-017, ADR-018, [HOSTED_SECURITY.md](../guides/HOSTED_SECURITY.md), [session-knowledge-2026-08-23-eerc-committees.md](session-knowledge-2026-08-23-eerc-committees.md)

---

## Executive summary

Local Portal Circles collaboration is **authenticated and union-scoped**, with **no cross-leak to Officer Hub grievance/bumping stores**. Portal data is **Internal-class** collaboration content stored **only in in-process memory** — there is **no application-level encryption at rest**, no `PORTAL_DB_BACKEND`, and no Binder file upload pipeline.

**Transit:** HTTPS + Auth.js JWT session cookies + CSP security headers apply. Portal API responses now set `Cache-Control: private, no-store` via [`portalJson`](../src/lib/portal/portal-json.ts) (remediation in this audit).

**Access:** All nine portal API route files call `requirePortalSession()`. Circle membership gates reads; **circle-scoped IDOR gaps on mutations were found and fixed** in this audit (comment, complete_action, pipeline, roll_call, soft_delete, pin_bulletin).

**Production (unionops.org, 2026-08-24):** Postgres flip not complete; all backends memory; demo auth enabled; MFA off. Portal content remains ephemeral regardless of Hub flip status.

---

## Explicit verdict

> **Can we claim Portal member data is encrypted at rest?**

**NO.**

| Claim | Reality |
|-------|---------|
| "Encrypted at rest" (member Circles content) | **False** — plaintext in Node.js heap via `portalStore`; lost on process restart |
| "Encrypted backup" / Hybrid export | **N/A to Portal** — Web Crypto hybrid path is Hub-only ([`src/lib/hybrid/encrypt.ts`](../src/lib/hybrid/encrypt.ts)) |
| "Secure session" | **Partial** — JWT auth cookie over TLS only; not content encryption |
| Host disk encryption | **Not evidenced in code** — operator responsibility (LUKS/cloud volume), same as COMPLIANCE attachment local storage note |

**Acceptable operator statement:** "Portal requires sign-in over HTTPS; Circle posts are stored on the server in plaintext until a durable Postgres adapter ships. Do not treat this host as production-ready for real member collaboration until lasting storage is enabled."

---

## Scope & methodology

**In scope:** Together, Hall, Bulletin, Floor, Sidebars, Actions, Calendar, Binder, Dispatch, Roll Call, Many hands, One fight, Hold the line, Oversight, send-feedback, Circle create/Roster.

**Out of scope:** Public Comms (`/tools/*`), Officer Hub casework (unless cross-leak found — none found).

**Method:** Read compliance docs; grep and read all `src/app/api/portal/**` and `src/lib/portal/**`; verify `backend.ts` flags; fetch live `/api/health/`; run unit + smoke tests; independent security-review pass on fixes.

---

## Production runtime evidence

`GET https://unionops.org/api/health/` (2026-08-24):

```json
{
  "postgresConfigured": false,
  "postgresFlipComplete": false,
  "memoryCaseDataActive": true,
  "demoAuthEnabled": true,
  "mfaEnabled": false,
  "backends": {
    "GRIEVANCE_DB_BACKEND": "memory",
    "AUTH_USERS_BACKEND": "memory",
    "FEEDBACK_DB_BACKEND": "memory"
  }
}
```

**Note:** `backends` lists 21 module flags from [`DB_BACKEND_ENV_KEYS`](../src/lib/db/backend.ts). **No Portal key exists.** CapRover flip guide ([CAPROVER_POSTGRES.md](../guides/CAPROVER_POSTGRES.md)) does not mention Portal persistence.

---

## Surface inventory

| Surface | Data types | Storage | Encrypted at rest? | Encrypted in transit? | Access control | Gap | Recommendation |
|---------|------------|---------|-------------------|----------------------|----------------|-----|----------------|
| **Together** | Circle list, my Actions, recent Bulletin summaries | `portalStore` memory | No | TLS + session cookie | `requirePortalPage` + `GET /api/portal/station` | Ephemeral; GET mutates Hall | Ship `PORTAL_DB_BACKEND` + RLS (separate ticket) |
| **Hall** (default Circle) | Same as Circle workspace | Memory | No | TLS | Membership + `hydrateLocalHall` | Memory-only | Enable durable storage before real use |
| **Bulletin** | title, body, authorName, comments | Memory | No | TLS | Circle member read; writer for POST | IDOR fixed 2026-08-24 | Keep circle-scoped tests |
| **Floor** | Chat messages, @mentions | Memory | No | TLS | Circle member | No delete path | Add delete + audit when Postgres lands |
| **Sidebars** | 1:1 DMs, participant names | Memory | No | TLS | Participant check on read/send | Recipient now validated against union roster | Consider circle-local DM policy later |
| **Actions** | Titles, notes, assignee names | Memory | No | TLS | Circle writer | IDOR on complete fixed | — |
| **Calendar** | Events, location, external URL | Memory | No | TLS | Circle member | No soft-delete | Postgres + retention policy |
| **Binder** | Text notes only (`contentType: note`) | Memory | No | TLS | Circle member | `file_meta` type unused; no uploads | Object storage + scan when files ship |
| **Dispatch** | Notifications per user | Memory | No | TLS | `userId` filter | — | — |
| **Roll Call** | Questions + answers | Memory | No | TLS | Circle member | IDOR on answer fixed | — |
| **Many hands** | Pipeline boards/cards | Memory | No | TLS | Circle member; admin for board create | IDOR on card/move fixed | — |
| **One fight** | Momentum progress items | Memory | No | TLS | Circle writer | — | — |
| **Hold the line** | Circle front date window | Memory (on Circle) | No | TLS | Admin for date edit | — | — |
| **Oversight** | Open action counts | Memory (derived) | No | TLS | Circle member via GET detail | — | — |
| **Roster / create Circle** | Membership, invitees | Memory + user lookup | No | TLS | `canCreateCircle` / `canAdminCircle` | Union-wide invitee list by design | Document for caucus Circles |
| **send-feedback** | Site feedback text, optional email/name | `FEEDBACK_DB_BACKEND` (memory on prod) | No (plaintext rows) | TLS | Auth required on Portal page; `POST /api/feedback` | Separate from Circles store (ADR-018) | Flip `FEEDBACK_DB_BACKEND=postgres` on prod |

---

## Audit questions (evidence)

### 1. Data classification

Per [COMPLIANCE.md](../COMPLIANCE.md):

| Level | Portal mapping |
|-------|----------------|
| **Public** | N/A inside authenticated Portal |
| **Internal** | Bulletin, Actions, Calendar, Floor, Binder notes, Roster, Dispatch |
| **Confidential** | Grievance notes — **not in Portal** (ADR-017) |
| **Highly Confidential** | Attachments, bumping — **Hub only** |

**Confidential-adjacent (operational):** Sidebars DMs, union-scoped caucus Circles (`circle-caucus-joint`), Roll Call answers, activity-pack JSON export. No code-level classification enum — all share one memory store.

**PII:** `userId`, display names (`authorName`, `userName`), free-text fields ([`src/types/portal.ts`](../src/types/portal.ts)). No email/phone in portal entities. Session email pre-fills send-feedback only.

**Storage paths:**

| Domain | Location |
|--------|----------|
| Circles entities | [`memory-adapter.ts`](../src/lib/portal/memory-adapter.ts) module arrays |
| Auth users | `AUTH_USERS_BACKEND` (memory on prod) |
| Site feedback | `FEEDBACK_DB_BACKEND` via [`POST /api/feedback`](../src/app/api/feedback/route.ts) |
| Binder files | **None** — text only |

### 2. Encryption in transit

| Control | Status | Evidence |
|---------|--------|----------|
| TLS | Operator (CapRover HTTPS) | `AUTH_URL=https://unionops.org` |
| Session | JWT strategy | [`auth.config.ts`](../src/auth.config.ts) L10 |
| CSP | Applied | [`next.config.ts`](../next.config.ts) `SECURITY_HEADERS` |
| Portal API cache | **Fixed** | [`portalJson`](../src/lib/portal/portal-json.ts) → `Cache-Control: private, no-store` |

[`proxy.ts`](../src/proxy.ts) excludes `/api/**` — portal routes self-enforce auth.

### 3. Encryption at rest

**No.** Portal uses singleton `portalStore` — plaintext in process memory. No `PORTAL_DB_BACKEND` in [`backend.ts`](../src/lib/db/backend.ts). Binder has no binary storage. Operator volume encryption is not app-enforced.

### 4. Client-side encryption

**None in Portal.** Web Crypto (PBKDF2 + AES-GCM) exists only for Hub hybrid export ([`src/lib/crypto/passphrase.ts`](../src/lib/crypto/passphrase.ts)).

### 5. Access control

**Session gate** ([`portal-session.ts`](../src/lib/portal/portal-session.ts)):

```13:30:src/lib/portal/portal-session.ts
export async function requirePortalSession(): Promise<PortalSessionResult> {
  const session = await auth();
  if (!session?.user) {
    return { ok: false, status: 401, error: "Unauthorized" };
  }
  if (!session.user.unionId) {
    return { ok: false, status: 403, error: "No union context" };
  }
  // ... module flag + canAccessPortal
}
```

- **All 9** `/api/portal/**` route files use `requirePortalSession` (verified; [`api-route-auth.test.ts`](../src/lib/auth/api-route-auth.test.ts)).
- **No cross-union reads** — `unionId` from session on every store call.
- **Hub separation** — no grievance/bumping imports under portal APIs.
- **MFA:** Not required for Portal (ADR-017). Acceptable for Internal-class content; document risk for caucus/strategy Circles.

**IDOR (fixed 2026-08-24):** Mutations now verify resource `circleId` matches route Circle in `memory-adapter` + [`portal-idor.test.ts`](../src/lib/portal/portal-idor.test.ts).

**Sidebar:** `POST /api/portal/sidebars` now validates `toId` against union roster ([`listCircleInviteCandidates`](../src/lib/portal/circle-invitees.ts)).

### 6. Logging / analytics

- No third-party analytics in portal code (ADR-006).
- Portal API routes: no `console.log` with PII.
- [`portal/error.tsx`](../src/app/[locale]/portal/error.tsx): logs digest/message only.

### 7. Retention / deletion

| Mechanism | Status |
|-----------|--------|
| Soft-delete | Bulletin, Actions, Binder only |
| Audit trail | Partial `pushAudit` — not all writes |
| Retention | No portal-specific policy; 7-year default is grievance-focused |
| Operator purge | No portal API; restart clears memory |
| Breach playbook | [COMPLIANCE.md](../COMPLIANCE.md) § Breach Response — operator duty |

**Honest UX:** [`PortalMemoryBanner`](../src/components/portal/PortalMemoryBanner.tsx) + `portal.memoryBannerBody` — no false encryption claim.

### 8. Compliance gaps

| Sev | Finding | Claim vs reality | Status |
|-----|---------|------------------|--------|
| Critical | Unauthenticated portal APIs | — | **None found** |
| Critical | Cross-union / grievance leak | — | **None found** |
| High | Circle IDOR on mutations | RBAC implies circle isolation | **Fixed 2026-08-24** |
| High | No durable Portal persistence | Banner mentions "lasting storage" future | **Open** — `PORTAL-DB-001` |
| Medium | Missing Cache-Control on portal APIs | Other sensitive routes set no-store | **Fixed 2026-08-24** |
| Medium | Sidebar arbitrary recipient | DM to any `toId` | **Fixed 2026-08-24** |
| Medium | Partial portal audit log | COMPLIANCE immutable audit for grievance | **Open** |
| Low | MFA off | ADR-017 by design | Document risk |
| Low | `activity_pack` for viewer role | Full JSON export | **Fixed 2026-08-24** — admin-only |
| Info | Prod all-memory + demo auth | Evaluation build posture | Ops flip in progress |

---

## PIPEDA / FIPPA mapping

| Requirement | Portal posture | Gap |
|-------------|------------------|-----|
| **Consent** | Invite-only Hub/Portal access; send-feedback requires consent checkbox (ADR-018) | No separate Portal ToS |
| **Data minimization** | No email in Circles entities; feedback optional contact | Free-text may contain member references |
| **Access rights** | No member export API for Circles; activity-pack for circle admins | Add export/erase when Postgres lands |
| **Breach notification (72h)** | Operator playbook in COMPLIANCE | Portal memory loss ≠ breach, but no durable audit |
| **FIPPA pseudonym** | Display names used; no pseudonym mode | Stewards should avoid member numbers in Floor/Bulletin |
| **Privacy by design** | No analytics; separation from grievance | Memory-only weakens accountability |

**Controller:** Instance operator is data controller for hosted Portal ([COMPLIANCE.md](../COMPLIANCE.md), ADR-019).

---

## Remediation applied (this audit)

1. **Circle-scoped IDOR guards** in [`memory-adapter.ts`](../src/lib/portal/memory-adapter.ts) for comment, complete_action, pipeline_card/move, roll_call answer, soft_delete, pin_bulletin, **upsertMomentum**.
2. **`activity_pack` gated** to `canAdminCircle` (viewers no longer receive audit trail export).
3. **`portalJson` helper** — `Cache-Control: private, no-store` on all `/api/portal/**` responses.
4. **Sidebar recipient validation** against union roster.
5. **Unit tests** — [`portal-idor.test.ts`](../src/lib/portal/portal-idor.test.ts) (7 cases).
6. **Smoke test** — activity pack download uses president after admin gate ([`e2e/portal.smoke.spec.ts`](../../e2e/portal.smoke.spec.ts)).

## Deferred (separate tickets)

| Ticket | Work |
|--------|------|
| `PORTAL-DB-001` | Postgres adapter + `PORTAL_DB_BACKEND` + RLS (`unionId`, `localId`, `circleId`) |
| `PORTAL-BINDER-001` | Object storage + ClamAV for Binder files |
| `PORTAL-AUDIT-001` | Full audit trail parity with Hub grievance log |

---

## Test plan & results

### Commands

```bash
npm run test:unit -- src/lib/portal/portal.test.ts src/lib/portal/portal-idor.test.ts src/lib/portal/circle-create.test.ts src/lib/portal/circle-invitees.test.ts src/lib/portal/hall-roster.test.ts src/lib/portal/portal-p4.test.ts src/lib/auth/api-route-auth.test.ts

# RLS — N/A (no PORTAL_DB_BACKEND)
# npm run db:rls-smoke

npm run test:smoke -- e2e/portal.smoke.spec.ts

curl.exe -sL https://unionops.org/api/health/
```

### Results

_See § Test results below — filled after CI/local run._

---

## Test results

| Suite | Command | Result (2026-08-24) |
|-------|---------|---------------------|
| Portal unit | `npm run test:unit -- src/lib/portal/*.test.ts src/lib/auth/api-route-auth.test.ts` | **40 passed** (7 files) |
| Lint | `npm run lint` | **Pass** (1 pre-existing warning in unrelated script) |
| Portal smoke | `PLAYWRIGHT_BASE_URL=http://localhost:3000 npx playwright test e2e/portal.smoke.spec.ts` | **Blocked** — Playwright Chromium not installed in agent environment (`npx playwright install` required). Test file updated for admin-gated activity pack. |
| RLS | `npm run db:rls-smoke` | **N/A** — no `PORTAL_DB_BACKEND` |
| Prod health | `curl.exe -sL https://unionops.org/api/health/` | All backends `memory`; `postgresConfigured: false` |

---

## Independent security review

**Subagent:** security-review (2026-08-24, uncommitted diff)

**Verdict:** No critical or high issues in the remediation diff. Circle-scoped IDOR fixes verified for comment, complete_action, pipeline, roll_call, soft_delete, pin. `portalJson` applied on all nine portal route files. Sidebar `toId` validated against union roster; client `toName` ignored in favour of roster name.

**Follow-ups addressed in same pass:**

| Finding | Severity | Resolution |
|---------|----------|------------|
| `upsertMomentum` cross-circle update | Medium | Circle match on update; returns `null` when `momentumId` wrong circle |
| `activity_pack` for viewers | Medium | Gated with `canAdminCircle` |

**Deferred (out of scope):** `assigneeId` roster validation on actions; pipeline `columnId` integrity within board; Postgres durability (`PORTAL-DB-001`).

---

## Appendix: API route inventory

| Route | Methods | Auth |
|-------|---------|------|
| `/api/portal/circles` | POST | `requirePortalSession` + `canCreateCircle` |
| `/api/portal/circles/[id]` | GET, PATCH, POST | `requirePortalSession` + membership/role gates |
| `/api/portal/circles/[id]/invitees` | GET | + `canAdminCircle` |
| `/api/portal/station` | GET | `requirePortalSession` |
| `/api/portal/fronts` | GET | `requirePortalSession` |
| `/api/portal/dispatch` | GET, PATCH | `requirePortalSession` |
| `/api/portal/sidebars` | GET, POST | `requirePortalSession` |
| `/api/portal/search` | GET | `requirePortalSession` |
| `/api/portal/hall/ensure` | POST | `requirePortalSession` + `localId` |
