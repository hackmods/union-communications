# Comms backlog — content & discoverability

Ideas from the 2026-07 public nav review. Not scheduled for a phase; pick up when expanding past the four-channel v1.1 model, refreshing Get started, or redesigning the home landing.

Implementation surface today: [`HomeContent.tsx`](../../src/components/pages/HomeContent.tsx), `home.*` in `messages/en.json` + `fr.json`.

## Deferred content

### Email / member broadcast guide

- **Why:** Locals often use email or SMS alongside the four channels; there is no guide page today.
- **Defer until:** Product expands past social / print / boards / website, or we intentionally add a fifth channel.
- **Do not:** Add a nav stub with no page.

### Photo consent / member media checklist

- **Why:** Consent is already tool-gated (`ConsentModal` on member photo uploads). A short Learn article would help workshops and stewards who are writing policy, not only using Graphic Maker.
- **Related:** Facilitator run sheet in [`docs/workshop/aug-18-comms-toolbox.md`](../workshop/aug-18-comms-toolbox.md); consent copy in tools.
- **Shape if built:** Short `/guide/…` page (EN/FR) under Learn → Guides; link from Resources and workshop doc. Not a top-level Header item.

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

### Landing page — align with site + desktop layout

Review of `/` after Learn → By channel shipped. Channel model on home is correct; chrome/naming and desktop density are the gaps. Pair with **Get started beyond social** when renaming the plan so home CTA copy does not fight the new H1.

#### Align with the rest of the site

| Gap | Detail |
|-----|--------|
| Plan naming | `home.socialMediaPlanCta` / `socialMediaPlanDesc` still say “Social Media Plan”; path card already says brand → boards → socials → website. Same rename as the backlog item above. |
| Print in path copy | `pathCommsDesc` omits print; after a Print step lands in the plan, update home desc/hint to mention all channels (or “first week” language). |
| Brand Assets orphan | Brand Kit card shows `Logo Builder · Brand Assets` as plain text; only the card links to `/brand-kit`. Wire Brand Assets to `/assets` (text link beside or under the card) to match Brand Kit page. |
| Social channel overweight | Social lists **9** tiles (Blueprint, Resources, Strike, Examples, Captions + 4 tools); Print has **2**. Feels like a second nav, not a channel. Prefer: 1 guide highlight + 2–3 primary tools per channel; rest stay in Header Learn / Tools. |
| Channel order vs Get started | Toolbox order is social → print → boards → website; Get started is logo → boards → socials → website. Consider boards → print → social → website (or match plan step order) so landing reinforces the roadmap. |
| Closing CTA | Footer of page is only “Learn more” → Blueprint. Add secondary link to Comms Resources or Get started so it matches Learn chrome. |
| Hint skew | `pathCommsHint` only points at Examples/Captions; after By channel exists, optionally mention Print / Boards guides under Learn. |

Preserve: dual-path (comms vs Officer Hub), trust banner + quiet manifesto link, four-channel toolbox, no `/about`/`/pricing` invention.

#### Desktop layout (more dynamic / responsive)

Current home is a centered stack: hero → trust note → path card(s) → full-width Brand Kit bar → `lg:grid-cols-2` channel blocks → single Blueprint button. Fine on mobile; on wide viewports it reads long and uneven (Social column packed, Print sparse).

**Preferred layout direction** (stay in existing OPSEU-blue shell — not a new marketing visual system):

1. **Desktop hero band (`lg+`):** One composition — brand + slogan + short subtitle + primary/secondary CTAs (Get started / Set up brand) in a wider horizontal or split band; keep Share and privacy note secondary so the first viewport is not a dashboard of cards.
2. **Path cards:** Keep two-up when Officer Hub is public; when hub is hidden, do not leave a lonely full-width “coming soon” as the only sibling — collapse to a single strong comms path or a compact aside so desktop does not show a dashed empty twin.
3. **Brand + channel stage:** On `lg+`, put Brand Kit as a short rail or inset beside the toolbox intro (not a solitary full-bleed card between paths and channels). Channel grid: equal visual weight — e.g. four columns on `xl`, two on `lg`, with capped tiles per channel so Print/Website do not look empty next to Social.
4. **Motion:** Light, intentional presence only (e.g. staggered fade/slide of path + channel sections, respect `prefers-reduced-motion` / display settings). 2–3 motions max — no glow/pill cluster noise.
5. **Responsive breakpoints:** Explicit `md` / `lg` / `xl` behaviors for hero, paths, and toolbox; avoid “same stack, just wider `max-w-7xl`.”

**Out of scope for this item:** Full-bleed photo hero or rebrand; Hub dashboard redesign; inventing about/pricing pages.

**Do not:** Flatten Header Tools into the landing; duplicate every Learn link under Social; make the first viewport a stats/metadata dashboard.

## Shipped from the same review (2026-07)

- Learn → **By channel**: Print Guide, Union Boards Guide, Website Guide
- Footer: Print Guide
- Brand Kit → Brand Asset Pack (`/assets`) on-page link
- Spec + agent rules: [`COMMS.md`](COMMS.md), `.cursor/rules/comms-public-nav.mdc`
