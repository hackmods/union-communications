# Deploy

UnionOps — stewarded by Ryan Morris.

If **you** host an instance, **you** are the data controller for data that instance stores (sessions, Officer Hub records, future database). Prefer Canadian hosting for confidential modules. Comms graphics tools remain on-device in the browser; the Officer Hub does not.

## Production checklist

1. Set a unique `AUTH_SECRET` (`openssl rand -base64 32`) — never use the repo placeholders.
2. Set `AUTH_URL` to your public HTTPS origin (no trailing slash).
3. Do **not** rely on demo accounts (`demo123`) for real grievances or member files.
4. Confirm health: `GET /api/health` → `{"status":"ok"}`.
5. Read the two-tier privacy model in the site Privacy page and [`docs/COMPLIANCE.md`](../COMPLIANCE.md).

## GHCR release image

Tagged releases publish a container to GitHub Container Registry:

```text
ghcr.io/hackmods/union-communications:v0.1.0
ghcr.io/hackmods/union-communications:latest
```

Pull and run:

```bash
docker pull ghcr.io/hackmods/union-communications:v0.1.0
docker run --rm -p 3000:3000 \
  -e AUTH_SECRET="$(openssl rand -base64 32)" \
  -e AUTH_URL="https://your.domain.example" \
  ghcr.io/hackmods/union-communications:v0.1.0
```

Images are built from [`docker/Dockerfile`](../../docker/Dockerfile) on git tags matching `v*` (see [`.github/workflows/release.yml`](../../.github/workflows/release.yml)).

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

3. Deploy via CapRover git push / webhook, or pull the GHCR tag if your CapRover setup uses a registry image.
4. Health check: `GET /api/health`.

CI on `main` can POST `CAPROVER_WEBHOOK_URL` (GitHub Actions secret) after tests pass.

## Hybrid backups

`/app/hybrid` encrypts export/import in the browser. Passphrases never leave the client. Hybrid is a backup preference today — it does not replace configuring a secure hosted store for live multi-user grievance data.

## Related

- Local setup: [`SETUP.md`](SETUP.md)
- Security reporting: [`SECURITY.md`](../../SECURITY.md)
