# Session knowledge — Waves G–I durability / Launch (2026-09-30)

## Wave G — Postgres durable verify (local)

| Check | Result |
|-------|--------|
| Docker Desktop Linux engine | Started; `docker-db-1` healthy on `:5432` |
| `npm run ops:verify-durable` | **Passed** — deploy through `0089_outreach_confirm`, seed, durability-smoke, rls-smoke |
| CLI `server-only` under tsx | Fixed via `scripts/register-server-only.mjs` on db seed/smoke scripts |

**Not claimed:** CapRover/production `*_DB_BACKEND=postgres` flip, `HEALTH_REQUIRE_DURABLE` on a live host, or compose `web` stack with durable overlay.

## Wave H — Portal Postgres gates

| Check | Result |
|-------|--------|
| Alignment Gate | Portal durability smoke expected denial of local-president union Circles; product policy (`canCreateUnionScopedCircle`) **allows** invite-only union-scoped Circles — smoke **REALIGN**ed |
| Concurrent Sidebar `Promise.all` | Flaky participant/message read; serialize ensure-thread for reliable gate |
| `db:portal-durability-smoke` | **Passed** as `unionops_app` |
| Process-restart / Playwright browser | Blocked — Chromium not installed in this sandbox cache |
| Production `PORTAL_DB_BACKEND=postgres` | **HUMAN** — operator/data-owner cutover only |

## Wave I — Launch Trust packets 1–10

| Disposition | Notes |
|-------------|-------|
| **HUMAN** | Living tracker [`docs/LAUNCH_TRUST_LEGAL_REFACTOR.md`](../LAUNCH_TRUST_LEGAL_REFACTOR.md) — code largely present; legal approval, Subprocessor provider rows, CASL mailbox drills, MFA/RLS host evidence, ZAP staging URL remain Ryan/counsel/host. Agents do not invent effective legal text or mark packets complete without evidence files. |

## Lesson

Local durable verify can unblock Wave G engineering gates without claiming production flip. Keep Portal smoke assertions aligned with `circle-create` policy, not older denial assumptions.
