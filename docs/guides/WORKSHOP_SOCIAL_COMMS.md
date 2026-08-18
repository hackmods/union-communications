# Workshop: Starting Your Local Social Communications

Facilitator run sheet for UnionOps public Comms. Prefer projecting the public outline at `/guide/workshop` over slides: it now carries what to bring, a timed 45–60 minute agenda with **Facilitator** / **Do this** notes, Quick links (Demo Path), and next steps. Practice checklist copy also lives on **Comms Resources** (`/guide/resources`).

## Audience

Mixed workshop — new volunteer communicators and experienced officers. Keep jargon low; treat Officer Hub publish/ops features as optional “later.”

## Core story (use in your opening)

1. **Brand once, publish everywhere** — Brand Kit colours, local number, and logo flow into every notice, flyer, and social graphic. Files stay on the device.
2. **One message, four channels** — boards (offline members), print (handouts), social (Graphic Maker + Captions), website (bookmarkable home).
3. **Built for shop-floor phones** — Edit/Preview on mobile; photo consent and alt-text are part of the toolset.
4. **Leave with downloads, not only slides** — Logo / notice / graphic / optional website ZIP.

## Timed outlines

### A. Hands-on workshop (~60 min)

| Block | Time | What to do |
|-------|------|------------|
| Pitch | ~8 min | Problem → UnionOps Comms → four channels; open homepage |
| Live walkthrough | ~10 min | First week roadmap + Workshop Demo Path |
| Hands-on | ~30 min | Checklist: Brand Kit → Logo → Board Notice → Graphic Maker (+ Caption) → optional Website ZIP |
| Deploy & Q&A | ~10 min | Website README / GitHub Pages; point to Resources + Blueprint |

### B. Lunch-and-learn / remote (~45–60 min) — **From Scratch to Solidarity**

| Block | Time | What to do |
|-------|------|------------|
| Strategy | ~12 min | Platforms, shared accounts, sustainable posting; First week + Blueprint |
| Identity | ~8 min | Logo Builder live demo; download circular PNG |
| Inspiration | ~8 min | Social Examples gallery (strike / AGM / spotlight) |
| Media | ~12 min | Graphic Maker PNG + Quote Card; Captions only if time |
| Close | ~5 min | Practice checklist; encourage tinkering after |

Public attendee-facing agenda: `/guide/workshop`. Dated run sheet: [`docs/workshop/from-scratch-to-solidarity.md`](../workshop/from-scratch-to-solidarity.md). Slide-style strings also live in `resources.presentation`.

## Live demo click path (20 minutes)

Numbered pitch (home, First week, `/guide/workshop`) is **four** stops matching the listing:

1. [Logo Builder](/tools/logo-builder) — circular PNG (Brand Kit / Onboarding count as this stop)  
2. [Social Examples](/examples) — strike, AGM, member spotlight gallery  
3. [Graphic Maker](/tools/graphic-maker) — download PNG  
4. [Quote Card](/tools/quote-card) — download PNG  

Strategy is **First week**, not a chip. Print, Board Notice, Captions, and Website Template stay off the pitch card.

Do **not** put Board Notice or QR Board on the 20-minute chips. Social Examples is the inspiration gallery. QR Board is a campaign poster.

Fallback if Brand Kit is empty: complete [Onboarding](/onboarding) or import demo kit from Brand Kit, then Logo Builder.

UI: `WorkshopDemoPath` `variant="card"` (four numbered chips) vs `variant="trail"` (unnumbered continuation on those four tools).

## Day-of checklist (Tuesday 18 August)

Do this the morning of the session (or the night before). Paths are locale-prefixed (`/en/…` or `/fr/…`).

### URLs to keep open (separate tabs)

| Tab | URL |
|-----|-----|
| Home + Demo Path | `/en/` |
| Workshop outline | `/en/guide/workshop/` |
| First week + calendar | `/en/guide/social-media-plan/` |
| Blueprint | `/en/guide/` |
| Comms Resources | `/en/guide/resources/` |
| Brand Kit | `/en/brand-kit/` |
| Logo Builder | `/en/tools/logo-builder/` |
| Social Examples | `/en/examples/` |
| Graphic Maker | `/en/tools/graphic-maker/` |
| Quote Card | `/en/tools/quote-card/` |
| Tools index (backup) | `/en/tools/` |

Captions `/en/captions/` and Print Guide `/en/guide/print/` are extra if time. Board Notice and Website Template are First week, not this hour.

### Brand Kit backup

1. Prefer a **finished Brand Kit** (local number + colours + logo) before attendees join.
2. If the browser is empty: run **Onboarding** (`/en/onboarding/`) once, or **import demo Brand Kit** from Brand Kit export/import.
3. Keep a downloaded Brand Kit JSON on a USB / second machine.

### Offline / AV fallbacks

- Keep sample **Logo Builder PNG**, **Graphic Maker PNG**, and **Quote Card PNG** already exported on disk (show if export fails mid-demo).
- Prefer **wired Ethernet** for the presenter laptop; phone hotspot as plan B.
- Share the browser window (not the whole desktop) in Zoom/Teams so Brand Kit colours stay readable.
- Zoom the browser to ~110% for a projector; avoid ultra-wide half-scale that makes type tiny.
- Confirm Graphic Maker **Edit / Preview** tabs at phone width (~375) once before the talk (DevTools or your phone).

### Smoke before you speak (2 minutes)

1. Home shows Demo Path: Logo Builder, Social Examples, Graphic Maker, Quote Card, and “Solidarity.”
2. Logo Builder: Download PNG visible.
3. Social Examples: gallery cards visible.
4. Graphic Maker: Download PNG visible.
5. Quote Card: Download PNG visible.
6. `/en/guide/workshop/` H1 is From Scratch to Solidarity; `/fr/guide/workshop/` H1 loads in French.

### Do not demo live (mention only)

- Pulse Poll publish (needs Officer Hub).
- Officer Hub SMTP / cron.
- Portal Circles (separate product surface).
- Board Notice or QR Board as the inspiration gallery (Social Examples is the gallery; QR Board is a campaign poster).
- Website Template ZIP unless someone asks.

## Backup if wifi or import fails

- Preload a demo Brand Kit JSON and screenshots of a notice + graphic.
- Use Social Examples deep-links into Graphic Maker with seeds.
- Emphasize “Comms run in your browser” — no account required for makers.

## Common Q&A

| Question | Answer |
|----------|--------|
| Where does my data go? | Public Comms stay on-device (Brand Kit / graphics). Hosted Officer Hub is a separate operator-controlled surface. |
| Can I email all members? | No marketing lists. Copy/mailto panels for invites; mass mail via your union’s approved tool. |
| OPSEU-only? | Multi-union by design; OPSEU/CAAT is reference tenant seed, not a code default. |
| French? | Site is EN/FR; Captions templates may still need local rewrite for hashtags. |

## Links cheat sheet

| Surface | Path |
|---------|------|
| Public workshop outline | `/guide/workshop` |
| Comms Resources | `/guide/resources` |
| First week + 4-week calendar | `/guide/social-media-plan` |
| Blueprint (tone, trolls, cadence) | `/guide` |
| All tools | `/tools` |
| This run sheet | `docs/guides/WORKSHOP_SOCIAL_COMMS.md` |

## Agent / product consistency

See `.cursor/rules/comms-public-ux.mdc` for terminology (UnionOps Comms vs Officer Hub), Brand Kit CTAs, Related tools, export success, and responsive expectations.
