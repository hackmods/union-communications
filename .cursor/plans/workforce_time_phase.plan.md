# Phase 8 — Workforce Time (VeriClock-class)

**Status:** 8-lite + 8-lite+ shipped (memory adapter). Full phase blocked on Phase 6 Postgres+RLS.

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

## 8-lite+ shipped

- Manual/retro time ranges (`manual_range`)
- Bulk union-business events (ad-hoc multi-worker group, shared `eventId`)
- Lite worker roster + expected windows
- Entry-needed: expected-window miss + weekday gaps (`trackGaps`)
- Union-business report + CSV `from`/`to` + event columns

## Remaining slices

- **8a** Postgres + RLS (Phase 6 prerequisite)
- **8b** Admin: full workers, sites, OT/pay-period policies (lite roster already in 8-lite+)
- **8c** Scheduling + PTO
- **8d** Approvals bulk + PDF/XLSX + union rollup
- **8e** GPS consent UI + geofence map
- **8f** PWA polish, smoke tests, hybrid slice

## Non-goals

Employer bargaining-unit payroll, native mobile, continuous GPS, QuickBooks/Sage connectors.

Full spec: [`docs/modules/WORKFORCE_TIME.md`](../../docs/modules/WORKFORCE_TIME.md)
