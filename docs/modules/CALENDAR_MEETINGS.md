# Calendar & Meeting Reminders

Status: **Phase A + R1 + R3 shipped** (recurring local schedule + officer banner + public snippet; tokenized RSVP Hub events + `/r/[token]`; optional SMTP transactional email). Phases B/C/D member-facing auto-reminders and marketing email remain out of scope — see below.

Related agent rule: [`.cursor/rules/calendar-meetings.mdc`](../../.cursor/rules/calendar-meetings.mdc)

## Executive summary

UnionOps helps officers **prepare** meeting outreach (ICS files, email drafts, printable notices, offline RSVP sheets) and **track grievance deadlines** in the hub. It does **not** push automated reminders for monthly membership meetings to officers or members, and it does **not** ship a member portal.

| Need | Today | Gap |
|------|-------|-----|
| Need | Today | Gap |
|------|-------|-----|
| Monthly membership meeting config | **`LocalMeetingSchedule` + recurrence (shipped)** | — |
| Officer reminders | **In-app banner (shipped, 7-day window); optional VALARM on `.ics` (shipped)** | Transactional email (Phase C) |
| Member reminders (public, minimal detail) | **Public "next meeting" page/snippet (shipped)** | QR/embed wiring into Comms tools |
| RSVP collection | Offline Excel RSVP (Yes/No/Maybe + guests) | Tokenized public form + Hub tally (after Postgres) |
| Email reminders | Copy-only grievance drafts | Transactional email infra (ARCHITECTURE v2+) |

## Shipped — Phase A: Local meeting config (2026-07-23)

| Piece | Location |
|-------|----------|
| `LocalMeetingSchedule` entity | `src/types/meetings.ts` |
| Adapters (memory + optional Postgres) | `src/lib/meetings/{adapter,memory-adapter,drizzle-adapter,store}.ts`; `MEETINGS_DB_BACKEND=postgres`; migration `0018_local_meeting_schedule.sql` + RLS |
| Recurrence math | `src/lib/meetings/recurrence.ts` — monthly-by-date, monthly-by-nth-weekday, or custom date list; same UTC-wall-clock limitation as `ics.ts` (no real `VTIMEZONE`) |
| Hub settings page | `/app/meetings`, `src/components/meetings/MeetingScheduleSettings.tsx` — write gated to president/exec/admin (`canWriteMeetingSchedule`), read for any hub role |
| `.ics` with optional reminder | `buildIcsEvent({ ..., reminderMinutesBefore })` now emits a `VALARM` block |
| Officer banner | `src/components/hub/MeetingReminderBanner.tsx`, mounted in `[locale]/app/layout.tsx`; polls `GET /api/meetings/upcoming`; shows within 7 days; **no auto-email** |
| Public snippet/page | `/[locale]/meetings/[slug]`, `src/components/meetings/NextMeetingSnippet.tsx`, backed by public `GET /api/meetings/public/[slug]` — no login, no union/local ids, no member data |

**Not yet done from the original Phase A scope:** QR/embed wiring from the public page into Comms board-notice/flyer tools (link is share-copy only today).

## Also shipped (pre-existing)

### Officer Hub (authenticated — login + MFA + RBAC)

| Feature | Location | Notes |
|---------|----------|-------|
| Grievance meeting scheduler | `GrievanceDetail`, `POST /api/grievances/[id]/meetings` | Per-grievance `ScheduledMeeting`; memory adapter |
| ICS export | `src/lib/calendar/ics.ts` | Auto-download on schedule; re-download per meeting |
| Deadline ICS | `GrievanceDetail` | 1-hour block around CA step due date |
| Email drafts (copy-only) | `src/lib/grievance/email-templates.ts` | `step1_meeting` etc.; footer says "DRAFT — do not auto-send" |
| Overdue board | `/app/overdue`, `OverdueDashboard` | Grievance CA deadlines — **not** membership meetings |

### Public Comms (unauthenticated — client-only)

| Tool | Route | Meeting use |
|------|-------|-------------|
| Board Notice | `/tools/board-notice` | `noticeType: "meeting"` — PNG/PDF export + **copy-only RSVP invite email** (R0.5) |
| Document Generator | `/tools/document-generator` | `quick-event` — notice + **RSVP Excel** + **`.ics`** + PPTX |
| Graphic Maker | `/tools/graphic-maker` | `meetingNotice` starter |
| Meeting Backgrounds | `/tools/meeting-background` | Virtual meeting branding |
| Website Template | `/tools/website-template` | Static site; `mailto:` contact — no calendar widget |

All Comms meeting tools are **announcement / offline-tracking exports**. Nothing is stored server-side or delivered on a schedule.

### RSVP today (offline — Phase R0)

Document Generator → **Event notice** (`quick-event`), tuned for **hybrid LEC meetings** (on site + remote):

- Excel sheet with event header + **Quorum needed**
- Per person: Attending (Yes/No/Maybe), **How joining** (On site / Remote), Role/office, Guests (on site), Dietary, Accessibility, Notes
- **Quorum board:** Yes / Maybe / No + “Still short” vs quorum needed (Yes counts whether on site or remote)
- **Food order board:** On site Yes, Remote Yes, **Food heads** (= on-site Yes + their guests), Maybe on site
- Optional calendar file from **Calendar start / end** (`src/lib/calendar/event-ics.ts` → `buildIcsEvent`)
- **Copy-only RSVP invite email** (`src/lib/comms/event-email.ts`) — subject + body asking for Attending and On site / Remote (+ guests/dietary); Copy buttons + `mailto:` open-in-app. No auto-send, no reply collection
- ZIP can include DOCX + XLSX + ICS + PPTX

This is a **clipboard / clipboard-adjacent steward workflow**: send the invite from the officer’s own mail, fill the sheet from replies or at the door, keep PII on the officer’s device. It is **not** live attendance sync.

### Why the sample email is a public tool (not the Hub)

| Factor | Verdict |
|--------|---------|
| Data class | Announcement — no member PII, no case data |
| Auth | None needed; same class as the RSVP Excel / notice |
| Send | Copy-only / `mailto:` — no server, no auto-send |
| Home | Lives with the rest of the event pack in Document Generator |

The **grievance** email drafts stay in the Hub (`/api/grievances/[id]/email-draft`) because they carry confidential case context and require MFA + audit. The **event RSVP** invite is public because it carries none of that. Do not duplicate the grievance draft API for public event email.

**Primary real-life job:** know if the LEC will make quorum, and how many meals to order for people in the room — without counting remote attendees in the food total.

### ICS limitations (`src/lib/calendar/ics.ts`)

- UTC formatting only; no `VTIMEZONE`
- No `RRULE` (recurring monthly meetings)
- No `VALARM` (calendar-native reminders)
- Export-only — no import or subscription feed
- No `ATTENDEE` / `METHOD:REQUEST` (not a mail-based invite RSVP)

## Not shipped

- Automated "remind N days before meeting" **to members** (officer in-app banner + optional officer self-reminder email are shipped; member broadcast remains Phase D)
- Member email lists or `/member` portal
- Marketing / campaign email (forbidden — ADR-016)

## Auth & surfaces

```text
Public Comms     → no login; officer types date/time/location; exports asset manually
Officer Hub      → login → MFA → grievance RBAC
  View           → list meetings, ICS download, email drafts
  Edit           → schedule meeting, log comms
Steward read-only → hides schedule form; ICS + drafts still available
/app/overdue     → grievance CA deadlines only
```

## Better RSVP system — phased design

Stay aligned with multi-union + privacy rules: **no `/member` portal**, minimize PII, never hang membership RSVP off grievance APIs, Postgres before persistence.

```text
R0 Document Generator pack (shipped)
  → R0.5 matching invite email on Board Notice / printables (shipped)
  → R1 Hub event + token form
  → R2 officer prompts
  → R3 transactional mail
```

Buildable agent plan: [`.cursor/plans/hybrid_lec_rsvp_outreach.plan.md`](../../.cursor/plans/hybrid_lec_rsvp_outreach.plan.md)

### Phase R0 — Offline RSVP pack (Comms) ✅

| Piece | Detail |
|-------|--------|
| Surface | Document Generator `quick-event` |
| Persistence | None (browser export) |
| Schema | Name, Email, Phone, Role/office, Attending, How joining (On site/Remote), Guests, Dietary, Accessibility, Notes |
| Tallies | Quorum Yes (+ shortfall); Food heads = on-site Yes + guests |
| Calendar | `.ics` from `calendarStart` / `calendarEnd` |
| Invite email | Copy-only subject/body + `mailto:` asking Attending + On site/Remote |
| Why first | Zero new privacy surface; matches LEC hybrid + food-order workflow today |

### Phase R0.5 — Matching invite email on printable / board tools ✅

**Why:** Officers often start on **Board Notice** (print for the corridor board), not Document Generator. They still need the same RSVP ask (Attending + On site / Remote) without losing the hybrid quorum/food workflow.

| Piece | Detail |
|-------|--------|
| Primary surface | `/tools/board-notice` when `noticeType` is `meeting` or `event` |
| Builder | **Reuse** `src/lib/comms/event-email.ts` — do not fork |
| UI | Shared `InviteEmailPanel` (`src/components/tools/InviteEmailPanel.tsx`) on Board Notice + Document Generator |
| Field map | `headline→title`, `date`, `time`, `location`, `contact→contactName`; optional `quorumNeeded` input on meeting notices |
| RSVP sheet + ICS | Deep-link to Document Generator Event notice — not duplicated on Board Notice |
| Out of scope | Hub, auto-send, canvas QR, Meeting Backgrounds, `/r/[token]` |

**Insights to preserve when building**

1. Printable poster ≠ reply collector — keep invite email as an **adjacent step**, not burned into the PNG by default
2. Calendar `.ics` remains best on Document Generator (has `calendarStart`/`calendarEnd`); Board Notice can deep-link “Need the RSVP sheet + calendar pack? Open Event notice” rather than duplicating Excel/ICS
3. Public tool only — same privacy line as Document Generator

### Phase R1 — Hub event + public token form (after Postgres + RLS)

Do **not** reuse `ScheduledMeeting` (grievance-scoped, Confidential).

| Entity | Scope | Fields (minimal) |
|--------|-------|------------------|
| `UnionMeeting` | `unionId` + `localId` (+ optional `bargainingUnitId`) | title, startsAt, endsAt, location, publicBlurb, `quorumNeeded?`, `hybrid: true`, createdBy |
| `RsvpToken` | meeting id | opaque token, expiresAt, revoked |
| `RsvpResponse` | meeting id | `attending` (yes/no/maybe), **`joinMode` (on_site \| remote)** required when yes/maybe, displayName, optional email/phone, guestsOnSite, dietaryNote, accessibilityNote, roleOrOffice?, createdAt, source (`public_form` \| `officer_entry`) |

**Hub tallies (must match R0 meaning)**

| Metric | Formula |
|--------|---------|
| Quorum count | `attending = yes` (on site **or** remote) |
| Quorum shortfall | `max(0, quorumNeeded − quorum count)` |
| On-site Yes | `attending = yes` ∧ `joinMode = on_site` |
| Remote Yes | `attending = yes` ∧ `joinMode = remote` |
| Food heads | on-site Yes + sum(`guestsOnSite` for those rows) |

**Surfaces**

1. **Hub** `/app/meetings` (or settings subsection) — officers create the meeting, set quorum needed, copy share link, see **quorum + food** tallies, export CSV/Excel, enter walk-ins
2. **Public form** `/r/[token]` — **not** a member portal: date/time/location + name + Attending + **On site / Remote** (+ dietary when on site). No login, no grievance data, no strategy notes
3. **Comms bridge** — QR on board notice / event flyer pointing at the token URL (generate in Hub, paste into Comms tools)

**Access**

- Write meeting / revoke token: president / local admin (mirror other Hub write gates)
- View tallies: officers with local access
- Public POST: rate-limited, token-bound, no cross-union leakage (`unionId` on meeting row + RLS)

**Hard no**

- Member accounts, dashboards, or grievance-linked RSVPs
- Marketing broadcast lists collected from RSVP emails without separate consent copy

### Phase R2 — Officer reminders (logged-in)

- Hub banner: “LEC in 3 days — quorum N/Need · food heads F (on site)”
- Optional ICS `VALARM` on membership meeting export
- Copy-only `membership_meeting_reminder` draft that includes the public RSVP link

### Phase R3 — Transactional email ✅ shipped 2026-07-24

- [x] SMTP via `nodemailer` (`src/lib/email/send.ts`) gated by `EMAIL_ENABLED=true` (ADR-016)
- [x] Officer-only reminder: `POST /api/meetings/events/[id]/remind-email` → `session.user.email` only
- [x] Optional one-shot RSVP confirmation when `consentEmailConfirm` + email on public submit
- [x] Audit log on every send/skip; no marketing campaigns / grievance content on this path

### Mapping to meeting-reminder phases A–D

| Reminder phase | RSVP relation |
|----------------|---------------|
| A Local meeting config | Feeds default title/location into `UnionMeeting` |
| B Officer reminders | R2 banner uses RSVP tallies |
| C Transactional email | R3 |
| D Public next-meeting snippet | Can show date/time only; link to active token optional |

### Hard dependencies

| Capability | Blocked on |
|------------|------------|
| Persisted meetings / RSVPs | Postgres + RLS (roadmap #1) — memory + optional `MEETINGS_RSVP_DB_BACKEND=postgres` available |
| Auto-send reminders | Operator SMTP config (`EMAIL_ENABLED` + `SMTP_*`) — helper shipped |
| Expanded notification surfaces | TOTP MFA (roadmap #7) |
| Member email lists | PIPEDA/consent review (`docs/COMPLIANCE.md`) — still discouraged |

## Phased build order — meeting config (if approved)

Current roadmap priority remains: **Postgres+RLS → onboarding UI → attachments**. Meeting config + live RSVP come after that.

### Phase A — Local meeting config (no email) ✅ shipped 2026-07-23

- [x] `LocalMeetingSchedule` (own adapter/store, not tenant config JSON): recurrence, location, public vs internal description
- [x] Hub UI to configure the meeting (`/app/meetings`)
- [x] Public "next meeting" snippet/page — date/time/location only
- [~] Recurrence computed in `recurrence.ts` (monthly-by-date, monthly-by-nth-weekday, custom dates) rather than an ICS `RRULE` string — the exported `.ics` is still a single `VEVENT` for the next occurrence, not a recurring `RRULE:FREQ=MONTHLY` (`ics.ts` limitations unchanged)

### Phase B — Officer reminders (logged-in)

- [x] In-app hub banner ("Membership meeting in N days") — `MeetingReminderBanner`, 7-day window
- [x] Optional ICS with `VALARM` — `reminderMinutesBefore` on `buildIcsEvent`
- [ ] Copy-only `membership_meeting_reminder` email draft template

### Phase C — Transactional email ✅ shipped 2026-07-24 (ADR-016)

- [x] Officer-only self-reminders via SMTP; no marketing
- [x] Audit log on send/skip
- [ ] Cron/worker N days before meeting (still deferred — opt-in button / API only today)

### Phase D — Member-facing (minimal, public)

- Static "next meeting" block in Website Template export
- Optional public ICS subscribe URL (read-only)
- Token RSVP form from Phase R1 (not a portal)
- **Do not** build member email lists without PIPEDA/consent review (`docs/COMPLIANCE.md`)

## Supported workflow today

| Audience | Workflow |
|----------|----------|
| Officers | Document Generator Event notice → print flyer + fill RSVP sheet / share `.ics`; or personal calendar recurring event |
| Members | See board notice / graphic; RSVP offline via steward or paper sheet |
| Grievance meetings | Hub grievance detail → schedule → ICS to calendars (**not** membership RSVP) |

## Key files

| Area | Path |
|------|------|
| ICS utility | `src/lib/calendar/ics.ts` |
| Event ICS from Comms fields | `src/lib/calendar/event-ics.ts` |
| RSVP Excel | `src/lib/export/office-export.ts` (`renderEventRsvpXlsx`) |
| RSVP invite email (copy-only) | `src/lib/comms/event-email.ts` |
| Invite email UI (shared) | `src/components/tools/InviteEmailPanel.tsx` |
| Board notice field map | `src/lib/comms/event-email-from-notice.ts` |
| Grievance meetings API | `src/app/api/grievances/[id]/meetings/route.ts` |
| Meeting UI | `src/components/grievance/GrievanceDetail.tsx` |
| Email drafts | `src/lib/grievance/email-templates.ts` |
| Board notice | `src/app/[locale]/tools/board-notice/page.tsx` |
| quick-event preset | `src/lib/constants/office-templates.ts` |
| Overdue (grievance) | `src/components/qol/OverdueDashboard.tsx` |
| Grievance module spec | `docs/modules/GRIEVANCE.md` |
| Comms backlog | `docs/modules/COMMS_BACKLOG.md` |
| `LocalMeetingSchedule` type | `src/types/meetings.ts` |
| Meetings adapters/store | `src/lib/meetings/{adapter,memory-adapter,drizzle-adapter,store}.ts` |
| Recurrence math | `src/lib/meetings/recurrence.ts` |
| Meetings access/validation/session | `src/lib/meetings/access.ts`, `src/lib/validation/meetings.ts`, `src/lib/auth/meetings-session.ts` |
| Meetings APIs | `src/app/api/meetings/{schedule,upcoming}/route.ts`, `src/app/api/meetings/public/[slug]/route.ts` |
| Hub settings UI | `src/app/[locale]/app/meetings/page.tsx`, `src/components/meetings/MeetingScheduleSettings.tsx` |
| Officer banner | `src/components/hub/MeetingReminderBanner.tsx` |
| Public page + snippet | `src/app/[locale]/meetings/[slug]/page.tsx`, `src/components/meetings/NextMeetingSnippet.tsx` |

## Compliance

- Comms tools: on-device processing; offline RSVP sheets keep member contact details on the officer device
- Hosted hub: operator is data controller for officer data and any future `RsvpResponse` rows
- Public token form (R1): collect only what is needed for headcount / accessibility; retention policy required before production
- Member-facing email or subscription lists require consent review per `docs/COMPLIANCE.md` before Phase C/D / R3
