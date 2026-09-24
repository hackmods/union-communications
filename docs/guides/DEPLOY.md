# Deploy

UnionOps — stewarded by Ryan Morris.

If **you** host an instance, **you** are the data controller for data that instance stores (sessions, Officer Hub records, future database). Prefer Canadian hosting for confidential modules. Comms graphics tools remain on-device in the browser; the Officer Hub does not.

## Production checklist

1. Set a unique `AUTH_SECRET` (`openssl rand -base64 32`) — never use the repo placeholders. Production refuses to start without it.
2. Set `AUTH_URL` to your public HTTPS origin (no trailing slash). Behind CapRover or custom nginx, this must be the **browser-facing** host (e.g. `https://unionops.org`), not the internal app FQDN — otherwise locale redirects and Auth cookies advertise the proxy hostname to crawlers.
3. MFA is **opt-in** (`AUTH_MFA_ENABLED=true`). Leave it off for demos/usability — durable Postgres grievances and other Hub modules work without MFA. Enabling MFA is recommended for hosts that want a second factor; set `AUTH_MFA_MODE=totp` when you do. Workshop hosts may use `shared_code_insecure` only with `AUTH_ALLOW_SHARED_MFA_IN_PROD=true` plus a unique `AUTH_MFA_CODE`. When MFA is enabled in production, unset mode or shared-code without break-glass fails closed.
4. Set your union’s default brand (optional but recommended for a white-label host):
   - Edit `config/host-brand.json` before build, or
   - `npm run brand:set -- --primary=#… --secondary=#… --local=… --sub="…"`, or
   - Pass `NEXT_PUBLIC_BRAND_PRIMARY` / `SECONDARY` / `ACCENT` and `NEXT_PUBLIC_DEFAULT_LOCAL_NUMBER` / `SUB_TEXT` as container env (see `.env.example`).
5. Do **not** rely on demo accounts (`demo123`) for real grievances or member files. On workshop/demo hosts, set `NEXT_PUBLIC_DEMO_SITE=true` so the authenticated hub shows a Demo banner; turn that off for real tenant instances.
6. Confirm health: `GET /api/health` → `{"status":"ok",...}` (includes `version`, `commit`, `backends`, `emailEnabled`, `cronConfigured`) or `npm run health:check`.
7. CSP and related security headers are set in `next.config.ts` (apply on CapRover/Docker/Vercel alike).
8. Read the two-tier privacy model in the site Privacy page and [`docs/COMPLIANCE.md`](../COMPLIANCE.md).

## GHCR images

Containers publish to GitHub Container Registry from [`docker/Dockerfile`](../../docker/Dockerfile). CI workflow: [`.github/workflows/ci.yml`](../../.github/workflows/ci.yml) — `docker-image` job is independent of E2E and runs `:main` + `:sha-<7-char>+ :production` build streams in parallel with the test-and-build job.

**Main tip** (after successful CI on `main`):

```text
ghcr.io/hackmods/union-communications:main
ghcr.io/hackmods/union-communications:sha-<short>
ghcr.io/hackmods/union-communications:production  # NEXT_PUBLIC_DEMO_SITE=false
```

**Tagged releases** (`v*` — see [`.github/workflows/release.yml`](../../.github/workflows/release.yml)):

```text
ghcr.io/hackmods/union-communications:v0.1.0
ghcr.io/hackmods/union-communications:latest
```

`:latest` is only updated on version tags, not on every `main` push.

Pull and run:

```bash
docker pull ghcr.io/hackmods/union-communications:v0.1.0
docker run --rm -p 3000:3000 \
  -e AUTH_SECRET="$(openssl rand -base64 32)" \
  -e AUTH_URL="https://your.domain.example" \
  ghcr.io/hackmods/union-communications:v0.1.0
```

### Docker Compose (image)

See commented `image:` example in [`docker/docker-compose.yml`](../../docker/docker-compose.yml).

### Docker Compose (build from source)

```bash
cd docker
docker compose up --build
```

Compose **requires** `AUTH_SECRET` in the environment (or `docker/.env`). MFA stays off by default (`AUTH_MFA_ENABLED=false`); set it true plus mode/code when testing second-factor flows.

## Deploy paths

There are three independent paths that can roll the image out. They run in parallel on a `main` push and the operator picks the right one per host. Two operators have already hit "CapRover failed to deploy" without realising the CI path was healthy — read [`.cursor/rules/caprover-docker.mdc`](../../.cursor/rules/caprover-docker.mdc) §CapRover deploy preference for the recommendation.

### 1. Auto-deploy on push to `main` (recommended default)

- `push` event on `main` triggers `ci.yml`.
- The `docker-image` job builds + pushes `:main` (and `:sha-<7-char>` + `:production` in parallel).
- `docker-image` post-publish verification reads `:main` and `:sha-<7-char>` digests via `docker buildx imagetools inspect`; **fails loud with `::error::` on drift** (expired token, registry republish race, missed upload). Operator sees the drift *before* the deploy job fires.
- The `deploy` job runs `caprover deploy --imageName ghcr.io/<repo>:main` against `CAPROVER_SERVER/PASSWORD/APP` GitHub secrets.
- The post-deploy `Post-deploy /api/health smoke` step polls `https://unionops.org/api/health` for ~100 s and fails loud if `.commit` does not match the just-deployed SHA.

### 2. Manual deploy from the GitHub UI (`workflow_dispatch`)

Manual escape hatch when:
- The CapRover app on the droplet is still on **Method 1 (Deploy from GitHub)** and the on-droplet webhook rebuild OOMs — see [audit/session-knowledge-2026-09-16-caprover-app-config-drift.md](../audit/session-knowledge-2026-09-16-caprover-app-config-drift.md).
- The operator needs to ship a specific `sha-<7-char>` or `production` image without waiting for the auto-deploy on the next push.

In [GitHub → repo → Actions → CI → Run workflow → inputs]:

| Input | Default | Notes |
|---|---|---|
| `image_tag` | `main` | Pass `production`, `sha-abc1234`, etc. Must already exist in GHCR (the `docker-image` job only runs on `push` to main, not on dispatch). |
| `target_url` | `https://unionops.org/api/health` | Full URL the post-deploy smoke polls. Set when dispatching to a staging URL or non-prod host. |
| `skip_smoke` | `false` | Set `true` only when deploying to a host whose `/api/health` doesn't report the dispatched SHA (e.g. pre-rollback verification). |

The deploy step's first sub-step validates the chosen tag exists in GHCR before invoking `caprover-cli` (`docker buildx imagetools inspect` against the tag), so a typo'd tag surfaces as `::error::` rather than the CLI's verbose-fail chain. The `docker-image` job is skipped on dispatch — saves ~5 min.

### 3. Manual deploy from your dev box (caprover-cli)

For ops who keep the secrets on their laptop (instead of GH repo secrets):

```sh
docker run --rm caprover/caprover-cli:2.2.3 caprover deploy \
  --caproverUrl "$CAPROVER_SERVER" \
  --caproverPassword "$CAPROVER_PASSWORD" \
  --caproverApp "$CAPROVER_APP" \
  --imageName "ghcr.io/hackmods/union-communications:${image_tag:-main}"
```

This is the exact command the CI `deploy` job runs. The image pulls from GHCR and CapRover restarts the cluster; no `next build` on the droplet. There's no post-deploy smoke on this path — verify manually with `curl -sL https://<host>/api/health`.

## CapRover

This repo includes [`captain-definition`](../../captain-definition) pointing at `./docker/Dockerfile`. The file is consulted **only** when the CapRover app's Deployment Method is `Method 1: Deploy from GitHub`. On Method 3 (Use Docker Image), `captain-definition` is unused — see [`captain-definition.README.md`](../../captain-definition.README.md).

**Durable Postgres on CapRover:** step-by-step walkthrough in [`CAPROVER_POSTGRES.md`](CAPROVER_POSTGRES.md) (two-app setup, env template, bootstrap seed, verify). Paste-ready env: [`docker/.env.production.example`](../../docker/.env.production.example).

**“Build-args were not consumed”:** CapRover passes all App Configs as build-args. Only `NEXT_PUBLIC_*` (and optional Sentry) need Dockerfile `ARG`/`ENV` — they are inlined into the client bundle at `next build`. `DATABASE_URL`, `*_DB_BACKEND`, SMTP/Mailgun, and migrate URLs are runtime-only; the warning for those is harmless. Never declare secret env vars as `ARG` just to silence it.

**Image pull vs git rebuild:** large `COPY --from` / `node_modules` layers can fail with BuildKit `unknown parent image ID`, and on small droplets `next build` OOM-SIGKILLs.

- Lessons: [`session-knowledge-2026-08-25-caprover-buildkit.md`](../audit/session-knowledge-2026-08-25-caprover-buildkit.md), [`session-knowledge-2026-09-16-caprover-app-config-drift.md`](../audit/session-knowledge-2026-09-16-caprover-app-config-drift.md)
- Cursor rule: [`.cursor/rules/caprover-docker.mdc`](../../.cursor/rules/caprover-docker.mdc) — CapRover deploy preference
- The CI `deploy` job refuses to fall back to `CAPROVER_WEBHOOK_URL` when `CAPROVER_SERVER/PASSWORD/APP` are missing.

1. Create an app; set **Container HTTP Port** to **3000** (not 80). A wrong port yields CapRover NGINX 502 even when logs say Ready.
2. App Configs (minimum):

| Variable | Example |
|----------|---------|
| `AUTH_SECRET` | output of `openssl rand -base64 32` |
| `AUTH_URL` | **Public** HTTPS origin only (no trailing slash) — e.g. `https://unionops.org`. Never the CapRover/internal FQDN (`*.behind7proxies.com`); wrong value leaks internal hosts into locale redirects, Auth.js `callback-url` cookies, and GSC “Page with redirect” noise. |
| `AUTH_ALLOW_DEMO_USERS` | `true` on the public demo host so `president.243@unionops.test` / `demo123` work. The image defaults this to match `NEXT_PUBLIC_DEMO_SITE`. Omit/`false` for live casework. |
| `AUTH_MFA_ENABLED` | omit/`false` (default) — casework works; set `true` when you want a second factor |
| `AUTH_MFA_MODE` | `totp` when MFA enabled; workshops: shared_code + break-glass |
| `AUTH_ALLOW_SHARED_MFA_IN_PROD` | `true` only for workshop/demo hosts using shared code |
| `AUTH_MFA_CODE` | 6-digit code when using shared_code mode |

Optional transactional email (invites / officer reminders / RSVP confirm — ADR-016):

| Variable | Example |
|----------|---------|
| `EMAIL_ENABLED` | `true` (required to send; otherwise APIs return `not_configured`) |
| `NEXT_PUBLIC_EMAIL_ENABLED` | `true` (Hub Invites “Send email” button; bake at **build** time) |
| `EMAIL_FROM` | `UnionOps <noreply@your-verified-domain>` (must match a Mailgun-verified domain) |
| `MAILGUN_API_KEY` | Mailgun **Private API key** (Sending → API Security) — **required on DigitalOcean** |
| `MAILGUN_DOMAIN` | Verified sending domain (e.g. `unionops.org` or `mg.unionops.org`) |
| `MAILGUN_API_REGION` | `us` (default) or `eu` |

**DigitalOcean CapRover:** outbound SMTP on **25 / 465 / 587 is blocked** (CONN `ETIMEDOUT`). Do **not** rely on `SMTP_*` there — set `MAILGUN_API_KEY` + `MAILGUN_DOMAIN` so UnionOps sends over HTTPS (`api.mailgun.net`). Confirm with `GET /api/auth/email-status/` → `smtp.preferredTransport: "mailgun_api"`.

Optional SMTP (non-DO hosts, or Mailgun port **2525** if your network allows it):

| Variable | Example |
|----------|---------|
| `SMTP_HOST` | `smtp.mailgun.org` (EU: `smtp.eu.mailgun.org`) |
| `SMTP_PORT` | `2525` preferred when 465/587 are blocked; else `587` |
| `SMTP_USER` | Mailgun SMTP login (often `postmaster@mg.your-domain`) |
| `SMTP_PASS` | Mailgun SMTP password from Domain → SMTP credentials |

When `MAILGUN_API_KEY` is set it takes priority over SMTP. On SMTP CONN timeout to 465/587 the app retries port 2525 once, then surfaces a DigitalOcean hint.

Optional post-deploy operator notify (no member lists):

| Variable | Example |
|----------|---------|
| `CRON_SECRET` | shared secret for `/api/cron/*` |
| `DEPLOY_NOTIFY_ENABLED` | `true` to allow `/api/cron/deploy-notify` |
| `DEPLOY_NOTIFY_EMAIL` | operator inbox for host-readiness summaries |

CI runs `npm run health:check:readiness` after the commit smoke (MFA off is advisory and does not fail). When `CRON_SECRET` is in GitHub secrets, CI also calls deploy-notify (continue-on-error).

Optional **error sinks** (ADR-006 — ops only, not product analytics; defaults off). Full matrix: [`HOSTED_SECURITY.md`](HOSTED_SECURITY.md).

| Variable | Example |
|----------|---------|
| `SENTRY_ENABLED` | `true` (server/edge; needs DSN) |
| `NEXT_PUBLIC_SENTRY_DSN` | Sentry client key — bake at **build** for browser errors |
| `SENTRY_DSN` | Optional runtime server DSN (CapRover App Configs OK) |
| `ERROR_LOG_FILE_ENABLED` | `true` |
| `ERROR_LOG_FILE_PATH` | `/data/logs/unionops-errors.jsonl` (mount a Persistent Directory) |
| `ERROR_LOG_FILE_MAX_BYTES` | optional rotate threshold (default 10 MiB) |
| `ERROR_LOG_FILE_KEEP` | optional rotated file count (default 3) |

After deploy, `curl -sL https://<host>/api/health/` → check `observability` (and watch for `*Misconfigured` / `sentryClientServerMismatch`).

Optional brand defaults — bake into the image at **build** time (`NEXT_PUBLIC_*` is inlined by Next.js). Prefer editing `config/host-brand.json` (or `npm run brand:set`) before `docker build` when you want a white-label host without env sprawl:

| Variable | Example |
|----------|---------|
| `NEXT_PUBLIC_BRAND_PRIMARY` | `#CE1126` |
| `NEXT_PUBLIC_BRAND_SECONDARY` | `#FFFFFF` |
| `NEXT_PUBLIC_BRAND_ACCENT` | `#9B0D1C` |
| `NEXT_PUBLIC_DEFAULT_LOCAL_NUMBER` | `79` |
| `NEXT_PUBLIC_DEFAULT_SUB_TEXT` | `Hospital Workers` |
| `NEXT_PUBLIC_OFFICER_HUB_PUBLIC` | `true` (Docker soft-launch default) |
| `NEXT_PUBLIC_DEMO_SITE` | `true` on demo hosts; `false` for live tenants. Bake at **build** time (login hint). The runner image also sets `AUTH_ALLOW_DEMO_USERS` to the same value so production `authorize()` matches the hint. |

3. **Deployment Method = Method 3: Use Docker Image** with image `ghcr.io/hackmods/union-communications:main`. **Never** leave this on Method 1 (git webhook) on a small CapRover droplet — see [audit/session-knowledge-2026-09-16-caprover-app-config-drift.md](../audit/session-knowledge-2026-09-16-caprover-app-config-drift.md). The CI `deploy` job hardens the CI path, but CapRover's webhook handler is independent and still OOMs.
4. Health check: `GET /api/health`. After deploy, the CI's post-deploy smoke should already have verified this; spot-check manually with `curl -sL https://<host>/api/health` and confirm `.commit` matches the SHA you just deployed.
5. **Public `unionops.org` host:** point the installable origin at apex `https://unionops.org`. Set `AUTH_URL=https://unionops.org` (same origin). Until `www` serves this app (or 301s to apex) with a trusted certificate, leave `www` off the PWA service-worker allowlist (`src/lib/pwa/hosts.ts`). After deploy, spot-check `curl -sI https://unionops.org/examples/` — `Location` must stay on `unionops.org`, not the CapRover hostname.

### When `deploy` job fails loud (secrets miss)

If `deploy` runs and fails:

```
::error::No CapRover deploy secrets and https://unionops.org/api/health did not report <sha> within ~5min.
```

When CLI secrets are unset, the job first **polls `/api/health` for ~10 min**. If CapRover's independent path (Method 1 webhook or a manual Method 3 force) already rolled this SHA, the job exits 0 with a `::warning::` that secrets are still missing. It only fails when tip of `main` never reaches the host. Method 1 rebuilds often finish just after the GHCR publish window, so the longer budget avoids false reds.

Three options to restore a working **Method 3** pull deploy:

1. Add the three secrets to the GH repo (Settings → Secrets → Actions). Subsequent pushes will auto-deploy.
2. Run the workflow via `workflow_dispatch` *and the secrets stay missing* — the health-poll soft path still applies; if the host is stale, it fails.
3. Use the `workflow_dispatch` with secrets **present on the GH repo**: the deploy step passes the secrets check, picks `:main` (or your `image_tag`), runs `caprover-cli`, polls `/api/health` smoke, done.

Suggested secret values for this host:

| Secret | Typical value |
|--------|----------------|
| `CAPROVER_SERVER` | `https://captain.behind7proxies.com` |
| `CAPROVER_APP` | CapRover app name (FQDN prefix, e.g. `union-communications`) |
| `CAPROVER_PASSWORD` | Captain password |

The third option is the cleanest when you're still toggling between webhook rebuilds and Method 3 in the CapRover UI — it lets you ship without waiting on the rebuild to OOM again.

CI on `main` deploys the pre-built image when `CAPROVER_SERVER`/`CAPROVER_PASSWORD`/`CAPROVER_APP` (GitHub Actions secrets) are set; otherwise it polls `/api/health` and **never** falls through to `CAPROVER_WEBHOOK_URL` (per [`.github/workflows/ci.yml:deploy`](../../.github/workflows/ci.yml)). The `workflow_dispatch` inputs above are the operator-side escape hatch for when the webhook OOMs.

## Hybrid backups

`/app/hybrid` encrypts export/import in the browser. Passphrases never leave the client. Hybrid is a backup preference today — it does not replace configuring a secure hosted store for live multi-user grievance data.

## Related

- Local setup: [`SETUP.md`](SETUP.md)
- Postgres durability: [`POSTGRES_OPS.md`](POSTGRES_OPS.md)
- CapRover + Postgres flip: [`CAPROVER_POSTGRES.md`](CAPROVER_POSTGRES.md)
- Security reporting: [`SECURITY.md`](../../SECURITY.md)

## Proxmox sandbox (internal)

For the CT 115 lab host (`192.168.0.115:3000`):

1. On your workstation: `npm run package:sandbox` → `unionops-src.tar.gz` (git archive, no `node_modules`).
2. Copy the tarball to the container (e.g. `/tmp/unionops-src.tar.gz`).
3. Overlay into `/root/unionops-src` (`tar -xzf` — do not wipe the tree with `rm -rf`).
4. Rebuild: `docker build -f docker/Dockerfile -t unionops:local .` with `BUILD_COMMIT_SHA` set to the deployed commit.
5. Restart the `unionops` container preserving env from `docker inspect` (never log `AUTH_SECRET`).
6. Verify: `npm run health:check` and `npm run test:smoke:sandbox` from your workstation.
