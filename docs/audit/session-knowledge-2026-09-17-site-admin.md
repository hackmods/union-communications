# Session knowledge — Site Admin / Platform Operator (2026-09-17)

**Audience:** future agents + Ryan.
**Companions:** [`docs/RBAC.md`](../RBAC.md), [`session-knowledge-2026-09-15-db-maintain.md`](session-knowledge-2026-09-15-db-maintain.md), [`session-knowledge-2026-08-18-multi-union-hub-signup.md`](session-knowledge-2026-08-18-multi-union-hub-signup.md), [`session-knowledge-2026-09-15-db-maintain.md`](session-knowledge-2026-09-15-db-maintain.md), [`docker/db-maintain.mjs`](../../docker/db-maintain.mjs), [`src/lib/auth/site-admin-session.ts`](../../src/lib/auth/site-admin-session.ts).

---

## Shipped this session

- New landing surface **`/app/site-admin`** with sub-tools: account support,
  users, locals, demo cleanup (and the existing invites/onboarding/feedback/audit
  surfaced as tiles for muscle memory).
- New access helper `requireSiteAdminSession()` — strict `platform_admin` +
  MFA, no `union_admin`/`local_president` fallback by design.
- New audit `resourceType: "site_admin"` with verb actions
  `site_admin.<noun>.<verb>`. Every API + page reads-as-writes or
  reads-as-breaks-glass emits one.

### Schema migration — `0035_site_admin.sql`

| Table | Columns added |
|---|---|
| `users` | `archived_at`, `archived_by_id`, `is_demo`, `locked_at`, `locked_reason`, `locked_by_id`, `session_version` (default 0) |
| `unions` | `archived_at`, `archived_by_id`, `is_demo` |
| `divisions` | `archived_at`, `archived_by_id`, `is_demo` |
| `locals` | `archived_at`, `archived_by_id`, `is_demo` |
| `audit_log` | `metadata jsonb` |
| New | `email_change_tokens` (2-token grant→confirm for changing accounts' email) |

- **FK change:** `users.union_id` loosened from `restrict` to `set null`.
  An archived user can be freed from a frozen union; hard-deletes still go
  through archive-first.
- The 0035 migration is **hand-maintained**. Don't run `npm run db:generate`
  against the resulting journal without review — regenerate detection on
  the schema columns would conflict.

### Data migration — `0001_site_admin_backfill.sql`

Flags demo-shaped rows directly so demo cleanup stops relying on regex:

| Heuristic | Tagged table |
|---|---|
| `users.email LIKE '%unionops.test%'` | `users.is_demo = true` |
| `unions.id IN ('union-opseu')` | `unions.is_demo = true` |
| Row chain via union FK | `locals.is_demo`, `divisions.is_demo` |

Idempotent — every UPDATE is guarded with `is_demo = false`. Subsequent seed
inserts must set `is_demo = true` themselves.

## Foot-guns (do not regress)

1. **Do not** add a route under `/app/site-admin/*` without going through
   `requireSiteAdminSession()` (or the equivalent server-side MCP). Cross-tenant
   reads on the site-admin surface are audited under the `site_admin.*`
   action namespace — non-platform-admin roles get 403 by design even when
   they could read the same data through a tenant-scoped surface.
2. **`metadata` is now persisted in the audit log.** `AuditEntry.metadata`
   was silently dropped by the Drizzle adapter before this session; sites
   that weren't on Postgres never noticed. The fix is in
   `src/lib/audit/drizzle-adapter.ts`. New routes lean on it for verb context.
3. **`sessionVersion` is reserved, not yet enforced.** The column exists and
   may be bumped by the future `signout-everywhere` action, but the JWT
   callback does not (yet) reject tokens whose `version` lags. Server-side
   session invalidation is v2 work; in v1, `signout-everywhere` invalidates
   outstanding tokens (password-reset, sign-in-link, email-change) only.
4. **Email change is a 2-token flow.** Do not let any `/api/site-admin/users/[id]`
   handler expose a direct PATCH of `users.email`. Always go through the
   `email_change_tokens` table. The schema is in 0035; the routes ship in v2.
5. **`users.unionId` FK is now `set null`.** Code paths that previously
   counted on the union FK to "never" drop for an active user are now
   wrong. The hard-delete flow MUST archive before deleting.
6. **`is_demo` registry is now the source of truth** for demo hygiene. The
   legacy `email like '%unionops.test%'` regex should NOT be used in v2
   code paths. The CLI / demo-cleanup page should query by `is_demo`.

## Risks / TODO (deferred to v2)

| Item | Status |
|---|---|
| In-app **purge** button on `/app/site-admin/demo-cleanup` | TODO. v1 is preview-only; ops path is the CLI `scripts/demo-purge.ts` (also TODO) |
| Email change grant/confirm routes (`/api/site-admin/users/[id]/change-email` + `/change-email/[token]`) | TODO. Schema is ready. |
| MFA rotate (`/api/site-admin/users/[id]/rotate-mfa`) | TODO. |
| Lock / unlock (`/api/site-admin/users/[id]/lock` + `/unlock`) | TODO. |
| Signout-everywhere (`/api/site-admin/users/[id]/signout-everywhere`) | TODO; v2 wires the JWT callback to compare sessionVersion. |
| Hard delete with typed-confirm + actor re-auth | TODO. The two-step archive-then-delete pattern is mandatory; v1 has archive only. |
| CLI `scripts/demo-purge.ts` (`db:demo-purge`) | TODO. |
| Right-to-be-forgotten path (PIPEDA / Ontario PHIPA) | TODO. Stretch to a separate runbook; audit_log is the proximate resolution evidence. |

## Kickoff prompt for future agents

```text
Need to operate / extend the Site Admin surface in union-communications.
Read docs/audit/session-knowledge-2026-09-17-site-admin.md and
.cursor/rules/caprover-docker.mdc. Pattern: every API goes through
requireSiteAdminSession(); every action emits audit_log with
resourceType "site_admin". Schema for soft-archive and is_demo registry
lives in 0035_site_admin.sql and 0001_site_admin_backfill.sql — read
those before any DDL change. DO NOT PATCH users.email directly;
channel all email changes through email_change_tokens.
```