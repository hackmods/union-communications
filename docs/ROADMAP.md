# Roadmap

## Phase 0 — Platform Documentation (current)
- [x] VISION, ARCHITECTURE, RBAC, COMPLIANCE
- [x] Module specs (COMMS, GRIEVANCE, COLLEGE_BUMPING)
- [x] DATA_MODELS, AGENTS.md, Cursor rules
- [x] ADRs 007–012

## Phase 1 — Platform Shell
- Auth (Auth.js), MFA scaffold
- Multi-union tenant onboarding
- Module registry and hub nav
- Audit log foundation
- Refactor OPSEU/CAAT strings to tenant config
- Repo rename: `local-union-hub`

## Phase 2 — Grievance MVP
- CRUD, timeline, notes, deadlines
- CAConfig per union
- Email draft templates
- Export grievance bundle

## Phase 3 — College Bumping MVP
- PDF upload and compare view
- Committee sessions and notes
- Sector module flag per union

## Phase 4 — Hybrid Mode
- Encrypted local export/import for grievance data
- Optional self-hosted data slice

## Phase 5 — QOL
- Officer handoff wizard
- CA clause snippet library (union-uploaded)
- Meeting scheduler (ICS export)
- Member communication log
- Overdue dashboard
- Union template marketplace (within-union sharing)
- Mobile steward read-only mode

## Reference Tenant

OPSEU/CAAT launches first. Seed: `seed/reference-tenant-opseu-caat.json`.
