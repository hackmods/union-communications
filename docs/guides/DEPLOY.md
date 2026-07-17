# Deploy

UnionOps — stewarded by Ryan Morris.

If **you** host an instance, **you** are the data controller for data that instance stores (sessions, Officer Hub records, future database). Prefer Canadian hosting for confidential modules. Comms graphics tools remain on-device in the browser; the Officer Hub does not.

## Production checklist

1. Set a unique `AUTH_SECRET` (`openssl rand -base64 32`) — never use the repo placeholders.
2. Set `AUTH_URL` to your public HTTPS origin (no trailing slash).
3. Set your union’s default brand (optional but recommended for a white-label host):
   - Edit `config/host-brand.json` before build, or
   - `npm run brand:set -- --primary=#… --secondary=#… --local=… --sub="…"`, or
   - Pass `NEXT_PUBLIC_BRAND_PRIMARY` / `SECONDARY` / `ACCENT` and `NEXT_PUBLIC_DEFAULT_LOCAL_NUMBER` / `SUB_TEXT` as container env (see `.env.example`).
4. Do **not** rely on demo accounts (`demo123`) for real grievances or member files. On workshop/demo hosts, set `NEXT_PUBLIC_DEMO_SITE=true` so the authenticated hub shows a Demo banner; turn that off for real tenant instances.
5. Confirm health: `GET /api/health` → `{"status":"ok"}`.
6. Read the two-tier privacy model in the site Privacy page and [`docs/COMPLIANCE.md`](../COMPLIANCE.md).

## GHCR images

Containers publish to GitHub Container Registry from [`docker/Dockerfile`](../../docker/Dockerfile).

**Main tip** (after successful CI on `main` — see [`.github/workflows/ci.yml`](../../.github/workflows/ci.yml)):

```text
ghcr.io/hackmods/union-communications:main
ghcr.io/hackmods/union-communications:sha-<short>
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

Compose defaults use a local placeholder `AUTH_SECRET` — change it before any shared deployment.

## CapRover

This repo includes [`captain-definition`](../../captain-definition) pointing at `./docker/Dockerfile`.

1. Create an app; set **Container HTTP Port** to **3000** (not 80). A wrong port yields CapRover NGINX 502 even when logs say Ready.
2. App Configs (minimum):

| Variable | Example |
|----------|---------|
| `AUTH_SECRET` | output of `openssl rand -base64 32` |
| `AUTH_URL` | `https://your-app.example.com` |

Optional brand defaults — bake into the image at **build** time (`NEXT_PUBLIC_*` is inlined by Next.js). Prefer editing `config/host-brand.json` (or `npm run brand:set`) before `docker build` when you want a white-label host without env sprawl:

| Variable | Example |
|----------|---------|
| `NEXT_PUBLIC_BRAND_PRIMARY` | `#CE1126` |
| `NEXT_PUBLIC_BRAND_SECONDARY` | `#FFFFFF` |
| `NEXT_PUBLIC_BRAND_ACCENT` | `#9B0D1C` |
| `NEXT_PUBLIC_DEFAULT_LOCAL_NUMBER` | `79` |
| `NEXT_PUBLIC_DEFAULT_SUB_TEXT` | `Hospital Workers` |
| `NEXT_PUBLIC_OFFICER_HUB_PUBLIC` | `true` (Docker soft-launch default) |
| `NEXT_PUBLIC_DEMO_SITE` | `true` on demo hosts; `false` for live tenants |

3. Deploy via CapRover git push / webhook, or pull the GHCR tag if your CapRover setup uses a registry image.
4. Health check: `GET /api/health`.
5. **Public `unionops.org` host:** point the installable origin at apex `https://unionops.org`. Until `www` serves this app (or 301s to apex) with a trusted certificate, leave `www` off the PWA service-worker allowlist (`src/lib/pwa/hosts.ts`).

CI on `main` can POST `CAPROVER_WEBHOOK_URL` (GitHub Actions secret) after tests pass.

## Hybrid backups

`/app/hybrid` encrypts export/import in the browser. Passphrases never leave the client. Hybrid is a backup preference today — it does not replace configuring a secure hosted store for live multi-user grievance data.

## Related

- Local setup: [`SETUP.md`](SETUP.md)
- Security reporting: [`SECURITY.md`](../../SECURITY.md)
