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
npm run dev        # http://localhost:3000/en
npm run build
npm run test:unit
npm run test:smoke
```

## Documentation

- [Vision](docs/VISION.md) — multi-union product scope
- [Architecture](docs/ARCHITECTURE.md) — technical design
- [Roadmap](docs/ROADMAP.md) — phased delivery
- [RBAC](docs/RBAC.md) — roles and tenancy
- [Compliance](docs/COMPLIANCE.md) — privacy and AODA
- [AGENTS.md](AGENTS.md) — Cursor agent guide

## Privacy

v1 comms: all processing on-device, no data sent to servers. v2+ confidential modules: Canadian hosting, encryption, MFA, audit logs.

## First adopter

CAAT OPSEU Support Staff — reference tenant seed. Any union can onboard with their own branding and CA configuration.
