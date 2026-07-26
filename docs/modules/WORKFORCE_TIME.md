# Workforce Time Module

VeriClock-class time tracking for union locals and union-wide operations. **Not** employer bargaining-unit payroll — export and local records only.

## Status

| Slice | Status |
|-------|--------|
| **8-lite (v1)** | Shipped — memory adapter; clock in/out, job codes, approvals, CSV export |
| **8-lite+** | Shipped — manual/retro ranges, bulk event groups, expected windows, entry-needed tracking, union-business report |
| **8a** Postgres + RLS | Shipped — `TIME_DB_BACKEND=postgres` (`DrizzleTimeAdapter`, migrations `0004`/`0005`); default remains memory |
| **8b** Sites / geofence admin + bulk approve + XLSX/PDF | Shipped (2026-07-24) — `/api/time/sites`, bulk-approve, `?format=xlsx\|pdf` export |
| **8c.1** PTO leave requests | Shipped (2026-07-24) — create/list/approve/reject/cancel; no accrual balances |
| **8c.2** Shift scheduling | Shipped (2026-07-24) — admin draft/publish shifts; worker upcoming list; optional `shiftId` on clock-in |
| **8c.3** PTO accrual balances | Shipped (2026-07-24) — set/adjust balances; approve decrements `hoursRequested` |
| **8d-lite** OT / pay-period | Shipped (2026-07-24) — weekly OT flag on CSV; 14-day pay-period snap (not full payroll) |
| **8e** GPS consent | Shipped (2026-07-24) — roster `gpsConsentAt` + punch UI |
| **8-full** VeriClock remainder | Shipped (2026-07-26) — workers directory, OT policy engine, shift recurrence, auto-accrual, named groups, payroll export hooks |
| **8f** hybrid slice + punch photos | Shipped (2026-07-26) — hybrid slice v1.1 includes time entries; optional punch photo attachments on clock in/out |

## Time categories (1D — all in one module)

| Category | Code | Users | Behaviour |
|----------|------|-------|-----------|
| Staff | `staff` | President, exec, union office | Hours for payroll-prep export |
| Release | `release` | Stewards, exec | Employer release time |
| Duty bank | `duty_bank` | Stewards, exec | Banked hours credit/debit |
| Action | `action` | Stewards, event leads | Picket/action shifts |
| Volunteer | `volunteer` | Stewards, solo | Solidarity hours (no pay fields) |

## Access

- MFA required (`requiresMfa: true` in module registry)
- Module opt-in: `enabledModules` includes `"time"`
- Every row scoped by `unionId` + `localId`
- Stewards: clock and view own entries; enter past ranges for self
- `local_exec` / `local_president`: view local, approve, manage job codes, bulk events, windows, roster, reports
- `union_admin` / `division_admin`: cross-local read (elevated list filters)

## Surfaces

| Path | Purpose |
|------|---------|
| `/app/time` | Worker dashboard — clock in/out, enter past time, needed callout, recent entries |
| `/app/time/admin` | Live board, bulk union business, expected windows, roster, needed board, union-business report, CSV export |

## Entry sources

| Source | How created | Initial status |
|--------|-------------|----------------|
| `clock` | Clock in/out | `active` → `completed` |
| `manual_range` | Worker (or admin) past range | `completed` (self) or `submitted` (admin-for-other) |
| `bulk_event` | Admin one range → many workers | `submitted` (shared `eventId`) |

Review flow unchanged: `completed` → submit → `submitted` → approve/reject.

## Entry needed (2a + 2c)

- **Expected windows:** admin defines label, range, attendees; missing overlapping `completed|submitted|approved` entry flags `expected_window`
- **Weekday gaps:** roster workers with `trackGaps` and no entry (and not already covered by a window that day) flag `weekday_gap`
- Overlap: creating a range that overlaps a non-rejected entry for the same worker is rejected

## API

- `GET /api/time/entries`
- `POST /api/time/entries/clock-in`
- `POST /api/time/entries/clock-out`
- `POST /api/time/entries/manual`
- `POST /api/time/entries/bulk-event`
- `PATCH /api/time/entries/[id]` — submit or approve/reject
- `GET/POST /api/time/codes`
- `GET/POST /api/time/workers`
- `GET/POST /api/time/sites` — work sites + geofence mode/radius
- `GET/POST /api/time/windows`
- `GET /api/time/needed?from&to`
- `GET /api/time/export?from&to&category&format=csv|xlsx|pdf`
- `POST /api/time/entries/bulk-approve` — `{ ids: string[] }`
- `GET /api/time/report/union-business?from&to` — JSON totals + needed
- `GET/POST /api/time/pto` — leave requests (8c.1)
- `PATCH /api/time/pto/[id]` — approve / reject / cancel / submit draft
- `GET/POST /api/time/pto/balances` — accrual balances (8c.3)
- `GET/POST /api/time/shifts` — shift schedule (8c.2)
- `PATCH /api/time/shifts/[id]` — publish / cancel / edit
- `GET/POST /api/time/groups` — standing named worker groups (8-full)
- `GET/POST /api/time/ot-policies` — OT policy engine (8-full)
- `GET/POST /api/time/shift-series` — recurring shift templates (8-full)
- `POST /api/time/shift-series/[id]/expand` — materialize shift instances (8-full)
- `GET/POST/PATCH /api/time/pto/accrual-policies` — auto-accrual formulas + run (8-full)
- `GET/POST /api/time/payroll-profiles` — vendor export profiles (8-full)
- `POST /api/time/payroll-export` — mapped CSV + optional webhook (8-full)
- `GET /api/time/entries/[id]/attachments` — punch photo metadata (8f)
- `GET /api/time/entries/[id]/attachments/[attachmentId]/download` — punch photo download (8f)

## GPS (optional, v1-lite foundation)

- Tenant `moduleConfig.time.gpsPolicy`: `off` (default) | `tag_optional`
- Client may send `clockInGps` / `clockOutGps` on punch when user consents
- Geofence warn/block against `WorkSite` records — server-side in `src/lib/time/geofence.ts`
- No continuous tracking; no native apps / SMS / IVR

## Deferred (post-8f)

- Live payroll vendor API connectors (export hooks only in 8-full)
- Punch photos in hybrid exports (attachments stay on hub by design)

## Shipped in 8d-lite / 8e (2026-07-24)

- CSV `ot_weekly_flag` via `weeklyOtFlags` (default 40h/week)
- Admin report “snap to 14-day pay period”
- Worker GPS consent stored on `TimeWorker.gpsConsentAt`; punch GPS disabled until consented

## Shipped in 8c.3 (2026-07-24)

- `PtoBalance` set/adjust (`GET/POST /api/time/pto/balances`)
- Approving a leave request with `hoursRequested` decrements that worker/type balance
- Balances surface on `PtoRequestsPanel`; admin can set absolute hours

## Shipped in 8c.2 (2026-07-24)

- `TimeShift` CRUD (`GET/POST /api/time/shifts`, `PATCH /api/time/shifts/[id]`)
- Admin schedule panel + worker upcoming shifts (`ShiftSchedulePanel`)
- Optional `shiftId` on clock-in when worker is assigned to a published shift
- Memory + Postgres (`time_shifts` + `time_entries.shift_id`) behind `TIME_DB_BACKEND`

## Shipped in 8c.1 (2026-07-24)

- Leave request CRUD (`GET/POST /api/time/pto`, `PATCH /api/time/pto/[id]`)
- Worker request form + admin approval queue on Time dashboards
- Memory + Postgres (`pto_requests` + RLS) behind `TIME_DB_BACKEND`
- No accrual ledger / balance math yet

## Shipped in 8b (2026-07-24)

- Work sites CRUD (`GET/POST /api/time/sites`) + admin geofence mode/radius UI
- Bulk approve submitted entries (`POST /api/time/entries/bulk-approve`)
- XLSX + PDF rollup export (`GET /api/time/export?format=xlsx|pdf`) alongside CSV

## Shipped in 8f (2026-07-26)

- Hybrid slice **v1.1** includes `timeEntries` when time module enabled (`GET/POST /api/hybrid/slice`); v1.0 slices still import
- `timeStore.importLocalSlice()` on memory + Drizzle adapters
- Optional punch photo on clock in/out (`punchPhoto` body field); stored via attachment adapter with `timeEntryId` + `punchKind`
- Worker dashboard file input + download routes for punch photos
- Migration `0029_time_8f.sql` — `clock_in_photo_attachment_id`, `clock_out_photo_attachment_id` on `time_entries`
- Punch photos **not** included in hybrid exports (hub-only attachments)

## Compliance

- Classify entries + GPS as **Highly Confidential**
- GPS consent stored per worker (`gpsConsentAt`) — full UI in 8e
- 7-year retention default per `docs/COMPLIANCE.md`

## Disclaimer

> Helps locals track union staff, release, and solidarity hours. Does not process payroll or provide legal advice. Reconcile exports with your payroll provider.
