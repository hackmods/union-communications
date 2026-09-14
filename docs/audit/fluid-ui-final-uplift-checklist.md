# Fluid UI final uplift — deferred surfaces audit (2026-09-08)

**Audience:** future agents + Ryan.  
**Product expand:** Previously out-of-scope surfaces now in scope for a phased final rollout.  
**Related:** [`session-knowledge-2026-09-08-fluid-ui-migration.md`](session-knowledge-2026-09-08-fluid-ui-migration.md), [`guide-layout-growth-backlog.md`](guide-layout-growth-backlog.md), [`.cursor/rules/guide-layout-standards.mdc`](../../.cursor/rules/guide-layout-standards.mdc).

**Execution order (phased):** Legal → Hub/Portal → Tool Editor chrome → OL dark shell → PDF.

**Tokens:** Prefer `PUBLIC_PAGE_TITLE_CLASS` / `PUBLIC_SECTION_TITLE_CLASS` / `PUBLIC_CARD_TITLE_CLASS` (`src/lib/constants/public-type.ts`) over rigid `text-2xl md:text-3xl`. Do not invent parallel type systems.

---

## Status

| Category | Status |
|----------|--------|
| 1. Tool Editor Cards & H1s | Done — `ToolEditorLayout` fluid H1 + shared form panel; form Cards unwrapped |
| 2. OL Dark Shell | Done — contrast + fluid 16-module grid + track/header breathe + sources `max-w-prose` |
| 3. Legal pages | Done — guide-ui + prose rhythm + DisplaySettings → PublicHubPanel |
| 4. PDF layouts | Done — margin safe floors + capture strips export chrome / buttons |
| 5. Hub / Portal dashboards | Done — HubDashboard + PortalStation fluid titles + denser grids |

---

## 1. Tool Editor Cards & H1s

**Primary entry:** `src/components/tools/ToolEditorLayout.tsx`  
**Legacy:** Rigid `text-2xl md:text-3xl` h1; form column often wrapped in `Card density="compact"`.

### Shared chrome
- `src/components/tools/ToolEditorLayout.tsx` — `PUBLIC_PAGE_TITLE_CLASS`, form panel (`p-4 md:p-6` brand surface)
- `src/components/tools/ToolRelatedFooter.tsx`
- `src/components/tools/RelatedToolsStrip.tsx`
- `src/components/tools/MobilePreviewStage.tsx`
- `src/components/tools/BrandSetupPrompt.tsx`
- `src/components/tools/ToolFormDetails.tsx`
- `src/components/layout/PageShell.tsx`
- `src/components/ui/Card.tsx` — default padding `p-4 md:p-6`

### ToolEditorLayout form pages (Card unwrapped → panel owns chrome)
`action-card`, `board-banner`, `board-notice`, `complaint-vs-grievance`, `document-generator`, `flyer-maker`, `graphic-maker`, `logo-builder`, `meeting-background`, `org-chart`, `pre-disciplinary-log`, `pulse-poll`, `qr-board`, `qr-card`, `quote-card`, `resizer`, `rtw-accommodation`, `solidarity-poster`, `website-template` — under `src/app/[locale]/tools/<slug>/page.tsx`.

### Bespoke PageShell (exceptions — keep Card where intentional)
- `src/app/[locale]/tools/alt-text/page.tsx`
- `src/app/[locale]/tools/rules-of-order/page.tsx`
- `src/app/[locale]/tools/proposal-tracker/page.tsx`

### Workspace delegate
- `src/app/[locale]/tools/bylaw-builder/page.tsx` → `src/components/tools/bylaws/BylawBuilderWorkspace.tsx`

**Uplift approach:** Chrome-first in `ToolEditorLayout` (fluid h1 + organic form panel). Leave canvas preview interiors alone.

---

## 2. Officer Learning dark shell

**Primary entries:**  
- Dashboard: `src/components/officer-learning/OfficerLearningDashboard.tsx`  
- Module: `src/components/officer-learning/ModuleViewer.tsx`  
- Theme: `src/lib/officer-learning/theme.ts`
- Tracks: `src/components/officer-learning/LearningTrackPicker.tsx`
- Sources: `src/components/comms/SourcesBlock.tsx` (+ `olTheme.sourcesCard` → `max-w-prose`)

### Routes
- `src/app/[locale]/guide/officer-learning/page.tsx`
- `src/app/[locale]/guide/officer-learning/[slug]/page.tsx`
- `src/app/[locale]/app/officer-learning/page.tsx` (Hub light board — treated with Hub phase)

**Uplift approach:** Stay on dark shell (no GuideLayout). WCAG contrast on cards/progress; fluid module grid `sm:2 lg:3 xl:4`; breathe track + header; sources `max-w-prose`. Prefer `olTheme` token tweaks over ad-hoc hex.

---

## 3. Legal pages

**Primary entries:**
- `src/app/[locale]/privacy/page.tsx`
- `src/app/[locale]/security/page.tsx`
- `src/app/[locale]/accessibility/page.tsx`
- `src/components/accessibility/DisplaySettings.tsx` → `PublicHubPanel`

**Uplift approach:** Keep **narrow pamphlet** shell. Use `guide-ui` (`GuideCallout`, `GuideSection`, `GuideProse`, `GuideBulletList`). Enforce `max-w-prose` + `leading-relaxed` + consistent `space-y-*`.

---

## 4. PDF layouts

**Primary entry:** `src/lib/export/text-pdf-layout.ts`  
**Contracts:** `.cursor/rules/guide-pdfs.mdc`, `docs/modules/GUIDE_PDF_LAYOUT.md`  
**Engine:** `src/lib/export/pdf-layout/*` — `WORKSHEET_MARGIN_SAFE_MIN` / `GUIDE_PDF_MARGIN_SAFE_MIN`  
**Capture:** `src/lib/export/capture.ts` — `stripExportChromeFromClone` removes `[data-export-chrome]`, `button`, `[role=button]`  
**Preview chrome:** `CanvasSafeZoneOverlay` stamped `data-export-chrome` (outside export roots; stripped if nested)  
**Verify:** `pdf-layout.test.ts`, `capture.test.ts`, `text-pdf-layout.test.ts`, `guide-pdf-contract.test.ts`

**Uplift approach:** Print engine only — safe zones, aspect, no interactive chrome in printable content. **Do not** apply Tailwind tip grids.

---

## 5. Hub / Portal dashboards

**Primary entries:**  
- Hub: `src/components/hub/HubDashboard.tsx`, `HubOfficerToolsCatalog.tsx`, `MyTasksWidget.tsx`, `MyCheckinsWidget.tsx`  
- Portal: `src/components/portal/PortalStation.tsx`

**Layouts:** `src/app/[locale]/app/layout.tsx`, `src/app/[locale]/portal/layout.tsx`

**Uplift approach:** Responsive CSS grids / balanced gaps; fluid titles via `PUBLIC_*` tokens; do not force GuideLayout onto authenticated shells.

---

## Phase log

| Phase | Category | Notes |
|-------|----------|-------|
| 1 | Legal | Done — privacy/security/accessibility on GuideSection/Callout/Prose; DisplaySettings uses PublicHubPanel |
| 2 | Hub/Portal | Done — HubDashboard + PortalStation fluid titles + denser grids |
| 3 | Tool editors | Done — ToolEditorLayout H1 + form panel; Cards unwrapped into panel |
| 4 | OL dark shell | Done — theme contrast, track grid, header space, sources prose measure |
| 5 | PDF | Done — margin safe floors + export chrome strip |
