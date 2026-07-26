# Current ground truth (agents) — as of 2026-07-26

**Purpose:** Replace stale claims in the 2026-07-22 audit snapshot (`active-context.md`, older roadmap-next bullets). Prefer this file + `docs/PROGRESS.md` + module specs when sequencing work.

**Session narrative + lessons (Hub → Proxmox → password-reset → Time 8c–8e → cron → GM invite):** [`session-knowledge-2026-07-24.md`](session-knowledge-2026-07-24.md)

## Do not re-open as if missing

| Topic | Reality | Why it mattered |
|-------|---------|-----------------|
| Audit sprint Phases 1–4 | Closed | Security, Postgres adapters (flagged), FEAT/ORG/TOOL/UX tickets shipped |
| Postgres adapters | Exist behind `*_DB_BACKEND` (default **memory**) | Ops flip per host; not a code gap |
| Calendar R0 / R0.5 / R1 / R2 / R3 | Shipped (cron **member** auto-send deferred) | R2 = Hub copy draft; R3 = SMTP self-remind |
| Cron officer reminders | Shipped 2026-07-25 | `/api/cron/meeting-reminders` + `CRON_SECRET`; roster emails only |
| Time 8a–8b | Shipped | Postgres flag; sites/geofence; bulk approve; XLSX/PDF |
| Time 8c.1–8c.3 | Shipped 2026-07-24/25 | PTO requests; shifts; accrual balances |
| Time 8d-lite / 8e | Shipped 2026-07-25 | Weekly OT CSV flag; pay-period snap; GPS consent |
| Graphic Maker notice invite | Shipped 2026-07-25 | `InviteEmailPanel` on notice layout (R0.5 stretch) |
| Pristine Office Templates | Shipped 2026-07-15 | Plan file todos may look pending — trust PROGRESS |
| Password-reset | Shipped | Memory default; durable Postgres when `AUTH_USERS_BACKEND=postgres` |
| FEAT-003 / FEAT-004 | Shipped | Related tasks panel; outcome UI/export/`appealDays` |

## Three email/reminder surfaces (do not conflate)

| Surface | Where | Send model |
|---------|-------|------------|
| Public RSVP **invite** | Document Generator, Board Notice, Graphic Maker notice | Copy / `mailto:` — `event-email.ts` |
| Hub **officer reminder draft** (R2) | `/app/meetings` Events board | Copy / `mailto:` — `membership-meeting-reminder.ts` |
| Hub **SMTP** (R3 + cron) | `remind-email` + `/api/cron/meeting-reminders` | Opt-in `EMAIL_ENABLED`; officer session or **roster** emails only |

Never member broadcast lists. Never put public invite copy on grievance email-draft APIs.

## Time Phase 8 slicing (locked)

- **8b:** sites/geofence, bulk approve, XLSX/PDF
- **8c.1:** leave requests — **8c.2:** shifts (no recurrence) — **8c.3:** manual accrual + approve debit
- **8d-lite:** weekly OT flag on CSV + 14-day pay-period snap — **not** full OT engine
- **8e:** `gpsConsentAt` + punch GPS gated on consent
- **Defer 8f:** hybrid time slice, punch photos — explicit product cut

## Hub / auth / ops gotchas

| Topic | Reality |
|-------|---------|
| MFA-off Hub | `useSessionMfaOk()` / `MfaPolicyProvider` — not raw `mfaVerified` |
| Demo on prod image | `AUTH_ALLOW_DEMO_USERS=true` |
| Sandbox | CT 115 @ `192.168.0.115:3000`; build from source (`npm run package:sandbox`); never commit `proxmox_mcp.log`; redeploy after train merges |
| Cron | `CRON_SECRET` required; Bearer or `x-cron-secret`; `?dryRun=1` previews without send/audit |
| React derived state | Do not sync `setState` in `useEffect` for consent flags — derive from roster |
| Production typecheck | `npx tsc --noEmit` / Docker build — unit tests miss route type errors (`#12`, `#13`) |

## Sensible next candidates

1. Ops: Postgres backend flips + real scanner on durability hosts — see [`docs/guides/POSTGRES_OPS.md`](../guides/POSTGRES_OPS.md)
2. ~~COMMS email/broadcast guide (fifth-channel)~~ — **shipped 2026-07-26** (`/guide/email-broadcast`); train #2 wired home, footer, First week, tools index
3. Time **8f** hybrid slice / punch photos (explicit cut)
4. ~~Optional: canvas tool axe color-contrast on brand-orange previews (6 smoke failures noted 2026-07-25)~~ — **shipped 2026-07-25** (`mutedInkOnBackground`)
5. Ops: redeploy sandbox + `npm run test:smoke:sandbox` after merges — see `DEPLOY.md` Proxmox section
6. ~~API route auth unit gap (cron / forgot-password)~~ — **shipped 2026-07-26** (train #3)
7. Ops: `npm run health:check` before sandbox smoke — **shipped 2026-07-26** (train #4)

## Agent habits

- Diff docs vs code before “implement next” — plan files and backlog tickets lag
- Bounded PRs; EN/FR + module spec + PROGRESS + rules in same milestone
- Grep access-helper call sites when signatures change
- Skip VISION non-goals (dues, member lists, Basecamp greenfield)
