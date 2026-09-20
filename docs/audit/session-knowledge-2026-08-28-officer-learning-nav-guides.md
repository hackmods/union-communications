# Session knowledge — Officer Learning chrome, nav IA, guide registry (2026-08-28)

**Audience:** future agents + Ryan.

---

## Officer Learning dark shell — superseded 2026-09-20

**Superseded.** Navy is no longer the default. See [`session-knowledge-2026-09-20-officer-learning-site-colours.md`](session-knowledge-2026-09-20-officer-learning-site-colours.md): single platform light `olTheme`; `officerLearningColour` removed.

Historical row (do not reintroduce):

| Decision | Rationale (historical) |
|---|---|
| ~~Navy focus shell is the default~~ (`#0B132B`) | ~~Signals self-paced training vs light Comms guides~~ |
| ~~Light colour is opt-in~~ | ~~Display settings `officerLearningColour`~~ |
| **Replace amber/teal with platform orange** | Still true — accents stay platform orange via `olTheme` |

**Still true:** Do not wrap OL in `GuideLayout`. Certificate PDFs use `GUIDE_PDF_PALETTE` (not the retired web navy shell). Not Brand Kit. Not site-wide dark mode.

---

## Guides nav IA (2026-08-27)

**Guides ▾** — five columns @ 2xl + featured OL card above grid:

1. Start here  
2. By channel  
3. Steward training (OL first)  
4. Libraries  
5. About  

**Tools ▾** — “Steward prep” renamed **Steward worksheets**.

Rule: `.cursor/rules/comms-public-nav.mdc` + `nav-config.test.ts`.

---

## Guide registry (`src/lib/comms/guide-registry.ts`)

**Problem:** Blueprint, Resources, and steward-playbooks duplicated path arrays — running-meetings and OL featured row drifted.

**Fix:** `GUIDE_REGISTRY` + derived exports (`GUIDE_BLUEPRINT_PATH_LINKS`, `GUIDE_RESOURCES_*`, `GUIDE_STEWARD_PLAYBOOK_LINKS`).

**Guard:** `guide-registry.test.ts` — every `PUBLIC_PATHS` `/guide/*` (except hub + OL module slugs) must register exactly once.

**Featured OL:** `featured: true` on steward-playbooks list → orange highlight (not teal).

---

## Brand Kit preset QOL (same pass)

- `presetSlogans` EN/FR — tap-to-apply sub-text suggestions per union preset  
- `canvasFontDefaults` on CUPE/Unifor/USW presets  
- OPSEU CAAT Support copy: one comms identity, FT/PT membership links via sector picker  

---

## Do not

- Wrap OL in `GuideLayout` light chrome  
- Wire Brand Kit colours into Officer Learning pages  
- Add site-wide dark mode  
- Reintroduce a navy / dark dual theme or `data-ol-colour`  
- Reintroduce amber/teal gamification accents in `src/components/officer-learning/`  
- Add topic playbooks to Guides mega-menu — use steward-playbooks hub + registry labour group  
- Duplicate guide path arrays outside `guide-registry.ts`

---

## Verify

```bash
npm run test:unit -- src/lib/comms/guide-registry.test.ts src/components/layout/nav/nav-config.test.ts src/lib/comms/public-copy-style.test.ts
```
