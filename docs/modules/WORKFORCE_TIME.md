# Workforce Time Module

VeriClock-class time tracking for union locals and union-wide operations. **Not** employer bargaining-unit payroll — export and local records only.

## Status

| Slice | Status |
|-------|--------|
| **8-lite (v1)** | Shipped — memory adapter; clock in/out, job codes, approvals, CSV export |
| 8a Postgres + RLS | Blocked on Phase 6 |
| 8b–8f (scheduling, PTO, GPS geofence UI, union rollup) | Planned |

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
- Stewards: clock and view own entries
- `local_exec` / `local_president`: view local, approve, manage job codes
- `union_admin` / `division_admin`: cross-local read (elevated list filters)

## v1-lite surfaces

| Path | Purpose |
|------|---------|
| `/app/time` | Worker dashboard — clock in/out, recent entries |
| `/app/time/admin` | Live board, job codes, approve entries, CSV export |

## API (v1-lite)

- `GET/POST /api/time/entries`
- `POST /api/time/entries/clock-in`
- `POST /api/time/entries/clock-out`
- `PATCH /api/time/entries/[id]` — submit or approve/reject
- `GET/POST /api/time/codes`
- `GET /api/time/export` — CSV by category/date range

## GPS (optional, v1-lite foundation)

- Tenant `moduleConfig.time.gpsPolicy`: `off` (default) | `tag_optional`
- Client may send `clockInGps` / `clockOutGps` on punch when user consents
- Geofence warn/block against `WorkSite` records — server-side in `src/lib/time/geofence.ts`
- No continuous tracking; no native apps / SMS / IVR

## Deferred (full Phase 8)

- Postgres persistence + RLS
- Scheduling, PTO balances/requests
- OT policy engine and pay periods
- PDF/XLSX export, union rollup dashboard
- Punch photo attachments (Phase 7 object storage)
- Hybrid slice inclusion
- Payroll vendor integrations

## Compliance

- Classify entries + GPS as **Highly Confidential**
- GPS consent stored per worker (`gpsConsentAt`) — full UI in 8e
- 7-year retention default per `docs/COMPLIANCE.md`

## Disclaimer

> Helps locals track union staff, release, and solidarity hours. Does not process payroll or provide legal advice. Reconcile exports with your payroll provider.
