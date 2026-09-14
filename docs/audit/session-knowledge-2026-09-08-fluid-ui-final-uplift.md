# Session knowledge — Fluid UI final uplift (2026-09-08)

**Goal:** Finish deferred fluid architecture surfaces (Tool editors, OL dark shell, Legal, PDF, Hub/Portal) with phased execution and a file checklist.

## Delivered

| Phase | What shipped |
|-------|----------------|
| Legal | `privacy` / `security` / `accessibility` → `GuideSection` / `GuideCallout` / `GuideProse` / `GuideBulletList`; `DisplaySettings` on `PublicHubPanel` |
| Hub/Portal | `HubDashboard`, tools catalog, task/check-in widgets, `PortalStation` — `PUBLIC_*` titles + denser CSS grids |
| Tools | `ToolEditorLayout` fluid H1 + brand form panel (`p-4 md:p-6`); form `Card` wrappers unwrapped into the panel |
| OL | `olTheme` contrast (progress / cards / status pills); track picker grid; header space; sources `max-w-prose` |
| PDF | `WORKSHEET_MARGIN_SAFE_MIN` / `GUIDE_PDF_MARGIN_SAFE_MIN`; capture `stripExportChromeFromClone`; overlay `data-export-chrome` |

## Authoritative checklist

[`fluid-ui-final-uplift-checklist.md`](fluid-ui-final-uplift-checklist.md)

## Do not regress

- OL stays on dark shell — never `GuideLayout`.
- Text PDFs stay on `pdf-layout` / `text-pdf-layout` — no Tailwind tip grids on print.
- Safe-zone overlays stay **outside** `[data-export-root]`; capture still strips chrome if nested.
- Hub/Portal do not inherit public GuideLayout chrome.
