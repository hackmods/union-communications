# Roadmap

## Phase 0 — Platform Documentation — COMPLETE
- [x] VISION, ARCHITECTURE, RBAC, COMPLIANCE
- [x] Module specs (COMMS, GRIEVANCE, COLLEGE_BUMPING)
- [x] DATA_MODELS, AGENTS.md
- [x] Cursor rules split (platform, comms, grievance, bumping)
- [x] `seed/reference-tenant-opseu-caat.json`
- [x] ADRs 007–012

## Phase 1 — Platform Shell — COMPLETE
- [x] Auth (Auth.js), MFA scaffold
- [x] Module registry and hub nav
- [x] Audit log foundation
- [x] Refactor OPSEU/CAAT strings to tenant config
- [x] Package rename: `local-union-hub`
- [ ] Multi-union onboarding UI (deferred → Phase 6)

## Phase 2 — Grievance MVP — COMPLETE
- [x] CRUD, timeline, notes, deadlines
- [x] CAConfig per union
- [x] Email draft templates
- [x] Export grievance bundle

## Phase 3 — College Bumping MVP — COMPLETE
- [x] PDF upload and compare view
- [x] Committee sessions and notes
- [x] Sector module flag per union

## Phase 4 — Hybrid Mode — COMPLETE
- [x] Encrypted local export/import for grievance data
- [x] Optional browser encrypted local slice (backup)
- [x] Bumping cases included in hybrid slice when module enabled

## Phase 5 — QOL — COMPLETE
- [x] Officer handoff wizard
- [x] CA clause snippet library (union-uploaded)
- [x] Meeting scheduler (ICS export)
- [x] Member communication log
- [x] Overdue dashboard
- [x] Union template marketplace (within-union sharing)
- [x] Mobile steward read-only mode

## Phase 6 — Persistence & Onboarding (next)
- [ ] PostgreSQL + Row-Level Security (`unionId` / `localId`)
- [ ] Replace memory adapters with DB-backed stores
- [ ] `ApiAdapter` for hub clients
- [ ] Multi-union tenant onboarding / invite UI
- [ ] Hybrid live local data path (optional offline source of truth)

## Phase 7 — Attachments & Hardening
- [ ] Grievance document attachments + virus scan
- [ ] Server-side bumping PDF storage + virus scan
- [ ] Stronger MFA (replace dev 6-digit accept)
- [ ] Audit log query UI for officers

## Reference Tenant

OPSEU/CAAT launches first. Seed: `seed/reference-tenant-opseu-caat.json`.

Agent guidance: `.cursor/rules/roadmap-next.mdc`, `.cursor/rules/hybrid-qol.mdc`.
