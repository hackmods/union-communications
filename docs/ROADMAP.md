# Roadmap

## Phase 0 — Platform Documentation — COMPLETE
- [x] VISION, ARCHITECTURE, RBAC, COMPLIANCE
- [x] Module specs (COMMS, GRIEVANCE, COLLEGE_BUMPING)
- [x] DATA_MODELS, AGENTS.md
- [x] Cursor rules split (platform, comms, grievance, bumping)
- [x] `seed/reference-tenant-opseu-caat.json`
- [x] ADRs 007–012

## Phase 1 — Platform Shell
- Auth (Auth.js), MFA scaffold
- Multi-union tenant onboarding
- Module registry and hub nav
- Audit log foundation
- Refactor OPSEU/CAAT strings to tenant config
- Repo rename: `local-union-hub`

## Phase 2 — Grievance MVP — COMPLETE
- CRUD, timeline, notes, deadlines
- CAConfig per union
- Email draft templates
- Export grievance bundle

## Phase 3 — College Bumping MVP — COMPLETE
- PDF upload and compare view
- Committee sessions and notes
- Sector module flag per union

## Phase 4 — Hybrid Mode — COMPLETE
- [x] Encrypted local export/import for grievance data
- [x] Optional self-hosted data slice (browser encrypted localStorage)
- [x] Bumping cases included in hybrid slice when module enabled

## Phase 5 — QOL — COMPLETE
- [x] Officer handoff wizard
- [x] CA clause snippet library (union-uploaded)
- [x] Meeting scheduler (ICS export)
- [x] Member communication log
- [x] Overdue dashboard
- [x] Union template marketplace (within-union sharing)
- [x] Mobile steward read-only mode

## Reference Tenant

OPSEU/CAAT launches first. Seed: `seed/reference-tenant-opseu-caat.json`.
