# Comms backlog — content & discoverability

Ideas from the 2026-07 public nav review. Not scheduled for a phase; pick up when expanding past the four-channel v1.1 model, refreshing Get started, or redesigning the home landing.

Implementation surface today: [`HomeContent.tsx`](../../src/components/pages/HomeContent.tsx), `home.*` in `messages/en.json` + `fr.json`.

## Deferred content

### Email / member broadcast guide

- **Why:** Locals often use email or SMS alongside the four channels; there is no guide page today.
- **Defer until:** Product expands past social / print / boards / website, or we intentionally add a fifth channel.
- **Do not:** Add a nav stub with no page.

### Get started beyond social (rename + Print step) — PARTIAL (2026-07)

- **Shipped:** Page H1 / Header Learn label reframed to **First week** (EN/FR); route stays `/guide/social-media-plan`. Get started (when Brand Kit established) → First week, not a duplicate Brand Kit link. Learn → Guides includes First week. Tools mega-menu + `/tools` catalog.
- **Still open:**
  1. Insert an explicit **Print** step or checkpoint (Flyer Maker + `/guide/print`) — e.g. after boards, before socials.
  2. Sweep remaining workshop / cross-link copy that still says “Social Media Plan” where “First week” is clearer.
- **Do not:** Retarget Get started at `/guide/print` alone, or drop the socials/website steps.

### Landing page — align with site + desktop layout — SHIPPED (2026-07)

Implemented on `/` via `HomeContent.tsx` (hero band, path layout, Brand Kit rail, equal channel columns, closing CTAs, home-enter motion). Home copy uses first-week / print-aware language; plan page rename + Print step remain under **Get started beyond social** above.

## Shipped from the same review (2026-07)

- Learn → **By channel**: Print Guide, Union Boards Guide, Website Guide
- Footer: Print Guide + Tools catalog
- Brand Kit → Brand Asset Pack (`/assets`) on-page link
- Spec + agent rules: [`COMMS.md`](COMMS.md), `.cursor/rules/comms-public-nav.mdc`
- Landing page desktop layout + channel IA alignment (`HomeContent`)
- Photo consent / member media checklist at `/guide/photo-consent` (Learn → Guides; Resources + workshop links)
- First week H1 + Get started → roadmap when theme established; Tools mega-menu + `/tools` index

## Related deferred (not Comms v1)

### Local membership meeting calendar + reminders

- **Why:** Locals need monthly meeting awareness; UnionOps today only supports grievance ICS and manual Comms announcement exports.
- **Defer until:** Postgres + RLS (roadmap #1) for persisted schedules; transactional email (ARCHITECTURE v2+) before auto-send.
- **Spec:** [`CALENDAR_MEETINGS.md`](CALENDAR_MEETINGS.md), `.cursor/rules/calendar-meetings.mdc`
- **Shipped (R0 + R0.5):** Document Generator Event notice — hybrid LEC RSVP + `.ics` + copy-only invite email; Board Notice matching invite via `InviteEmailPanel` + `fieldsFromBoardNotice`.
- **Shipped (R1–R3 Hub):** token RSVP `/r/[token]`, banner tallies, SMTP opt-in, Hub copy-only officer reminder draft (`membership-meeting-reminder.ts`) — distinct from public invite email.
- **Optional stretch:** Graphic Maker `meetingNotice` invite panel if fields exist.
- **Do not:** Treat the email/broadcast guide above as implying a calendar ships with it; do not conflate public invite email with Hub R2 reminder draft (see `docs/audit/current-ground-truth.md`).
