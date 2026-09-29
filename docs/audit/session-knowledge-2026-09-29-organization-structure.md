# Session knowledge — Organization structure admin uplift

**Audience:** future agents + Ryan.
**Date:** 2026-09-29.

## Problem

Site Admin split “Unions” and “Locals” into two cards. The Locals union detail
could create bargaining collectives and locals, but operators could not edit or
hard-delete locals/collectives, and collective create was free-text with no Brand
Kit alignment. Duplicate OPSEU / SEFPO rows were hard to clean from the Locals
workflow even though union rename already existed.

## Shipped

- Canonical Site Admin surface: **Organization structure**
  (`/app/site-admin/organization` + `/organization/[unionId]`).
- Legacy `/app/site-admin/unions` and `/app/site-admin/locals*` redirect there.
- One Site Admin card; “local” remains the labour term for numbered units.
- Locals: `PATCH` / `DELETE` `/api/site-admin/locals/[id]` — edit number /
  sub-line / collective binding; hard-delete only when archived + empty
  (typed local number confirm + MFA).
- Collectives (Division): `/api/site-admin/collectives*` create / update /
  archive / restore / empty hard-delete (typed code confirm + MFA).
- Brand Kit dropdowns: OPSEU sector + suggested division labels for collectives;
  `snippetSetupCollectionsForPreset` for collections when `commsPresetId` is bound.
- UI: `LocalLifecycleActions`, `CollectivesAdminPanel`, catalog-aware
  `CreateLocalForm`.
- Mobile polish: `LocalsAdminPanel` / collectives card stacks with
  `stackActions`; orphan collective option in local edit Select; Brand styles
  deep link when catalog empty; `localsOnlyArchived` when every local is
  archived (do not show “no locals”).
- Hub/public menus at Accessibility maximum text: Hub toggle keeps short
  “Menu” visible label (aria-label carries open/close); `DisplaySettingsMenu`
  portals with rem-aware flip; Header + HubNav remeasure on `data-font-size`;
  matrix e2e in `e2e/mobile-menu.matrix.spec.ts`.
- Defer polish: `OrganizationStatusFilter` on locals/collectives; create
  collective moved into `CollectivesAdminPanel` footer (`CreateCollectiveForm`);
  jump links on union detail; title “Organization structure — {name}”.

## Do not

- Cascade-delete production casework from this surface — Demo cleanup for
  `is_demo` wipes.
- Treat Brand Kit catalogs as Hub tenancy — they only prefill create forms.
- Rename the labour term “local” in member-facing copy when changing this admin
  grouping label.

## Cleanup of live duplicates

1. Open Site Admin → Organization structure.
2. Rename / archive unused same-name unions; Delete when empty + archived.
3. On a union detail: edit or archive mistaken locals/collectives; Delete only
   after archive when attachment counts are zero.
