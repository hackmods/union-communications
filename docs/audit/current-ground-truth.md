# Current ground truth (agents) — as of 2026-07-24

**Purpose:** Replace stale claims in the 2026-07-22 audit snapshot (`active-context.md`, older roadmap-next bullets). Prefer this file + `docs/PROGRESS.md` + module specs when sequencing work. Generated from post-audit shipping through Calendar R2 / Time 8b / FEAT-004 follow-ups.

**Session narrative + lessons (Hub MFA, Proxmox sandbox, password-reset, Time 8c.1):** [`session-knowledge-2026-07-24.md`](session-knowledge-2026-07-24.md)

## Do not re-open as if missing

| Topic | Reality | Why it mattered |
|-------|---------|-----------------|
| Audit sprint Phases 1–4 | Closed | Security, Postgres adapters (flagged), FEAT/ORG/TOOL/UX tickets shipped |
| Postgres adapters | Exist behind `*_DB_BACKEND` (default **memory**) | Ops flip per host; not a code gap. Durability banner remains until flipped |
| Calendar R0 / R0.5 / R1 / R2 / R3 | Shipped (cron member auto-send deferred) | Banner tallies were already in `MeetingReminderBanner`; R2 gap was **copy-only Hub reminder draft**, not tallies |
| Time 8a | Shipped (`TIME_DB_BACKEND`) | Module docs wrongly said “blocked on Phase 6” |
| Time 8b | Shipped 2026-07-24 | Sites/geofence admin, bulk approve, XLSX/PDF — **not** scheduling/PTO |
| Time 8c.1 | Shipped 2026-07-24 | Leave requests only — **not** accrual balances or scheduling |
| FEAT-003 case-detail tasks | Shipped | API already filtered by `relatedGrievanceId` / `relatedBumpingCaseId`; only UI panel was missing |
| FEAT-004 outcome | Entity+API earlier; UI/export/`appealDays` closed 2026-07-24 | `appealDays` ≠ `responseDays` (Arbitration often has `responseDays: null`) |

## Three email/reminder surfaces (do not conflate)

| Surface | Where | Send model | File |
|---------|-------|------------|------|
| Public RSVP **invite** | Comms tools (Document Generator, Board Notice) | Copy / `mailto:` only | `src/lib/comms/event-email.ts`, `InviteEmailPanel` |
| Hub **officer reminder draft** (R2) | `/app/meetings` Events board | Copy / `mailto:` only; includes public `/r/{token}` when active | `src/lib/comms/membership-meeting-reminder.ts` |
| Hub **SMTP self-remind** (R3) | `POST .../remind-email` | Opt-in `EMAIL_ENABLED`; officer’s own inbox only | `src/lib/email/send.ts` |

Never put public meeting RSVP invite copy on grievance email-draft APIs. Never treat Calendar Accept/Decline as quorum/food tracking.

## Time Phase 8 slicing (locked)

- **Ship incrementally** on existing `TimeAdapter` → API → admin UI patterns.
- **8b (done):** sites CRUD + geofence fields, bulk approve, XLSX/PDF rollup.
- **8c.1 (done):** PTO **leave requests** only (`/api/time/pto`) — no accrual ledger.
- **Defer 8c.2+:** scheduling, PTO accrual, OT/pay-period engine, hybrid time slice, punch photos — new domain entities, not plumbing.
- Saying “Workforce Time 8b+” / “8c” in planning means the **named slice**, not full VeriClock, unless product explicitly expands scope.

## Grievance outcome / appeal window

- Record via `GET/POST /api/grievances/[id]/outcome`; UI on `GrievanceDetail`.
- Export bundle includes `outcome` + `appealDueDate`.
- Optional `GrievanceStep.appealDays` = calendar days after `GrievanceOutcome.decidedAt` — tracking aid only; always disclaimer / verify CA.
- Reference seed Arbitration steps use `appealDays: 30` (tenant config, not hardcoded in UI logic).

## Related tasks on cases

- Use `RelatedTasksPanel` + existing task list filters — **no new task API**.
- Mount on both `GrievanceDetail` and `BumpingCaseDetail`.

## Stale doc traps (fix when touching)

- `docs/audit/active-context.md` — July 22 snapshot (no Drizzle, plaintext MFA, etc.); historical.
- Older `roadmap-next.mdc` bullets listing Postgres/onboarding/R0.5 as “next” — superseded by this file + updated rule.
- `PROGRESS.md` R0.5 “planned” checkbox — mark shipped when editing that section.
- `event-rsvp-outreach.mdc` “Planned next (R0.5)” — R0.5 shipped; Hub reminder is a **different** builder.

## Hub / auth gotchas (shipped 2026-07-24)

| Topic | Reality |
|-------|---------|
| MFA-off Hub | Client must use `useSessionMfaOk()` / `MfaPolicyProvider` — raw `mfaVerified` falsely walls the Hub when MFA is disabled |
| Bumping label | UI: **Stability Committee** — module id/route remain `bumping` |
| Demo on prod image | Need `AUTH_ALLOW_DEMO_USERS=true` (or runtime demo flag); `NEXT_PUBLIC_DEMO_SITE` alone may not unlock server demo roster |
| Password-reset | Shipped — memory tokens; exclude demo roster; proxy allowlist for forgot/reset pages |

## Sandbox / E2E (ops)

- Proxmox CT **115** `unionops-sandbox` @ `192.168.0.115:3000` (Docker LXC).
- GHCR `:main` can lag — build from source for truth.
- Remote smoke: `PLAYWRIGHT_BASE_URL=http://192.168.0.115:3000` (skips local `webServer`).
- Never commit `proxmox_mcp.log` (gitignored).

## Sensible next candidates

1. Time **8c.2** scheduling / shift roster
2. PTO accrual balances (8c.3)
3. Optional cron officer self-reminders (email infra exists; still opt-in / no member lists)
4. Graphic Maker optional invite panel (R0.5 stretch — not blocking)
5. Ops Postgres backend flips + real scanner on durability hosts
6. Durable Postgres `password_reset_tokens` table (memory tokens today)
7. COMMS email/broadcast guide (fifth-channel deferral still stands)

**Shipped this pass:** COMMS First week Print step + remaining “Social Media Plan” → “First week” copy sweep (2026-07-24).
**Shipped:** Hub MFA-off UX + Stability Committee rename + density; password-reset; Time **8c.1** PTO leave requests.

## Agent habits reinforced this session

- Before “implement next roadmap item,” **diff docs vs code** — several “next” items were already partially or fully shipped.
- Prefer closing named follow-ups / **bounded slices** (“next phase go” ≠ full VeriClock) over greenfield Phase 8c.
- Scope “full Phase 8” language down to numbered slices in `docs/modules/WORKFORCE_TIME.md`.
- Update EN+FR, module spec, `PROGRESS.md`, and the relevant `.cursor/rules/*.mdc` in the same milestone as code.
- When access helpers change arity, grep all call sites — Docker build catches what unit tests miss.
- Prove Hub demos against sandbox with demo auth enabled before calling the site healthy.
