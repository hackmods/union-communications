# Session knowledge — CapRover BuildKit / migrate image (2026-08-25)

**Audience:** future agents + Ryan.  
**Companions:** [`CAPROVER_POSTGRES.md`](../guides/CAPROVER_POSTGRES.md), [`DEPLOY.md`](../guides/DEPLOY.md), [`.cursor/rules/caprover-docker.mdc`](../../.cursor/rules/caprover-docker.mdc), [`docker/Dockerfile`](../../docker/Dockerfile).

---

## Symptom

CapRover git deploy failed mid-build:

```text
failed to export image: failed to set parent sha256:…: unknown parent image ID sha256:…
```

Pinpoint: immediately after a successful `COPY --from=migrate … package.json`, on the next step that copied **`node_modules`**.

Production stayed on an older commit (`f888d8c…`) until the Dockerfile was fixed — `/api/health` `.commit` is the ground-truth deploy check.

---

## Root cause (confirmed)

1. **BuildKit export failure on small CapRover hosts** when exporting large cross-stage layers (`COPY --from=migrate … node_modules`). Not an app bug; classic moby/BuildKit + disk/cache symptom.
2. **Migrate stage used full `package.json` + `npm ci --omit=dev`**, which:
   - Pulled ~**628MB** of production deps (entire Next.js tree)
   - Still **omitted `drizzle-kit`** because it lives under `devDependencies` with `--omit=dev`

Secondary CI trap: migrate smoke asserted `__drizzle_migrations` in schema `public`; Drizzle v7 may place the journal table elsewhere — check `table_name` only (or query `drizzle` schema), not `table_schema = 'public'`.

---

## Fix that shipped (do not regress)

| Piece | Rule |
|-------|------|
| [`docker/migrate-package.json`](../../docker/migrate-package.json) | **Only** `drizzle-kit`, `drizzle-orm`, `postgres` as `dependencies` |
| Runner stage | Copy SQL + minimal package.json from **build context**; `npm install --omit=dev` **inside runner** — no `COPY --from=… node_modules` for migrate |
| Target path | `/app/db-migrate/` + entrypoint still uses `drizzle-kit/bin.cjs` |
| Size | ~**59MB** migrate `node_modules` (CI evidence) vs 628MB before |
| CI | `docker-image` job builds/pushes GHCR **independently of E2E**; prefer CapRover **image pull** over on-host git rebuild |
| Deploy secrets | Prefer `CAPROVER_SERVER` + `CAPROVER_PASSWORD` + `CAPROVER_APP` (CLI image deploy). `CAPROVER_WEBHOOK_URL` alone rebuilds on the droplet and can re-hit BuildKit |

Verified live: `https://unionops.org/api/health` → `commit` starting `f3f04c6`.

---

## Agent do / don't

**Do**

- Keep migrate install slim via `docker/migrate-package.json`
- Prefer GHCR pull (`ghcr.io/hackmods/union-communications:main`) when CapRover builds fail with `unknown parent image ID`
- On the droplet: `df -h`, `docker builder prune -af`; disable cron `docker system prune` during builds
- Confirm deploy with `/api/health` `.commit`, not CapRover UI alone

**Don't**

- Reintroduce a migrate stage that `COPY --from=migrate` large `node_modules`
- Copy root `package.json` into `/app/db-migrate` and expect `drizzle-kit` with `--omit=dev`
- Treat CapRover git webhook as the primary path on small droplets when GHCR publish exists
- Assume E2E green is required before publishing Docker images (E2E flakes must not block ops images)

---

## Related commits

| Commit | Work |
|--------|------|
| `f9aa9ad` / `f3f04c6` | Runner-stage migrate + minimal package.json |
| `a95f9b6` | CI: independent `docker-image` + CapRover image deploy path |
| `26effc1` | Remove debug instrumentation; smoke/verify table lookup |

---

## Kickoff prompt (if regresses)

```text
CapRover build fails with "unknown parent image ID" on Docker COPY.
Read docs/audit/session-knowledge-2026-08-25-caprover-buildkit.md and
.cursor/rules/caprover-docker.mdc. Do not restore cross-stage node_modules COPY.
Prefer GHCR image deploy; verify /api/health commit.
```
