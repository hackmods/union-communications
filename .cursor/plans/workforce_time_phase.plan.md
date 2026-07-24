# Phase 8 — Workforce Time (VeriClock-class)

**Status:** 8-lite + 8-lite+ + 8a (Postgres flag) + **8b admin** shipped. Scheduling/PTO/OT (8c+) remain planned.

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

## Remaining / shipped slices

- **8a** Postgres + RLS — shipped (`TIME_DB_BACKEND`, memory default)
- **8b** Sites CRUD + geofence admin + bulk approve + XLSX/PDF rollup — **shipped 2026-07-24**
- **8c** Scheduling + PTO — planned
- **8d** (partially covered by 8b exports) OT/pay-period policies — planned
- **8e** GPS consent UI polish — planned (punch GPS + site geofence exist)
- **8f** PWA polish, smoke tests, hybrid slice — planned

## Non-goals

Employer bargaining-unit payroll, native mobile, continuous GPS, QuickBooks/Sage connectors.

Full spec: [`docs/modules/WORKFORCE_TIME.md`](../../docs/modules/WORKFORCE_TIME.md)
