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
- [x] Multi-union onboarding UI (Phase 6 — memory overlay + invites)

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

## Phase 6 — Persistence, multi-scope & Onboarding (near-complete)

### Shipped (memory-backed)
- [x] ADR-013 Collection / BargainingUnit under Local
- [x] Multi-local + FT/PT reference seed (`locals`, `bargainingUnits`)
- [x] `resolveGrievanceConfig` (collection → union)
- [x] Hub context switcher (local + collection) + elevated cross-local access fix
- [x] Brand Kit v2 profiles (FT/PT) + Comms copy
- [x] Phase 7 scaffolds: audit UI, attachment API + scan stub, MFA fixed-code verify

### Remaining / shipped later in audit
- [x] PostgreSQL + Row-Level Security (`unionId` / `localId` / optional `bargainingUnitId`) — Drizzle migrations + `unionops_app` role; flip via `*_DB_BACKEND=postgres`
- [x] Replace memory adapters with DB-backed stores — per-module Drizzle adapters behind flags (default memory until operators flip)
- [x] `ApiAdapter` for hub clients — opt-in server persistence for Brand Kit + preferences (`/api/brand-kit`, `/api/preferences`); default remains `LocalStorageAdapter`
- [x] Multi-union tenant onboarding / invite UI (create locals + collections; runtime overlay; `/app/onboarding`, `/app/invites`, `/app/invite/[token]`)
- [ ] Hybrid live local data path (optional offline source of truth)

## Phase 7 — Attachments & Hardening (near-complete)

- [x] Attachment metadata API + memory adapter + scan stub (`skipped_dev`)
- [x] Audit log query UI (`/app/audit`) for elevated officers
- [x] MFA no longer accepts arbitrary 6-digit codes — `AUTH_DEV_MFA_CODE` / `AUTH_MFA_CODE` (default `000000`)
- [x] Object storage + real virus scanner — local FS + S3-compatible SSE-S3; ClamAV HTTP via `ATTACHMENT_SCANNER_URL`
- [x] Grievance detail UI for attachments — list/upload/download panel in `GrievanceDetail`, role-gated by `useStewardReadOnly`
- [x] Server-side bumping attachments (light) — `AttachmentAdapter.createForBumping`/`listForBumping`, `/api/bumping/cases/[id]/attachments`, UI panel in `BumpingCaseDetail` (`canWrite` gated); client-side PDF text-extract on the New Case form is unchanged
- [x] TOTP enrollment UI (`/app/mfa/setup`) — QR + manual secret, confirm-before-persist, demo-memory or Postgres `users` table depending on `AUTH_USERS_BACKEND`
- [ ] Retire `shared_code_insecure` as a viable production mode (make `totp` mandatory)

## Phase 8 — Workforce Time (VeriClock-class)

**8-lite + 8-lite+ shipped** — memory adapter; clock in/out, manual/retro ranges, bulk event groups, expected windows, entry-needed tracking, approvals, CSV + union-business report at `/app/time`.

- [x] Module `"time"` in registry + reference seed
- [x] Clock in/out for staff, release, duty bank, action, volunteer categories
- [x] Manual past ranges + admin bulk union-business entries
- [x] Expected windows + weekday gap “entry needed” board
- [x] Submit/approve workflow + admin board + date-scoped CSV / union-business report
- [x] Optional GPS punch tagging (client consent checkbox)
- [ ] Postgres + RLS persistence (requires Phase 6)
- [ ] Full workers/sites, scheduling, PTO, OT policies, PDF/XLSX union rollup
- [ ] Geofence admin UI + punch photo attachments (Phase 7)

Spec: [`docs/modules/WORKFORCE_TIME.md`](modules/WORKFORCE_TIME.md)

## Calendar & Meetings — Phase A (local schedule + banner + public snippet)

- [x] `LocalMeetingSchedule` entity (`unionId`, `localId`, monthly/custom recurrence, time, location, `publicBlurb`, timezone, `publicSlug`); memory + optional `MEETINGS_DB_BACKEND=postgres`, migration `0018_local_meeting_schedule` + RLS
- [x] Hub `/app/meetings` — configure schedule (president/exec/admin write, others read), computed next-meeting date, `.ics` download with optional `VALARM`, copy public share link
- [x] Officer in-app reminder banner (`MeetingReminderBanner`, reuses `DemoSiteBanner` layout pattern) — shows within 7 days of the next meeting, no auto-email
- [x] Public "next meeting" page `/meetings/[slug]` + reusable `NextMeetingSnippet` — no PII, no union/local ids, for embed/share
- [x] `RRULE`-equivalent recurrence math (`src/lib/meetings/recurrence.ts`) — monthly-by-date, monthly-by-nth-weekday, or custom date list
- [ ] Phase B/R1+ (tokenized RSVP, transactional email) remain — see `docs/modules/CALENDAR_MEETINGS.md`

## Reference Tenant

OPSEU/CAAT launches first. Seed: `seed/reference-tenant-opseu-caat.json`.

Agent guidance: `.cursor/rules/roadmap-next.mdc`, `.cursor/rules/hybrid-qol.mdc`.
