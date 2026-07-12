# Phase 8 — Workforce Time (VeriClock-class)

**Status:** 8-lite shipped (memory adapter). Full phase blocked on Phase 6 Postgres+RLS.

## Product intent

Opt-in hub module for local and union-wide time operations — not employer bargaining-unit payroll.

| Category | Primary users | Typical use |
|----------|---------------|-------------|
| **Staff** | President, exec, union office | Paid staff hours, payroll-prep exports |
| **Release & duty bank** | Stewards, exec | Release time, duty-bank logs |
| **Action & solidarity** | Stewards, event leads | Picket/action, volunteer hours |

**Surface:** Web/PWA Officer Hub. Optional GPS on punch; geofence warn/block when GPS present. **Out of scope:** native apps, SMS/IVR, continuous GPS, payroll integrations.

## Roadmap placement

Phase 6 (Postgres) → Phase 7 (Attachments) → Phase 8 (Workforce Time full).

## 8-lite shipped

- Module `"time"` in registry + seed
- Clock in/out, job codes, submit/approve, CSV export
- `/app/time`, `/app/time/admin`
- Memory adapter + audit

## Remaining slices

- **8a** Postgres + RLS (Phase 6 prerequisite)
- **8b** Admin: workers, sites, OT/pay-period policies
- **8c** Scheduling + PTO
- **8d** Approvals bulk + PDF/XLSX + union rollup
- **8e** GPS consent UI + geofence map
- **8f** PWA polish, smoke tests, hybrid slice

## Non-goals

Employer bargaining-unit payroll, native mobile, continuous GPS, QuickBooks/Sage connectors.

Full spec: [`docs/modules/WORKFORCE_TIME.md`](../../docs/modules/WORKFORCE_TIME.md)
