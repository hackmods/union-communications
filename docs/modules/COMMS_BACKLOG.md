# Comms backlog — content & discoverability

Ideas from the 2026-07 public nav review. Not scheduled for a phase; pick up when expanding past the four-channel v1.1 model, refreshing Get started, or redesigning the home landing.

Implementation surface today: [`HomeContent.tsx`](../../src/components/pages/HomeContent.tsx), `home.*` in `messages/en.json` + `fr.json`.

## Deferred content

### Email / member broadcast guide — SHIPPED (2026-07-26)

- **Shipped:** `/guide/email-broadcast` (EN/FR) — copy-only Comms invites vs Hub SMTP/cron; no marketing lists.
- **Nav:** Guides → By channel; Blueprint channel links; Resources path; sitemap; home website channel + footer + First week tertiary + tools index (train #2); guide cross-links (train #3).

### Printable seniority worksheet + right-to-refuse pocket card — SHIPPED (2026-07-26)

- **Shipped:** Document Generator preset `seniority-worksheet` (ExcelJS blank eligibility grid); deep-link `?preset=seniority-worksheet` from seniority playbook + Hub bumping case detail.
- **Shipped:** QR Link Card preset `rightToRefuse` (reference layout: Ontario OHSA s.43 steps + QR to guide); deep-link `?preset=rightToRefuse` from right-to-refuse guide boards callout.
- Guides remain the source of truth; exports are presentation-layer only (local-first, no new persistence).

### Get started beyond social (rename + Print step) — SHIPPED (2026-07-24)

- **Shipped:** Page H1 / Header Learn label reframed to **First week** (EN/FR); route stays `/guide/social-media-plan`. Get started (when Brand Kit established) → First week, not a duplicate Brand Kit link. Learn → Guides includes First week. Tools mega-menu + `/tools` catalog.
- **Shipped:** Explicit **Print** step after boards / before socials (`Flyer Maker` + `/guide/print`) via `FIRST_WEEK_STEP_KEYS` in `src/lib/comms/first-week-roadmap.ts`.
- **Shipped:** Cross-link / workshop / Resources / Blueprint / Website Guide / Examples copy swept from “Social Media Plan” → “First week” where the roadmap label is clearer. Practice checklist includes a flyer PDF step.
- **Do not:** Retarget Get started at `/guide/print` alone, or drop the socials/website steps.

### Landing page — align with site + desktop layout — v1 SHIPPED (2026-07); composition v2 open

**v1** on `/` via `HomeContent.tsx` (hero band, path layout, Brand Kit rail, equal channel columns, closing CTAs, home-enter motion). Home copy uses first-week / print-aware language.

**v2 (open):** large-layout hero still reads as half-empty (full-bleed gradient + left-only mark/copy). Do **not** treat v1 as a freeze. Next Home pass must satisfy [`.cursor/rules/public-marketing-ux.mdc`](../../.cursor/rules/public-marketing-ux.mdc) (two-zone hero at `lg+`) and should own [`COPY-001`](../audit/execution-backlog.md) CTA de-dup + smoke updates in the same change.

## Shipped from the same review (2026-07)

- Learn → **By channel**: Print Guide, Union Boards Guide, Website Guide
- Footer: Print Guide + Tools catalog
- Brand Kit → Brand Asset Pack (`/assets`) on-page link
- Spec + agent rules: [`COMMS.md`](COMMS.md), `.cursor/rules/comms-public-nav.mdc`
- Landing page v1 desktop layout + channel IA alignment (`HomeContent`); composition v2 tracked above
- Photo consent / member media checklist at `/guide/photo-consent` (Learn → Guides; Resources + workshop links)
- First week H1 + Get started → roadmap when theme established; Tools mega-menu + `/tools` index
- First week Print step + remaining “Social Media Plan” → “First week” copy sweep (2026-07-24)

## Related deferred (not Comms v1)

### Local membership meeting calendar + reminders

- **Why:** Locals need monthly meeting awareness; UnionOps today only supports grievance ICS and manual Comms announcement exports.
- **Defer until:** Postgres + RLS (roadmap #1) for persisted schedules; transactional email (ARCHITECTURE v2+) before auto-send.
- **Spec:** [`CALENDAR_MEETINGS.md`](CALENDAR_MEETINGS.md), `.cursor/rules/calendar-meetings.mdc`
- **Shipped (R0 + R0.5):** Document Generator Event notice — hybrid LEC RSVP + `.ics` + copy-only invite email; Board Notice matching invite via `InviteEmailPanel` + `fieldsFromBoardNotice`.
- **Shipped (R1–R3 Hub):** token RSVP `/r/[token]`, banner tallies, SMTP opt-in, Hub copy-only officer reminder draft (`membership-meeting-reminder.ts`) — distinct from public invite email.
- **Optional stretch:** Graphic Maker `meetingNotice` invite panel if fields exist.
- **Do not:** Treat the email/broadcast guide above as implying a calendar ships with it; do not conflate public invite email with Hub R2 reminder draft (see `docs/audit/current-ground-truth.md`).
