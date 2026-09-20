# Session knowledge — Officer Learning site colour align (2026-09-20)

**Audience:** future agents + Ryan.  
**Supersedes:** navy-default product decision in [`session-knowledge-2026-08-28-officer-learning-nav-guides.md`](session-knowledge-2026-08-28-officer-learning-nav-guides.md) and the dark-shell exception in [`session-knowledge-2026-08-27-labour-guides-chrome.md`](session-knowledge-2026-08-27-labour-guides-chrome.md).

---

## Product decision

| Decision | Rationale |
|---|---|
| **Single platform light chrome** | OL pages use the same background / orange brand tokens as public guides (`bg-background`, `opseu-blue`, `opseu-dark`) |
| **Retire navy focus shell** (`#0B132B`) | Separate UX colour scheme felt off-brand; fun stays in training layout, not a second palette |
| **Remove `officerLearningColour` Display setting** | No dual theme; legacy stored values are dropped on hydrate |
| **Keep ModuleViewer shell** | Sticky progress, Jump to Quiz, path diagram, quiz panels — not GuideLayout |
| **Not Brand Kit** | Platform orange only; never tenant Brand Kit colours on OL pages |
| **Certificate PDFs unchanged** | `GUIDE_PDF_PALETTE` (white paper + brand orange + dark ink) |

---

## Code

- Sole tokens: `olTheme` in `src/lib/officer-learning/theme.ts`
- `useOlTheme()` via thin `OlThemeProvider` (no colour switching)
- `ModuleToc` → `GuideToc variant="light"`

---

## Do not

- Reintroduce a navy / dark dual theme or `data-ol-colour`
- Wrap OL in `GuideLayout`
- Wire Brand Kit colours into Officer Learning pages
- Add site-wide dark mode
- Reintroduce amber/teal gamification accents in `src/components/officer-learning/`

---

## Verify

```bash
npm run test:unit -- src/lib/officer-learning/theme.test.ts src/store/preferences-store.test.ts src/lib/comms/public-copy-style.test.ts src/lib/constants/updates.test.ts
npm run test:smoke -- e2e/officer-learning.smoke.spec.ts --grep "platform light"
```

Smoke asserts `[data-ol-shell]` background is site `--background` (`rgb(248, 250, 252)`) and Display has no Navy/Light radios.
