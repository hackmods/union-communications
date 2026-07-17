# Workforce Time Module

VeriClock-class time tracking for union locals and union-wide operations. **Not** employer bargaining-unit payroll — export and local records only.

## Status

| Slice | Status |
|-------|--------|
| **8-lite (v1)** | Shipped — memory adapter; clock in/out, job codes, approvals, CSV export |
| **8-lite+** | Shipped — manual/retro ranges, bulk event groups, expected windows, entry-needed tracking, union-business report |
| 8a Postgres + RLS | Blocked on Phase 6 |
| 8b–8f (full workers/sites, scheduling, PTO, GPS geofence UI, PDF/XLSX union rollup) | Planned |

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
- `GET/POST /api/time/windows`
- `GET /api/time/needed?from&to`
- `GET /api/time/export?from&to&category` — CSV
- `GET /api/time/report/union-business?from&to` — JSON totals + needed

## GPS (optional, v1-lite foundation)

- Tenant `moduleConfig.time.gpsPolicy`: `off` (default) | `tag_optional`
- Client may send `clockInGps` / `clockOutGps` on punch when user consents
- Geofence warn/block against `WorkSite` records — server-side in `src/lib/time/geofence.ts`
- No continuous tracking; no native apps / SMS / IVR

## Deferred (full Phase 8)

- Postgres persistence + RLS
- Full worker directory / sites admin (lite roster ships in 8-lite+)
- Scheduling, PTO balances/requests
- OT policy engine and pay periods
- PDF/XLSX export, union rollup dashboard
- Standing named groups (v1 uses ad-hoc multi-select only)
- Punch photo attachments (Phase 7 object storage)
- Hybrid slice inclusion
- Payroll vendor integrations

## Compliance

- Classify entries + GPS as **Highly Confidential**
- GPS consent stored per worker (`gpsConsentAt`) — full UI in 8e
- 7-year retention default per `docs/COMPLIANCE.md`

## Disclaimer

> Helps locals track union staff, release, and solidarity hours. Does not process payroll or provide legal advice. Reconcile exports with your payroll provider.
