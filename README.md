# Local Union Support Hub

A **multi-union** platform empowering any local union with professional comms tools, grievance tracking, and sector-specific workflows. OPSEU/CAAT is the first adopter — not a platform default.

## Modules

| Module | Status | Description |
|--------|--------|-------------|
| **Comms** | v1 shipped | Guides, templates, image generation (static, client-side) |
| **Grievance** | Phase 2 | Dates, notes, follow-up emails, CA-configurable steps |
| **College Bumping** | Phase 3 | PDF compare, stability committee notes (sector-optional) |

## Quick start

```bash
npm install
cp .env.example .env.local   # or set AUTH_SECRET manually
npm run dev        # http://localhost:3000/en
npm run build
npm run test:unit
npm run test:smoke
```

Set `AUTH_SECRET` (required for Auth.js in production):

```bash
openssl rand -base64 32
```

### CapRover deploy

In the app **HTTP Settings**, set **Container HTTP Port** to `3000` (Next.js listens on 3000, not 80). A wrong port causes CapRover's NGINX 502 page even when container logs show "Ready".

In **App Configs**, set at minimum:

| Variable | Example |
|----------|---------|
| `AUTH_SECRET` | output of `openssl rand -base64 32` |
| `AUTH_URL` | `https://union-communications.behind7proxies.com` |

Health check: `GET /api/health` → `{"status":"ok"}`

### Officer Hub (Phase 1)

- `/en/app/login` — demo credentials:
  - `president@local243.ca` / `demo123` (MFA required)
  - `stability@local243.ca` / `demo123` (stability committee, MFA required)
  - `steward@local243.ca` / `demo123` (read-only bumping, MFA required)
  - `solo@example.ca` / `demo123` (no MFA)
- `/en/app` — dashboard with module cards
- `/en/app/mfa` — enter any 6-digit code in dev mode

## Documentation

- [Vision](docs/VISION.md) — multi-union product scope
- [Architecture](docs/ARCHITECTURE.md) — technical design
- [Roadmap](docs/ROADMAP.md) — phased delivery (Phase 0 complete)
- [RBAC](docs/RBAC.md) — roles and tenancy
- [Compliance](docs/COMPLIANCE.md) — privacy and AODA
- [AGENTS.md](AGENTS.md) — Cursor agent guide
- [Reference tenant seed](seed/reference-tenant-opseu-caat.json) — OPSEU/CAAT first adopter

## Privacy

v1 comms: all processing on-device, no data sent to servers. v2+ confidential modules: Canadian hosting, encryption, MFA, audit logs.

## First adopter

CAAT OPSEU Support Staff — reference tenant seed. Any union can onboard with their own branding and CA configuration.
