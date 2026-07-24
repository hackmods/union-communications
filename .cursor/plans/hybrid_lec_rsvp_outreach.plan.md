---
name: Hybrid LEC RSVP outreach
overview: Extend the shipped Document Generator Event notice pack (hybrid RSVP Excel, .ics, copy-only invite email) to Board Notice and other printable meeting tools so officers can print a board poster and copy a matching RSVP invite email from the same fields — still public Comms, no Hub, no auto-send.
todos:
  - id: shared-invite-ui
    content: Extract reusable InviteEmailPanel (or hook) from Document Generator that wraps buildEventInviteEmail + copy/mailto actions
    status: completed
  - id: board-notice-step
    content: Add invite-email step/card to /tools/board-notice when noticeType is meeting (or event); map headline/date/time/location/contact → EventEmailFields
    status: completed
  - id: graphic-maker-optional
    content: Optional — when Graphic Maker starter is meetingNotice, show the same InviteEmailPanel (lower priority than board-notice)
    status: pending
  - id: i18n-docs
    content: EN/FR boardNotice (and graphic-maker if touched) strings; update CALENDAR_MEETINGS + PROGRESS when shipping
    status: completed
  - id: tests
    content: Unit-test field mapping helper; lint + targeted unit tests before commit
    status: completed
---

# Hybrid LEC RSVP outreach — Board Notice + printable tools

## Locked decisions (do not reopen)

| Decision | Choice |
|----------|--------|
| Sample RSVP invite email home | **Public Comms** — not Officer Hub |
| Grievance email drafts | Stay in Hub (`/api/grievances/[id]/email-draft`) — confidential |
| Send model | Copy-only + `mailto:` only — **no** SMTP / auto-send |
| Reply collection | Officer paste into RSVP Excel (or future `/r/[token]` after Postgres) |
| Calendar Accept/Decline | **Not** used for food/quorum — no on-site vs remote |
| Shared builder | Reuse [`src/lib/comms/event-email.ts`](../../src/lib/comms/event-email.ts) — do not fork copy |

Full product spec: [`docs/modules/CALENDAR_MEETINGS.md`](../../docs/modules/CALENDAR_MEETINGS.md)  
Agent rule: [`.cursor/rules/calendar-meetings.mdc`](../rules/calendar-meetings.mdc)

## Already shipped (R0)

Document Generator → **Event notice** (`quick-event`):

- Hybrid RSVP Excel (Attending + On site/Remote; quorum + food heads)
- `.ics` from Calendar start/end ([`event-ics.ts`](../../src/lib/calendar/event-ics.ts))
- Copy-only invite email UI on the page ([`event-email.ts`](../../src/lib/comms/event-email.ts))

## Next build (R0.5) — matching invite-email on printable tools

### Goal

Officers who start from **Board Notice** (print for the union board) should get the **same RSVP invite email** step without jumping to Document Generator — same ask: Attending + On site / Remote (+ dietary if on site).

### In scope

1. **`/tools/board-notice`** (primary)
   - When `noticeType === "meeting"` (and optionally `"event"`), show an **Invite email** card below the editor (or as a secondary step under export actions)
   - Map existing state → `EventEmailFields`:

     | BoardNoticeState | EventEmailFields |
     |------------------|------------------|
     | `headline` | `title` |
     | `date` | `date` |
     | `time` | `time` |
     | `location` | `location` |
     | `contact` | `contactName` |
     | — | `quorumNeeded` optional (add small Input only for meeting type, default empty) |
     | `body` | not required for email body (invite template has its own reply instructions) |

   - Reuse `buildEventInviteEmail` + `buildMailto` + `copyToClipboard`
   - Prefer extracting a small shared client component from Document Generator, e.g. `src/components/tools/InviteEmailPanel.tsx`, so both pages stay in sync
   - Keep PNG/PDF export unchanged; invite email is **adjacent outreach**, not printed on the board poster by default

2. **Graphic Maker `meetingNotice` starter** (optional / secondary)
   - Same panel if the starter exposes date/time/location/contact-equivalent fields; skip if fields are slogan-only
   - Do not block board-notice on this

### Out of scope (R0.5)

- Hub routes, MFA, or grievance APIs
- Auto-send, SMTP, cron
- Changing Board Notice canvas to include email QR (unless a follow-up explicitly asks)
- Live `/r/[token]` form (that is R1 — Postgres)
- Meeting Backgrounds (branding only — no event fields)

### UX notes

- One job for the email card: **copy outreach that matches the printed notice**
- Show privacy line: runs on device; no auto-send; paste replies into RSVP sheet (link to Document Generator Event notice for the Excel pack)
- EN/FR via `boardNotice.inviteEmail.*` (mirror `documentGenerator.inviteEmail.*` keys or share a nested `inviteEmail` namespace under `common` only if both already use identical copy — prefer tool-local keys to avoid coupling)

### Implementation sketch

```text
event-email.ts (shared builder)     ← already exists
InviteEmailPanel.tsx (shared UI)    ← extract from document-generator
board-notice/page.tsx               ← mount when meeting|event
document-generator/page.tsx         ← switch to InviteEmailPanel
```

Field mapper helper (unit-testable):

```ts
// e.g. src/lib/comms/event-email-from-notice.ts
export function fieldsFromBoardNotice(s: {
  headline: string;
  date: string;
  time: string;
  location: string;
  contact: string;
  quorumNeeded?: string;
}): EventEmailFields
```

### Acceptance

- [x] Board Notice + type Meeting: invite email subject/body reflect headline / when / where / contact
- [x] Copy subject, copy body, open mailto work
- [x] Switching notice type away from meeting/event hides the card
- [x] Document Generator still works (refactored to shared panel)
- [x] No new Hub surface; no network send
- [x] EN + FR strings; unit tests for mapper + existing `event-email.test.ts` still green

**Status:** R0.5 primary scope shipped. Optional Graphic Maker stretch remains open. Hub officer reminder draft is **R2** (`membership-meeting-reminder.ts`), not this plan.

## Later (not this slice)

| Phase | Work |
|-------|------|
| R1 | Hub `UnionMeeting` + `/r/[token]` with `joinMode` |
| R2 | Officer banner with quorum/food tallies |
| R3 | Transactional email (ARCHITECTURE v2+) |
