# UnionOps - Vision

## Product

**UnionOps** is a multi-union operating toolkit for a local or a union: communications, steward craft, and officer work. Comms stay free on the device. Case files live in Officer Hub.

**Slogan:** Solidarity.  
**Public domain:** https://unionops.org


## Multi-Union by Design

The platform is **not** built for one union. OPSEU/CAAT is the **first adopter and reference tenant** (see [`seed/reference-tenant-opseu-caat.json`](../seed/reference-tenant-opseu-caat.json)). Any union can onboard with their own:

- Branding (colours, logo, local number)
- Collective agreement grievance step configuration
- Enabled modules (comms, grievance, college bumping, etc.)
- Division/sector structure (optional)

### Tenancy Hierarchy

```
Platform (you host)
  └── Union (e.g. OPSEU, CUPE, UNIFOR)
        └── Division / Sector (optional - e.g. CAAT, colleges)
              └── Local (e.g. Local 243)
                    └── Collection / BargainingUnit (optional - e.g. FT / PT Support Staff)
                          └── Users (officers, stewards, solo accounts)
```

**Collection** = CA group under a local (product UI label). Code type: `BargainingUnit`. Used when one local has distinct CAs (full-time vs part-time Support Staff). Omit when a local has a single CA.

## Problem Statement

Union locals and unions need an operating toolkit they can run themselves — communications, steward craft, and officer work — without waiting on a weak central office, and without replacing national ERP or membership systems.

1. **Self-serve media tools** - guides, templates, image generation (shipped in v1 Comms)
2. **Steward craft** - floor playbooks and Officer Learning on the public site
3. **Officer casework** - grievance tracking, sector workflows, handoffs (Officer Hub)

This toolkit fills the gap without replacing national union ERP or membership systems.

## Modules

| Module | Audience | Status |
|--------|----------|--------|
| **Comms** | All unions | v1 shipped (static) |
| **Grievance** | All unions (CA-configurable) | Phase 2 |
| **College Bumping** | Sector-optional (post-secondary) | Phase 3 |

## Deployment Models

1. **Central hub** (default) - You host; unions/locals log in; multi-tier RBAC
2. **Solo accounts** - Individual stewards without full local setup
3. **Hybrid** (Phase 4) - Paranoid locals: encrypted export + optional self-hosted data slice for grievance/bumping data while using central comms

## What stays free

Public **Comms** tools stay free: they run on the volunteer’s device, with no ads and no paywall on a poster. Self-host remains permitted under [`LICENSE`](../LICENSE) — the local pays its own server.

**Officer Hub** and **Local Portal** hold real case files. If UnionOps hosts those for a local, hosting has a cost (enough to keep the service online, not a lock-in subscription). Do not tell volunteers the whole platform is “free forever.” Public copy lives on `/manifesto` (ADR-019).

## Non-Goals

- Replacing national union ERP/HR systems
- Providing legal advice or automated grievance decisions
- Favouring one union over another in product design
- Cross-union data sharing without explicit audited consent

## First Adopter

**CAAT OPSEU** (Support Staff) - your division launches first. Reference branding and assets live in `public/assets/caat-opseu/` and seed config; new signups choose their union during onboarding (Phase 1).

## Success Criteria

- Any local can onboard in under 15 minutes
- Zero cross-union data leakage
- WCAG 2.1 AA + PIPEDA/FIPPA compliance for confidential modules
- Bilingual EN/FR UI across all modules

## Repo / Naming

- **Public brand:** UnionOps (https://unionops.org); package name remains `local-union-hub`
- **Stewardship:** UnionOps — stewarded by Ryan Morris (source-available; see `LICENSE`)
- **UI branding:** Platform name is UnionOps; union name from tenant config after login
- **Operator docs:** [`docs/guides/SETUP.md`](guides/SETUP.md), [`docs/guides/DEPLOY.md`](guides/DEPLOY.md)
- **v1 code debt:** OPSEU/CAAT strings migrate to tenant config in Phase 1 - see `docs/modules/COMMS.md`

## Multi-Union Design Principles

1. No union names in core code - seed data and tenant config only
2. Every query tenant-scoped by `unionId`
3. Modules opt-in per union
4. CA/grievance steps configurable per union
5. Brand per-local (Brand Kit)
6. OPSEU is reference tenant #1 - not privileged in code paths
