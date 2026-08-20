# Session knowledge — Multi-union Hub signup + platform admin (2026-08-18)

**Audience:** future agents + Ryan.  
**Companions:** [`docs/RBAC.md`](../RBAC.md) invitation flow, [`docs/guides/POSTGRES_OPS.md`](../guides/POSTGRES_OPS.md) bootstrap, [`docs/DECISIONS.md`](../DECISIONS.md) ADR-017 (no self-serve register), [`session-knowledge-2026-08-17-brand-kit-collections.md`](session-knowledge-2026-08-17-brand-kit-collections.md) (public Comms presets — not Hub tenancy), [`seed/reference-tenant-opseu-caat.json`](../../seed/reference-tenant-opseu-caat.json).

Do **not** treat Brand Kit union presets as Officer Hub tenant signup. Do **not** add a public `/app/register` page without an explicit product decision — Hub is invite-only.

**Update 2026-08-19:** `create_local` / `create_union` persist to Postgres when `DATABASE_URL` is set. See [`session-knowledge-2026-08-19-president-soft-launch.md`](session-knowledge-2026-08-19-president-soft-launch.md). Overlay remains the memory fallback.

---

## What Ryan asked

1. What is needed to get **sign up for other unions** implemented?
2. Is there a **master login** for the site?

---

## Two different “signups” (do not collapse)

| Surface | Who | Status |
|---|---|---|
| **Public Comms** (Brand Kit, `/onboarding`, canvas tools) | Any steward, no Hub account | **Shipped.** Presets for OPSEU, CUPE, Unifor, USW, ONA, PSAC, Other. Data stays on-device via `DataAdapter`. |
| **Officer Hub tenant** (grievance, time, invites, `/app/*`) | A union/local becoming a hosted tenant | **Not self-serve.** Invite-only. Creating a second union is operator-provisioned and currently **not durable**. |

Membership-growth materials (`/guide/membership-signup`, QR join URLs) are a third thing: helping workers join *their union*, not creating a UnionOps tenant.

---

## What already ships

- Hub wizard `/app/onboarding` (alias `/app/settings/tenant`) for `local_president` / `union_admin` / `platform_admin`.
- `GET`/`POST /api/tenant` — `create_local`, `create_collection`, `create_union`.
- **`create_union` is `platform_admin` only** (`canCreateUnionTenant` in `src/lib/tenant/access.ts`).
- New unions **never clone OPSEU/CAAT** — overlay uses host Brand Kit defaults + empty asset pack (`neutralBrandDefaultsForNewTenant`).
- Invite create `/app/invites` + public accept `/app/invite/[token]` (password → accept → login).
- Durable invites + `users` rows when `AUTH_USERS_BACKEND=postgres`.
- `npm run db:seed-admin` — bootstrap first president/admin **without** public signup.
- Proxy still *allows* `/app/register`, but **there is no register page**. ADR-017 kept Circles from landing a self-serve register fork.

---

## The gap (why “other unions” cannot actually sign up)

1. **Tenant overlay is process memory.** `src/lib/tenant/overlay.ts` stores new unions in a `Map`. Restart wipes them. Runtime loader (`src/lib/tenant/loader.ts`) reads **static OPSEU seed JSON + overlay**, not Postgres `unions`.
2. **Postgres already has tenant tables** (`src/lib/db/schema/tenant.ts`: `unions`, `divisions`, `locals`, `bargaining_units`, `users`). `db:seed` upserts the OPSEU reference tenant into those tables for user FKs. **`create_union` does not write them.** Users/auth read `users`; tenant *context* does not read `unions`.
3. **No public self-serve Hub register.** A CUPE local cannot create an account from the login page. Product path today: operator creates union → invites president → they invite officers.
4. **Demo auth is OPSEU-only.** Demo roster (`src/lib/auth/demo-users.ts`) is Local 243 / CAAT. Password `demo123` when `NEXT_PUBLIC_DEMO_SITE` / `AUTH_ALLOW_DEMO_USERS` is on. No other-union demo tenants.
5. **Casework backends default to memory.** A durable second union also needs the confidential `*_DB_BACKEND=postgres` flip (or data dies on restart). Demo auth must be off for live casework (`AUTH_ALLOW_DEMO_USERS=false`, `NEXT_PUBLIC_DEMO_SITE=false`, `SEED_DEMO_USERS=false`).

Until overlay persistence + loader + ops flip land, the onboarding “create union” UI is a **workshop demo of the wizard**, not a second live tenant.

---

## What to implement (sequenced)

Keep Hub **invite-only** unless Ryan explicitly asks for public register.

1. **Durable tenants** — persist `create_union` / `create_local` / `create_collection` to Postgres tenant tables; make `getTenantContext` / `getAllTenantSeeds` merge DB rows with (or instead of) overlay.
2. **Durable users** — `AUTH_USERS_BACKEND=postgres` + `DATABASE_URL` on the host. Invites already create `users` in that mode.
3. **Ops flip** — confidential adapters to postgres; turn demo roster off on production casework hosts. See [`POSTGRES_OPS.md`](../guides/POSTGRES_OPS.md).
4. **Bootstrap then invite** — seed `platform_admin`, create union, invite first `local_president` / `union_admin`. Optional SMTP (`EMAIL_ENABLED`) so invite / magic-link / password-reset send; copy-link still works without it.
5. **Per-union config after create** — grievance steps, `enabledModules`, Brand Kit (empty pack, not OPSEU assets), collections. Overlay already seeds generic 4-step grievance + host colours; that must survive restart and be editable.
6. **Only if product asks:** public apply / register (apply → operator approve → invite). That is a new surface, not a missing checkbox. Do not revive the experimental identity/register fork.

---

## Master login (platform admin)

The **role** `platform_admin` exists. It is the operator inbox (`/app/feedback`) and the only role that can `create_union`. It is **not** a demo account and is **not** on the login hint.

| Path | Email | Password | When it works |
|---|---|---|---|
| Demo roster | *none* | — | Demo users are president / division admin / stewards / solo only |
| Durable seed | `ryan@ryanmorris.ca` (override `SEED_PLATFORM_ADMIN_EMAIL`) | `SEED_PLATFORM_ADMIN_PASSWORD`, else auto-generated (optional write to `SEED_PLATFORM_ADMIN_BOOTSTRAP_FILE`) | `AUTH_USERS_BACKEND=postgres` and `db:seed` with `SEED_PLATFORM_ADMIN` not `false` |
| Manual bootstrap | whatever you pass | `--password` | `npm run db:seed-admin` after `db:seed` so OPSEU union/local FKs exist |

Seeded platform admin roles: `platform_admin` + `union_admin`. Default FK pin is `union-opseu` / `local-243` / `division-caat` — **not** a product default for new unions; it is so the `users` row satisfies existing FKs.

Demo login hint (only when `isDemoSite()`): password `demo123`; accounts `president@local243.ca` · `caat-admin@opseu.org` (multi-local) · `steward-pt@local243.ca`. Highest demo role is **division_admin**, not platform admin.

If the host is memory-auth, `ryan@ryanmorris.ca` will not log in. Create one with:

```bash
npm run db:seed-admin -- \
  --email you@example.ca \
  --name "Ryan" \
  --password 'your-secure-password' \
  --union-id union-opseu \
  --local-id local-243 \
  --roles platform_admin,union_admin
```

Do not commit real passwords. Do not put platform admin on the public demo hint.

---

## Code map

| Concern | Path |
|---|---|
| Demo roster | `src/lib/auth/demo-users.ts` |
| Demo gate | `src/lib/auth/demo-auth-gate.ts` |
| Postgres user lookup | `src/lib/auth/sign-inable-account.ts` |
| Create-union RBAC | `src/lib/tenant/access.ts` (`canCreateUnionTenant`) |
| Tenant API | `src/app/api/tenant/route.ts` |
| Overlay (memory) | `src/lib/tenant/overlay.ts` |
| Loader (JSON + overlay) | `src/lib/tenant/loader.ts` |
| Hub wizard UI | `src/components/hub/TenantOnboardingWizard.tsx` |
| Postgres tenant schema | `src/lib/db/schema/tenant.ts` |
| Seed OPSEU into PG | `src/lib/db/seed.ts` (`seedReferenceTenant`) |
| Platform admin seed | `src/lib/db/seed-platform-admin.ts` |
| CLI bootstrap | `src/lib/db/seed-admin.ts` → `npm run db:seed-admin` |
| Login page | `src/app/[locale]/app/login/page.tsx` |
| Invite accept | `src/app/[locale]/app/invite/[token]/page.tsx` |

---

## Agent habits

- Do not hardcode OPSEU/CAAT as the default for new tenants (already true for overlay create).
- Do not clone the reference asset pack (`public/assets/caat-opseu/`) onto a new union.
- Do not invent a master password in docs or chat; point at env vars / bootstrap file / `db:seed-admin`.
- Public Comms presets are enough for “another union wants flyers.” Hub tenancy is a separate milestone.
- `docs/VISION.md` “new signups choose their union during onboarding (Phase 1)” is **aspirational for Hub**; Brand Kit onboarding is what actually does the union picker today.
