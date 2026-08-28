# Session knowledge — Labour guides chrome next pass (2026-08-27)

**Audience:** future agents + Ryan.  
**Companions:** [`session-knowledge-2026-08-24-guides-launch-readiness.md`](session-knowledge-2026-08-24-guides-launch-readiness.md), [`docs/PROGRESS.md`](../PROGRESS.md) (“Labour guide chrome + CI smoke” + this next pass).

---

## What this pass did

1. **Officer Learning reading-frame alignment** (incremental — not a light-theme reskin).
2. **Public guide `Link>Button` → `guideCtaClasses`** on remaining gold/channel/playbook pages.
3. **Thin H1 + axe** for `/guide/dfr`; steward-playbooks already covered in `officer-learning.smoke`; both added to `builders.smoke` H1 matrix.

Do **not** redo the earlier 2026-08-27 pass (shared `guideCtaClasses` on bargaining/bylaws/steward-101/DFR/steward-playbooks, CTA de-dupe, `PUBLIC_NS`, smoke locator uniqueness on playbooks).

---

## Accepted Officer Learning exceptions (keep)

| Exception | Why it stays |
|---|---|
| **Dark training shell** (`#0B132B`, platform orange accents via `olTheme`) | Intentional “focus mode” for self-paced modules — **not** a user-toggle theme; public stewards use OL without Hub login |
| **Sticky module chrome** (progress bar, Jump to Quiz, print) | Training UX; not part of public GuideLayout |
| **SourcesBlock in a white inset card** on dark pages | Readable bibliography without forcing the whole page light |
| **ModuleRelatedResources mid-article** (after content, before quiz) | Practice tools belong next to the lesson; GuideLayout related strip is navigation-only |
| **Not wrapping dashboard/viewer in `GuideLayout`** | `GuideLayout` assumes light `PageShell` + opseu-blue text links; OL keeps its own shell and mirrors *placement* (related after intro, Sources in footer region) |

---

## A11y / link-name rules shipped here

- **Learning path** links use `aria-label` = `Module {n}: {title}` (`path.stepAria`) so they do not collide with module **card** links.
- **Module cards** use `aria-labelledby` on the card `<h2>` (decorative image `alt=""`; status/summary `aria-hidden`) so the accessible name is exactly the module title.
- **Sticky** playbooks control = `viewer.playbooksNav` (“Playbooks hub”); in-article related strip = `backToPlaybooks` (“All steward playbooks”) — same destination, unique names.
- **`stewardPlaybooks` removed from `MODULE_RELATED_RESOURCES`** — hub nav is sticky + related strip; peer chips stay topic tools/guides only.
- Smoke asserts both unique names **without** `.first()` papering.

---

## `guideCtaClasses` variants

| Export | Use |
|---|---|
| `guideCtaClass` / `Outline` / `Ghost` | Default guide CTAs |
| `*Sm` | First week / workshop compact rows |
| `*Block` | Full-width stacked tool cards |

Never nest `<Button>` inside `<Link>` on public guides. Hub `/app/**` is out of scope for this pass.

---

## Still out of scope

- Rewriting print / email-broadcast to labour-playbook depth (channel tier by design — see 2026-08-24 session knowledge)
- Canvas layout-matrix expansion
- Postgres / ops flip
- Hub advertising
