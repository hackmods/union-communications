# Calendar & Meeting Reminders

Status: **review captured** — no union calendar product ships today. This spec documents what exists, what is deferred, and a realistic phased path if locals need monthly membership meeting support.

Related agent rule: [`.cursor/rules/calendar-meetings.mdc`](../../.cursor/rules/calendar-meetings.mdc)

## Executive summary

UnionOps helps officers **prepare** meeting outreach (ICS files, email drafts, printable notices) and **track grievance deadlines** in the hub. It does **not** push automated reminders for monthly membership meetings to officers or members.

| Need | Today | Gap |
|------|-------|-----|
| Monthly membership meeting config | Manual re-entry in Comms tools each month | `LocalMeetingSchedule` + recurrence |
| Officer reminders | Personal calendar via grievance ICS only | In-app banner; optional VALARM |
| Member reminders (public, minimal detail) | Board notice / graphic exports | Public "next meeting" snippet from tenant config |
| Email reminders | Copy-only grievance drafts | Transactional email infra (ARCHITECTURE v2+) |

## Shipped

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
| Board Notice | `/tools/board-notice` | `noticeType: "meeting"` — PNG/PDF export |
| Document Generator | `/tools/document-generator` | `quick-event` preset — membership meeting doc |
| Graphic Maker | `/tools/graphic-maker` | `meetingNotice` starter |
| Meeting Backgrounds | `/tools/meeting-background` | Virtual meeting branding |
| Website Template | `/tools/website-template` | Static site; `mailto:` contact — no calendar widget |

All Comms meeting tools are **announcement exports**. Nothing is stored server-side or delivered on a schedule.

### ICS limitations (`src/lib/calendar/ics.ts`)

- UTC formatting only; no `VTIMEZONE`
- No `RRULE` (recurring monthly meetings)
- No `VALARM` (calendar-native reminders)
- Export-only — no import or subscription feed

## Not shipped

- Union-wide calendar UI or `/app/meetings` hub route
- `CalendarEvent` / `UnionMeeting` data model (distinct from grievance `ScheduledMeeting`)
- Recurring monthly meeting configuration
- SMTP / transactional email, cron, push notifications
- Member email lists or `/member` portal
- Automated "remind N days before meeting"

**Planned (docs only):** ARCHITECTURE v2+ — "Transactional email for follow-up reminders only — no marketing email."

## Auth & surfaces

```text
Public Comms     → no login; officer types date/time/location; exports asset manually
Officer Hub      → login → MFA → grievance RBAC
  View           → list meetings, ICS download, email drafts
  Edit           → schedule meeting, log comms
Steward read-only → hides schedule form; ICS + drafts still available
/app/overdue     → grievance CA deadlines only
```

## Phased build order (if approved — not on current roadmap)

Current roadmap priority remains: **Postgres+RLS → onboarding UI → attachments**.

### Phase A — Local meeting config (no email)

- `LocalMeetingSchedule` in tenant config: title, recurrence, location, public vs internal description
- Hub UI to configure monthly meeting (settings or `/app/meetings`)
- Public "next meeting" snippet — date/time/location only
- Extend `ics.ts` for `RRULE:FREQ=MONTHLY`

### Phase B — Officer reminders (logged-in)

- In-app hub banner ("Membership meeting in 3 days")
- Optional ICS with `VALARM`
- Copy-only `membership_meeting_reminder` email draft template

### Phase C — Transactional email (requires v2 infra)

- Officer-only reminders; no marketing
- Cron/worker N days before meeting to opted-in officer emails
- Audit log + unsubscribe

### Phase D — Member-facing (minimal, public)

- Static "next meeting" block in Website Template export
- Optional public ICS subscribe URL (read-only)
- **Do not** build member email lists without PIPEDA/consent review (`docs/COMPLIANCE.md`)

### Hard dependencies

| Capability | Blocked on |
|------------|------------|
| Persisted meeting schedules | Postgres + RLS (roadmap #1) |
| Auto-send reminders | Transactional email provider + env config |
| Expanded notification surfaces | TOTP MFA (roadmap #7) |

## Supported workflow today (no new code)

| Audience | Workflow |
|----------|----------|
| Officers | Personal calendar recurring event; Board Notice / Document Generator each month |
| Members | Export board notice or graphic; post to board + social; Website Template for contact page |
| Grievance meetings | Hub grievance detail → schedule → ICS to calendars |

## Key files

| Area | Path |
|------|------|
| ICS utility | `src/lib/calendar/ics.ts` |
| Grievance meetings API | `src/app/api/grievances/[id]/meetings/route.ts` |
| Meeting UI | `src/components/grievance/GrievanceDetail.tsx` |
| Email drafts | `src/lib/grievance/email-templates.ts` |
| Board notice | `src/app/[locale]/tools/board-notice/page.tsx` |
| quick-event preset | `src/lib/constants/office-templates.ts` |
| Overdue (grievance) | `src/components/qol/OverdueDashboard.tsx` |
| Grievance module spec | `docs/modules/GRIEVANCE.md` |
| Comms backlog | `docs/modules/COMMS_BACKLOG.md` |

## Compliance

- Comms tools: on-device processing; no member data sent to servers
- Hosted hub: operator is data controller for officer data
- Member-facing email or subscription lists require consent review per `docs/COMPLIANCE.md` before Phase C/D
