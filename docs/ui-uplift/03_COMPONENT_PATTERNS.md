# Component patterns

Status: planned review against the existing components; no new universal framework.

| Pattern | Existing owner | Uplift responsibility |
|---|---|---|
| Orientation | `HomeContent`, Platform page | Outcome-led narrative, real examples, clear immediate and hosted paths |
| Discovery | `PublicCatalogExplorer` | Scanable titles, deliverables and filters; preserve query/Back behavior and availability |
| Reading | `GuideLayout`, Officer Learning components | Readable measure and hierarchy; retain teaching, sources, progress and quizzes |
| Focused task | Shared form controls, domain form | Clear primary action, associated labels/help/errors, preserved values |
| Editor | `ToolEditorLayout` | Quiet framing, useful desktop pairing and mobile Edit/Preview; preserve mounted renderers |
| Operational workspace | Hub/Portal domain components | Compact context, records, allowed actions and honest state feedback |
| Configuration | Brand Kit, scoped administration | Group settings by consequence; keep autosave, Apply and explicit Save distinct |

Product demonstrations are not a new interactive application embedded in Home. Prefer real renderers when safe and lightweight; otherwise capture real synthetic states and label them. Do not load authenticated case data into public marketing or replicate authorization logic in a preview component.

PublicHubPanel, PortalPanel and artifact frames can use related visual tokens while retaining separate responsibilities. A notice is not a card, a page heading is not a hero, and a worksheet result is not a canvas.

Refactor-owned shell measurement, WorkspaceHeader, tabs, dialogs and field-feedback semantics must come from the confirmed structural implementation. Do not recreate the pending pilots in this uplift branch.
