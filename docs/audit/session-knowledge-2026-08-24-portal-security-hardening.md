# Session knowledge — Portal security audit + live hardening runbook (2026-08-24)

**Audience:** future agents + Ryan.  
**Companions:** [`portal-encryption-security-audit-2026-08-24.md`](portal-encryption-security-audit-2026-08-24.md), [`HOSTED_SECURITY.md`](../guides/HOSTED_SECURITY.md), [`COMPLIANCE_HARDENING_LIVE.md`](../guides/COMPLIANCE_HARDENING_LIVE.md), [`CAPROVER_POSTGRES.md`](../guides/CAPROVER_POSTGRES.md).

---

## Verdict (Portal encryption)

**Do not claim** Local Portal member data is encrypted at rest.

- Portal content lives in **plaintext in-process memory** (`portalStore`); no `PORTAL_DB_BACKEND`.
- TLS + Auth.js session only in transit; lost on restart.
- Public `/security` and operator [`HOSTED_SECURITY.md`](../guides/HOSTED_SECURITY.md) state this honestly.

Hub flip to Postgres **does not** fix Portal durability — separate ticket `PORTAL-DB-001`.

---

## What shipped (code + docs)

| Commit | Work |
|--------|------|
| `d6df0b4` | Portal IDOR fixes (`memory-adapter.ts`), `portalJson` `no-store`, sidebar `toId` roster validation, `activity_pack` admin gate, audit report, `portal-idor.test.ts` |
| `97a09de` | Public `/security`, `HOSTED_SECURITY.md`, EN/FR copy, sitemap/SEO, `SECURITY.md` / `COMPLIANCE.md` cross-links |
| *(this session)* | [`COMPLIANCE_HARDENING_LIVE.md`](../guides/COMPLIANCE_HARDENING_LIVE.md) — operator runbook for unionops.org Postgres + MFA flip |

---

## IDOR fixes (do not regress)

Circle-scoped validation added in [`memory-adapter.ts`](../../src/lib/portal/memory-adapter.ts) for:

- `addComment`, `completeAction`, `softDelete`, `pinBulletin`
- `addPipelineCard`, `movePipelineCard`
- `addRollCallAnswer`, `upsertMomentum`

All nine `/api/portal/**` routes use [`portalJson`](../../src/lib/portal/portal-json.ts) → `Cache-Control: private, no-store`.

Sidebar POST validates `toId` against union roster in [`sidebars/route.ts`](../../src/app/api/portal/sidebars/route.ts).

---

## Production health snapshot (pre-flip, 2026-08-24)

`https://unionops.org/api/health/`:

- `postgresConfigured: false`, `postgresFlipComplete: false`
- `memoryCaseDataActive: true`, `demoAuthEnabled: true`, `mfaEnabled: false`
- All `backends.*: "memory"`

After ops flip, append post-flip JSON to the audit report (optional Phase 4 in runbook).

---

## Next session: execute live hardening

**Kickoff prompt** (paste to agent):

```text
Execute docs/guides/COMPLIANCE_HARDENING_LIVE.md for unionops.org:
Phase 0 health baseline → Phase 1 CapRover Postgres → Phase 2 full flip
(demo off, MFA on, all *_DB_BACKEND=postgres) → Phase 3 verify.
Do NOT claim Portal encrypted at rest; PORTAL-DB-001 is deferred.
```

**Success gates:** `postgresFlipComplete: true`, `demoAuthEnabled: false`, `mfaEnabled: true`, grievance survives restart, `npm run ops:verify-durable`.

**Portal decision:** Hub flip done + `PORTAL-DB-001` **not** done → Portal stays **evaluation only** (memory banner).

---

## Deferred engineering backlog

| Ticket | Work |
|--------|------|
| `PORTAL-DB-001` | Postgres adapter + RLS (`unionId`, `localId`, `circleId`) |
| `PORTAL-AUDIT-001` | Full Portal write audit trail |
| `PORTAL-BINDER-001` | Object storage + scan for Binder files |
| — | Zod on Portal POST bodies; `assigneeId` roster validation |
| — | `no-store` on remaining Hub JSON APIs |

---

## Test notes

- Unit: `npm run test:unit -- src/lib/portal/portal-idor.test.ts src/lib/auth/api-route-auth.test.ts` — **40 passed** (2026-08-24).
- Portal smoke blocked locally without `npx playwright install`; port 3000 may already be in use — use `PLAYWRIGHT_BASE_URL=http://localhost:3000` or prod URL for unauthenticated grep only.

---

## Security-review outcome

Independent pass on IDOR fix diff: **no Critical/High** remaining in scope. Fixed during review: `upsertMomentum` IDOR, viewer `activity_pack` export gated to `canAdminCircle`.
