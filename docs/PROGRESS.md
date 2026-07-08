# Progress Log

## Milestone 1–10 — Comms v1 (2026-07-07)
Scaffold through testing/CI — all complete.

## Phase 0 — Platform Documentation (2026-07-08) — COMPLETE

- [x] `docs/VISION.md` — multi-union vision, tenancy, design principles
- [x] `docs/ARCHITECTURE.md` — stack, auth options, DataAdapter, RLS
- [x] `docs/RBAC.md` — roles matrix, solo accounts, invitation flow
- [x] `docs/COMPLIANCE.md` — PIPEDA, FIPPA, AODA, breach playbook
- [x] `docs/ROADMAP.md` — phases 0–5
- [x] `docs/DATA_MODELS.md` — entity reference
- [x] `docs/modules/COMMS.md`, `GRIEVANCE.md`, `COLLEGE_BUMPING.md`
- [x] `AGENTS.md` — Cursor agent entry point
- [x] ADRs 007–012 in `docs/DECISIONS.md`
- [x] `seed/reference-tenant-opseu-caat.json` — reference tenant seed
- [x] `.cursor/rules/platform.mdc` — hub-wide rules
- [x] `.cursor/rules/comms-module.mdc`, `grievance-module.mdc`, `bumping-module.mdc`
- [x] `.cursor/rules/project.mdc` — deprecated pointer to platform.mdc
- [x] Local 243 easter egg — `resolveLocalNumber()` in `src/lib/utils/local.ts`

## Phase 1 — Platform Shell (2026-07-08) — COMPLETE

- [x] Auth.js credentials provider + session JWT
- [x] MFA scaffold (`/app/mfa`, `POST /api/mfa/verify`, dev 6-digit accept)
- [x] Middleware protects `/app/*` (except login)
- [x] Tenant types + loader from `seed/reference-tenant-opseu-caat.json`
- [x] Module registry (`comms`, `grievance`, `bumping`) + hub nav
- [x] Hub routes: `/app`, `/app/login`, `/app/mfa`, grievance/bumping placeholders
- [x] MFA guard on confidential module pages
- [x] Audit log adapter foundation (memory adapter)
- [x] `BRAND_COLORS` from tenant loader; deprecated `CAAT_OPSEU_COLORS` alias
- [x] Package renamed to `local-union-hub`
- [x] Playwright uses `npm run dev` web server
- [x] Unit tests for tenant loader + module registry
- [ ] Multi-union onboarding UI (deferred — seed-only for now)
- [ ] `.env.example` (blocked by gitignore — document in README)

## Phase 2 — Grievance MVP (2026-07-08) — COMPLETE

- [x] Grievance types, memory adapter with seed data
- [x] CRUD API with MFA + RBAC + audit logging
- [x] Deadline calculator from CAConfig
- [x] Dashboard: open/overdue/upcoming counts
- [x] Create grievance, detail view with timeline
- [x] Immutable officer notes
- [x] CA step escalation checklist
- [x] Email draft templates (EN/FR) — copy only, never auto-send
- [x] Export grievance bundle (JSON + PDF in ZIP)
- [ ] Document attachments with virus scan (deferred)
- [ ] Persistent DB storage (memory adapter for MVP)

## Phase 3 — College Bumping MVP (2026-07-08) — COMPLETE

- [x] BumpingCase types, memory adapter with seed data
- [x] CRUD API with MFA + RBAC + audit logging
- [x] Module enabled check per tenant
- [x] Client-side PDF/text extraction (`pdfjs-dist`)
- [x] Side-by-side position diff viewer
- [x] Configurable comparison checklist
- [x] Committee sessions and notes
- [x] Decision record (committee decides — not auto-decided)
- [x] Decision log export (JSON + PDF in ZIP)
- [x] Demo user: `stability@local243.ca`
- [ ] Server-side PDF storage + virus scan (deferred)
- [ ] Persistent DB storage (memory adapter for MVP)

## Phase 4 — Hybrid Mode (next)
