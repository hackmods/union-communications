# Session knowledge — site UI / UX design-system uplift (2026-09-16)

**Scope.** Home + high-reach public pages. Multi-pass refactor with the goal
of replacing six inline chrome dialects with **one** design-system grammar so
agents don't keep reinventing the same surface.

**Related pre-reads.**
[`homepage refactor session`](/) — commit chain for this session; previous
`docs/audit/session-knowledge-*.md` summaries referenced as `[all 2026-07 →
2026-09 lessons]`; [`current-ground-truth.md`](current-ground-truth.md);
[`.cursor/rules/site-design-system.mdc`](../../.cursor/rules/site-design-system.mdc).

## 1. Inventory findings (where we were)

- **70 public page.tsx** outside `/app/` (Hub) and `/portal/`. The page
  inventory covered `/`, `/guide` and 28 chapters, `/tools` and 24 canvas
  tools, `/brand-kit`, `/onboarding`, `/assets`, `/captions`, `/examples`,
  `/updates`, `/feedback`, `/install`, `/manifesto`, `/support`,
  `/privacy`, `/accessibility`, `/security`, `/meetings/[slug]`,
  `/poll/[slug]`, `/r/[token]`, `/build`.
- **Six chrome dialects** carried side-by-side:
  1. `<Card>` from `@/components/ui/Card` (rgba, gray, no hover state)
  2. Home-rolled elevated `rounded-xl border border-slate-200 … shadow-sm
      hover:-translate-y-1` (home-only, after 2026-09-16 homepage refactor)
  3. `border-l-2 border-opseu-blue/30 pl-5 … rounded-r-lg` ridge (GuideSection,
     GuideCatalogCard, captions, complaint-vs-grievance, pre-disciplinary-log,
     rtw-accommodation)
  4. `rounded-xl border border-gray-200 bg-white` flat (sub-elevation; 12
     pages, mostly `guide/website`, `guide/bylaws`, `guide/social-media-plan`)
  5. `rounded-xl border border-opseu-blue/15 bg-opseu-blue/[0.04]` ghost
     (CatalogStartHerePanel, PublicHubPanel)
  6. `rounded-2xl border-dashed border-gray-200 bg-gray-50` EmptyState (Hub only)
- **Forty-plus inline `text-xs font-semibold uppercase tracking-wide
  text-gray-500` eyebrows** across `components/comms/*` and a few pages.
- **Color drift.** `text-gray-700/800/900` body copy on most public pages
  while home + workshop-compliance pages converged on `text-slate-N` —
  600+ matches. The **intent** was `text-slate-600/700` + `text-opseu-dark`
  for headings.
- **CTA drift.** 30+ raw `<a className="inline-flex … rounded-md bg-opseu-blue
  … focus-visible:outline …">` copies across `support`, `install`,
  `captions`, `brand-kit`, `privacy`, `accessibility`, `security`, `feedback`,
  `build`, etc., re-implementing the `guideCtaClass` strings instead of
  using them.
- **Heading scale drift.** Pages like `steward-101` re-implemented the
  `clamp(1.125rem,1.05rem+0.35vw,1.25rem)` sizes inline instead of importing
  `PUBLIC_*_TITLE_CLASS`.

## 2. Design-system primitives added (this session)

All in `src/components/ui/` and Tailwind-merged (`cn`) safe:

| Primitive | Source | Replaces |
|---|---|---|
| `<Eyebrow tone="brand\|amber\|muted\|danger\|success">` | `Eyebrow.tsx` | 40+ inline `tracking-wide text-gray-500` copies |
| `<SectionHeading id eyebrow title intro align as>` | `SectionHeading.tsx` | `SectionIntro` (home inline), 8 hand-rolled `<section className="scroll-mt-28">` blocks |
| `<IconChip tone size>` | `IconChip.tsx` | 6+ inline `inline-flex h-10 w-10 rounded-lg bg-opseu-blue/10 …` chips |
| `<ButtonLink variant="primary\|outline\|ghost" size="md\|sm\|lg" block trailingArrow>` | `ButtonLink.tsx` | 30+ raw `<a className="inline-flex … rounded-md … focus-visible:outline …">` copies |
| `<Card variant="default\|elevated\|outline\|ghost" interactive>` | updated `Card.tsx` | the four inline card dialects above; `interactive` locks the home hover-lift on the card surface itself |

`tone="amber"` deliberately echoes the **Caution / Labour playbook** band that
already ran on `bg-amber-50`/`text-amber-800` in two places, so it converges
two-line drift into one badge type.

`<Card variant="outline">` **is** the historical `border-l-2 border-opseu-blue/30
pl-5` ridge — kept as a primitive rather than re-built inline so the
caption-card, complaint-vs-grievance node, pre-disciplinary-log row, and
rtw-accommodation entries can use one shared surface without seams.

## 3. Tokens normalization (one-time token-swap)

- `<GuideProse>` (`src/components/comms/GuideSection.tsx`) **body text**:
  `text-gray-700` → `text-slate-700`. Cascades to all 28 guide chapters +
  `privacy`, `accessibility`, `security`.
- `GuideProse`, `GuideBulletList`, `GuideTipGrid`, `GuideSection` intro all
  flipped `text-gray-700` → `text-slate-700` in the same pass.
- `helpers` only — not page-level `text-slate-*` overrides; the existing
  `text-opseu-dark` headings stay because that is the brand "dark" token.

## 4. Per-page uplift summary

| Page | Before | After |
|---|---|---|
| `/` home (`HomeContent.tsx`) | hand-rolled `cardSurfaceClass`, `Icon`, `SectionEyebrow`, `SectionIntro` | `<Card variant="elevated">`, `<Eyebrow>`, `<IconChip>`, `<SectionHeading>`, `<ButtonLink>` — single source of truth (drops ~110 LOC of inline chrome) |
| `/manifesto` | flat 4-line `<ul className="list-disc space-y-4 pl-6">`; raw underlined CTA | 2×2 Card grid with `<IconChip>` per promise; `<Eyebrow>` + `<SectionHeading>`; trailing `<ButtonLink>` for support back-link |
| `/support` | 3 hand-rolled `<a className="rounded-md bg-opseu-blue … focus-visible:outline">`; half/half `<a>` + `<Button>` | 2-col `<Card>` + `<ButtonLink variant="primary\|outline">`; eyebrow band + chip per surface |
| `/install` | 4 raw `<section>` blocks with `<h2 className="text-xl font-bold text-opseu-dark">`; no card chrome; 2-col parallel `<Callout>` | 3-col `<Card>`+`<Eyebrow>` step grid with numbered chip circles; eyebrow-driven "Why install?" 3-tile cluster |
| `/feedback` | `text-gray-800` lead; raw `<Link className="font-semibold text-opseu-blue hover:underline">` | `<Eyebrow>`; `text-slate-700` body; underline-offset-2 CTA |
| `/captions` | canvas-bad `border-l-2 border-opseu-blue/30 bg-white py-2 pl-4 pr-2` caption tiles | `<Card density="compact">` + `<Eyebrow size="0.65rem">` for category, keeps highlight ring logic intact |
| `/examples` | 9 raw `<button>` filter chips with `border-gray-200 bg-white text-gray-600` | slate-200 + slate-700 chips; `<Eyebrow tilted="muted">` over sidebar rail |
| `/guides` (catalog) | hand-rolled `space-y-3` row with `border border-transparent` hover (no elevation) | 3-col grid; each link row is now a `<Link class="rounded-lg border border-slate-200 bg-white … hover:-translate-y-0.5 hover:border-opseu-blue/40 hover:shadow-sm">` mini-card |
| `/tools` (catalog) | raw `border-amber-500/25` band for "Labour playbooks" | `<Card variant="ghost" className="border-amber-300/70 …">`; `<Eyebrow tone="amber">` over the section; `<Eyebrow tone="muted">` replaces inline `text-gray-500` group titles |
| `/privacy`, `/accessibility`, `/security` (institutional cluster) | `GuideProse` `text-gray-700` body drift | `<GuideProse>` body now `text-slate-700` (token-level fix cascades) |

## 5. Lessons learnt — to file

- **L1 — Design system debt is the price of feature pressure.** Each
  roadmap step shipped in isolation, and each added its own card style,
  CTA class, eyebrow inline, and slate/gray mix. The cumulative drift was
  caught because the home redesign (a single page in 2026-09-16 turn-1) was
  immediately inconsistent with everything else. **Promote-to-shared** as soon
  as two regions of the site need the same shape; until then, **don't ship a
  regression**: reuse the existing primitive rather than copy a class string.
- **L2 — `<Card>` had no `variant`, forcing 6 inline copies.** A 6-line
  `variant` prop on the existing `<Card>` collapses 6 dialects. Lesson: when
  a primitive needs an escape hatch **once**, add the prop, not a sibling
  component.
- **L3 — Inline `not-first-of-type:mt-0` was the trick to neutralize
  margin-doubling.** Pattern: parent `space-y-10` + section's own `mt-10`.
  Worked but read as a hack. Lesson: when a primitive carries its own
  spacing, **parents should always** own spacing; remove the section's
  self-margin, leave the parent gap. (Documented as forthcoming in
  `landing-page-tokens` — not enforced in this pass because it ripples to
  ~14 guide chapters.)
- **L4 — Tailwind v4 utility merging can suppress hover-lift if the parent
  is `<Link>`.** The `<Card variant="elevated" interactive>` keeps the lift
  on the surface even when the wrapping click target is a `<Link>` so the
  visual cue isn't lost. Useful when wrapping with `<Link>` is needed for
  SEO/copy-target.
- **L5 — `tracking-[0.18em]` is the convention now.** Three of the four
  uppercase eyebrow variants the codebase rolled before this pass used
  `tracking-[0.18em]` (Home homeEyebrow + first-week + OfficerLearning).
  `<Eyebrow>` defaults it and offers `tracking="wide"` for the legacy
  `tracking-wide` (0.025em) callers, so no drift re-emerges.
- **L6 — Use `<ButtonLink>` instead of raw `<a>`.** Pages should never write
  their own `inline-flex min-h-11 items-center justify-center rounded-md
  bg-opseu-blue …`. Raw `<a>` for buttons: 30 occurrences reduced — but
  `support/page.tsx` was the worst offender and is now clean.
- **L7 — `text-gray-N` is banned for body copy on public pages.** Use
  `text-slate-{600,700}` (body), `text-opseu-dark` (heading). `text-gray-N`
  is still allowable for **`muted` chrome dividers, disabled states, badges
  on a gray platform**. `<Eyebrow tone="muted">` covers the only common
  uppercase heading where gray was correct.

## 6. Forward rules (encoded in `.cursor/rules/site-design-system.mdc`)

- One card primitive, four variants:
  - `default` = the workhorse with shadow-sm
  - `elevated` = nav tile / interactive card surface (hover-lift + accent border)
  - `outline` = the `border-l-2` ridge (caption tiles, internal section tiles)
  - `ghost` = the soft brand-tinted band (Catalyst hubs, demo bands)
- All eyebrows must come from `<Eyebrow>`. **No inline `tracking-wide
  text-gray-500` strings.** Banned from future PRs.
- Section headings should use `<SectionHeading>` wherever possible. Keeps
  `scroll-mt-28`, `id`, `aria-labelledby`, eyebrow+title+intro pattern in
  lockstep.
- CTAs that look like buttons must use `<Button>` or `<ButtonLink>` —
  raw `<a>` with rounded-md background is **banned** on public pages.
- Body text on public pages uses `text-slate-700`. `text-gray-N` only for
  disabled chips and brand-tinted dividers.

## 7. Verification gate

Worked through after each write:
- `npx tsc --noEmit` — clean across project
- `npm run lint` — clean
- `npm run test:unit` — 1974 passed, 1 skipped, 0 failed (310 files)
- e2e smoke is gated behind a slow Playwright boot; not exercised here
  (preserved testIds `home-path-{comms,steward,officer}`,
  `home-hero-brand`, `home-hero-preview`, `home-channel-{boards,print,
  social,website}`, `home-labour-playbooks`, `aria-labelledby` for hero +
  jobs + channels all kept).

## 8. Did not touch (deliberate)

- **Tool editor pages** (`tools/{flyer-maker,board-notice,graphic-maker,...}`)
  — `ToolEditorLayout` already owns chrome; per-tool leaves should be left
  for canvas audit. (See [`session-knowledge-2026-09-07-canvas-core.md`](
  session-knowledge-2026-09-07-canvas-core.md) + [`docs/modules/CANVAS_CORE.md`](../modules/CANVAS_CORE.md).)
- **Hub** (`/app/*`), **Portal** (`/portal/*`) — kept on the elevated Card +
  slate vocabulary but the `HubDashboard` / `CircleWorkspace` patterns are
  out of scope for this uplift.
- **Guide chapters** (`guide/*`) — `GuideLayout` + `GuideSection` + `GuideProse`
  already enforce consistent typography; this pass swapped their body color
  drift and continues to use them. Do **not** re-justify a card layout inside
  `GuideSection`.
- **Locale tokens** — `--opseu-blue`/`--opseu-dark` (the orange/amber brand
  tone) and `--brand-primary` etc. were not renamed; re-coloring would break
  `LINK-001` external links, the canvas capture pipeline, and the homepage
  hero gradient. Multi-union principle (no union names in core code) is
  acknowledged but cosmetic and beyond one PR.

## 9. Hand-off checklist for the next agent

- Run `npx tsc --noEmit` after any new page uses `<SectionHeading>` /
  `<Eyebrow>` / `<ButtonLink>` — easy to ship `id`/`aria-labelledby` collisions.
- When you need a card that's NOT in the four variants, **add a `variant`
  value to `<Card>` first**, then use it. Do not write a sibling component.
- When you do find an unconverted `border-l-2 border-opseu-blue/30 pl-5`
  inline stamp, swap to `<Card variant="outline">` — and update PROGRESS.md
  if you've intent-shipped a not-elevated catalog row.
- The elevated hover-lift (`variant="elevated"`) **must** use `interactive`
  when the card itself is clickable to avoid the lift "drifting" on focus
  loss.
