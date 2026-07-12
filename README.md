# UnionOps

**Solidarity.**

Free tools for union stewards and officers — comms graphics, grievance tracking, and sector workflows. Multi-union by design. OPSEU/CAAT is the first adopter, not a platform default.

**Stewarded by Ryan Morris.** Source-available · all rights reserved · [LICENSE](LICENSE)

[![CI](https://github.com/hackmods/union-communications/actions/workflows/ci.yml/badge.svg)](https://github.com/hackmods/union-communications/actions/workflows/ci.yml)
[![License](https://img.shields.io/badge/license-Source--Available-blue)](LICENSE)
[![GHCR](https://img.shields.io/badge/image-ghcr.io%2Fhackmods%2Funion--communications-black)](https://github.com/hackmods/union-communications/pkgs/container/union-communications)
[![Node](https://img.shields.io/badge/node-%3E%3D22.13-brightgreen)](package.json)

Public site: [https://unionops.org](https://unionops.org)

## What it is

| Module | Status | Description |
|--------|--------|-------------|
| **Comms** | Shipped | Guides, templates, image generation (browser-side) |
| **Grievance** | Shipped | Dates, notes, follow-ups, CA steps, QOL tools |
| **College Bumping** | Shipped | PDF compare, stability committee notes (sector-optional) |
| **Hybrid** | Shipped | Encrypted local export/import (passphrase stays in-browser) |

## Privacy and data (read this)

UnionOps is **local-first for Comms**, not “no servers ever.”

| Surface | What happens to data |
|---------|----------------------|
| **Comms tools** | Graphics, brand kit, and uploads are processed in your browser. Brand kit lives in `localStorage`. No analytics. |
| **Officer Hub on a host you run** | Login sessions and hub records are handled by **that instance**. If you host it, **you** are the data controller. Prefer Canadian hosting for confidential modules. |
| **Evaluation / demo hub** | Demo accounts exist for workshops and CI. They are not for real member case files. |

Full policy: site Privacy page · [`docs/COMPLIANCE.md`](docs/COMPLIANCE.md) · [`SECURITY.md`](SECURITY.md)

## Quick start

```bash
npm ci
cp .env.example .env.local   # set AUTH_SECRET (openssl rand -base64 32)
npm run dev                  # http://localhost:3000/en
```

More detail: [`docs/guides/SETUP.md`](docs/guides/SETUP.md)

## Deploy

- **GHCR image:** `ghcr.io/hackmods/union-communications:vX.Y.Z` (published on version tags)
- **CapRover:** container port **3000**; set `AUTH_SECRET` and `AUTH_URL`
- **Health:** `GET /api/health` → `{"status":"ok"}`

Full guide: [`docs/guides/DEPLOY.md`](docs/guides/DEPLOY.md)

### Production checklist (short)

1. Unique `AUTH_SECRET` — never ship the repo placeholders
2. Correct public `AUTH_URL` (HTTPS, no trailing slash)
3. Do **not** use demo passwords (`demo123`) for real grievances
4. You host it → you own the compliance duty for that instance

## Officer Hub (development only)

Demo logins for local/CI (password `demo123`):

- `president@local243.ca` — MFA gate (dev accepts any 6-digit code)
- `stability@local243.ca`
- `steward@local243.ca`
- `solo@example.ca` — no MFA

Routes: `/en/app/login` · `/en/app` · `/en/app/mfa`

## Documentation

| Doc | Purpose |
|-----|---------|
| [Setup guide](docs/guides/SETUP.md) | Local install and tests |
| [Deploy guide](docs/guides/DEPLOY.md) | CapRover, Docker, GHCR |
| [Vision](docs/VISION.md) | Multi-union product scope |
| [Architecture](docs/ARCHITECTURE.md) | Stack and tenancy |
| [Roadmap](docs/ROADMAP.md) | Phases 0–5 complete; next work |
| [RBAC](docs/RBAC.md) | Roles |
| [Compliance](docs/COMPLIANCE.md) | Privacy and AODA |
| [Contributing](CONTRIBUTING.md) | Source-available contribution rules |
| [Security](SECURITY.md) | Vulnerability reporting |
| [Reference tenant seed](seed/reference-tenant-opseu-caat.json) | OPSEU/CAAT first adopter |

## First adopter

CAAT OPSEU Support Staff — reference tenant seed only. Any union can onboard with their own branding and CA configuration.

## Stewardship

UnionOps is stewarded by **Ryan Morris**, intended as a Canadian non-profit / community labour project. The code is source-available under [`LICENSE`](LICENSE): you may run and self-host for your local; redistribution and competing commercial hosting require written permission.

Solidarity.
