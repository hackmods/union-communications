# Local Union Support Hub — Vision

## Product

**Local Union Support Hub** is a union-agnostic platform that empowers any local union to run professional communications, track grievances, and manage sector-specific workflows — without waiting on weak central comms.

**Tagline:** Professional tools for any local.

## Multi-Union by Design

The platform is **not** built for one union. OPSEU/CAAT is the **first adopter and reference tenant** (see `seed/reference-tenant-opseu-caat.json` when added in Phase 1). Any union can onboard with their own:

- Branding (colours, logo, local number)
- Collective agreement grievance step configuration
- Enabled modules (comms, grievance, college bumping, etc.)
- Division/sector structure (optional)

### Tenancy Hierarchy

```
Platform (you host)
  └── Union (e.g. OPSEU, CUPE, UNIFOR)
        └── Division / Sector (optional — e.g. CAAT, colleges)
              └── Local (e.g. Local 243)
                    └── Users (officers, stewards, solo accounts)
```

## Problem Statement

Union central communications are often under-resourced. Local executives and volunteer communicators need:

1. **Self-serve media tools** — guides, templates, image generation (shipped in v1 Comms)
2. **Grievance tracking** — dates, notes, follow-up emails, deadline awareness
3. **Sector workflows** — e.g. college bumping / stability committee PDF comparison

This hub fills the gap without replacing national union systems.

## Modules

| Module | Audience | Status |
|--------|----------|--------|
| **Comms** | All unions | v1 shipped (static) |
| **Grievance** | All unions (CA-configurable) | Phase 2 |
| **College Bumping** | Sector-optional (post-secondary) | Phase 3 |

## Deployment Models

1. **Central hub** (default) — You host; unions/locals log in; multi-tier RBAC
2. **Solo accounts** — Individual stewards without full local setup
3. **Hybrid** (Phase 4) — Paranoid locals: encrypted export + optional self-hosted data slice for grievance/bumping data while using central comms

## Non-Goals

- Replacing national union ERP/HR systems
- Providing legal advice or automated grievance decisions
- Favouring one union over another in product design
- Cross-union data sharing without explicit audited consent

## First Adopter

**CAAT OPSEU** (Support Staff) — your division launches first. Reference branding and assets live in `public/assets/caat-opseu/` and seed config; new signups choose their union during onboarding (Phase 1).

## Success Criteria

- Any local can onboard in under 15 minutes
- Zero cross-union data leakage
- WCAG 2.1 AA + PIPEDA/FIPPA compliance for confidential modules
- Bilingual EN/FR UI across all modules
