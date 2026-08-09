# Workshop: Starting Your Local Social Communications

Facilitator run sheet for UnionOps public Comms. Attendees can follow the public outline at `/guide/workshop`. Practice checklist and lunch-and-learn copy also live on **Comms Resources** (`/guide/resources`).

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

### B. Lunch-and-learn / remote (~45 min)

| Block | Time | What to do |
|-------|------|------------|
| Strategy | ~10–12 min | Platforms, secure accounts, sustainable posting; short Q&A |
| Identity | ~8 min | Logo Builder / Brand Kit live demo |
| Inspiration | ~8 min | Board Notice + Union Boards |
| Media | ~10–12 min | Graphic Maker live demo |
| Close | ~5 min | Practice checklist; encourage tinkering after |

Public strings for these outlines: `resources.facilitators` and `resources.presentation` in `messages/en.json` / `fr.json`.

## Live demo click path (20 minutes)

1. [Brand Kit](/brand-kit) — colours, local number, logo  
2. [Board Notice](/tools/board-notice) — download PDF  
3. [Graphic Maker](/tools/graphic-maker) — download PNG  
4. [Captions](/captions) — copy a caption  

Optional fifth: [Website Template](/tools/website-template) ZIP.  
Fallback if Brand Kit is empty: complete [Onboarding](/onboarding) or import demo kit from Brand Kit.

UI chip for the same path: `WorkshopDemoPath` on home, First week, and `/guide/workshop`.

## Day-of checklist (Wednesday)

Do this the morning of the session (or the night before). Paths are locale-prefixed (`/en/…` or `/fr/…`).

### URLs to keep open (separate tabs)

| Tab | URL |
|-----|-----|
| Home + Demo Path | `/en/` |
| Workshop outline | `/en/guide/workshop/` |
| First week + calendar | `/en/guide/social-media-plan/` |
| Comms Resources | `/en/guide/resources/` |
| Brand Kit | `/en/brand-kit/` |
| Board Notice | `/en/tools/board-notice/` |
| Graphic Maker | `/en/tools/graphic-maker/` |
| Captions | `/en/captions/` |
| Tools index (backup) | `/en/tools/` |

Optional: Website Template `/en/tools/website-template/`, Print Guide `/en/guide/print/`.

### Brand Kit backup

1. Prefer a **finished Brand Kit** (local number + colours + logo) before attendees join.
2. If the browser is empty: run **Onboarding** (`/en/onboarding/`) once, or **import demo Brand Kit** from Brand Kit export/import.
3. Keep a downloaded Brand Kit JSON on a USB / second machine.

### Offline / AV fallbacks

- Keep sample **Board Notice PDF** and **Graphic Maker PNG** already exported on disk (show if export fails mid-demo).
- Prefer **wired Ethernet** for the presenter laptop; phone hotspot as plan B.
- Share the browser window (not the whole desktop) in Zoom/Teams so Brand Kit colours stay readable.
- Zoom the browser to ~110% for a projector; avoid ultra-wide half-scale that makes type tiny.
- Confirm Graphic Maker **Edit / Preview** tabs at phone width (~375) once before the talk (DevTools or your phone).

### Smoke before you speak (2 minutes)

1. Home shows Demo Path steps 1–4 and “Solidarity.”
2. Board Notice: form + Download PDF visible.
3. Graphic Maker: Download PNG visible.
4. Captions: Copy on a template works.
5. `/en/guide/workshop/` H1 loads; `/fr/guide/workshop/` H1 loads in French.

### Do not demo live (mention only)

- Pulse Poll publish (needs Officer Hub).
- Officer Hub SMTP / cron.
- Portal Circles (separate product surface).

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
