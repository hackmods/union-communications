# Comms backlog — content & discoverability

Ideas from the 2026-07 public nav review. Not scheduled for a phase; pick up when expanding past the four-channel v1.1 model, refreshing Get started, or redesigning the home landing.

Implementation surface today: [`HomeContent.tsx`](../../src/components/pages/HomeContent.tsx), `home.*` in `messages/en.json` + `fr.json`.

## Deferred content

### Email / member broadcast guide

- **Why:** Locals often use email or SMS alongside the four channels; there is no guide page today.
- **Defer until:** Product expands past social / print / boards / website, or we intentionally add a fifth channel.
- **Do not:** Add a nav stub with no page.

### Get started beyond social (rename + Print step)

- **Reality check (already shipped):** `/guide/social-media-plan` is already a multi-channel roadmap — **logo → union boards → socials → website**. Home path copy (“brand, boards, socials, then website”) matches the steps. Boards are not missing from the plan.
- **Real gaps:**
  1. **Naming:** Page title / nav / workshop language still say **Social Media Plan**, so Get started reads as social-only even though steps 2 and 4 are offline / web.
  2. **Print channel:** Flyers and the Print Guide are outside the four steps (boards only mentions printing a notice). Print-first locals still feel under-served after Learn → By channel shipped.
- **Preferred work (when picked up):**
  1. Rename/reframe to a **First week** / **Comms roadmap** (EN/FR titles, intro, cross-links from Blueprint / Resources / workshop). Keep `/guide/social-media-plan` as the route (or add a redirect) so bookmarks and “Get started” stay stable.
  2. Insert an explicit **Print** step or checkpoint (Flyer Maker + `/guide/print`) — e.g. after boards, before socials: same message on paper for members who never see the board or the feed. Do not balloon past ~5 steps.
  3. Align Header/home labels so “Get started” and the H1 describe the same four/five-channel first week, not “social media” alone.
- **Not preferred as the main fix:** A separate print-first CTA sibling on the home card while leaving the plan titled Social Media Plan — that splits the path without fixing the name/content mismatch.
- **Do not:** Retarget Get started at `/guide/print` alone, or drop the socials/website steps.

### Landing page — align with site + desktop layout — SHIPPED (2026-07)

Implemented on `/` via `HomeContent.tsx` (hero band, path layout, Brand Kit rail, equal channel columns, closing CTAs, home-enter motion). Home copy uses first-week / print-aware language; plan page rename + Print step remain under **Get started beyond social** above.

## Shipped from the same review (2026-07)

- Learn → **By channel**: Print Guide, Union Boards Guide, Website Guide
- Footer: Print Guide
- Brand Kit → Brand Asset Pack (`/assets`) on-page link
- Spec + agent rules: [`COMMS.md`](COMMS.md), `.cursor/rules/comms-public-nav.mdc`
- Landing page desktop layout + channel IA alignment (`HomeContent`)
- Photo consent / member media checklist at `/guide/photo-consent` (Learn → Guides; Resources + workshop links)
