# Component patterns

Status: existing components adopted and extended; no new universal framework.

| Pattern | Existing owner | Uplift responsibility |
|---|---|---|
| Orientation | `HomeContent`, Platform page | Outcome-led narrative, real examples, clear immediate and hosted paths |
| Discovery | `PublicCatalogExplorer` | Scanable titles, deliverables and filters; preserve query/Back behavior and availability |
| Reading | `GuideLayout`, Officer Learning components | Readable measure and hierarchy; retain teaching, sources, progress and quizzes |
| Focused task | Shared form controls, domain form | Clear primary action, associated labels/help/errors, preserved values |
| Editor | `ToolEditorLayout` | Quiet framing, useful desktop pairing and mobile Edit/Preview; preserve mounted renderers |
| Operational workspace | Hub/Portal domain components | Compact context, records, allowed actions and honest state feedback |
| Configuration | Brand Kit, scoped administration | Group settings by consequence; keep autosave, Apply and explicit Save distinct |

Current implementation: Home uses `SectionHeading`, `Eyebrow`, `ButtonLink`, PageShell and the existing `HomeHeroPreview`; direct work links are an editorial list. Its learning example uses a real localized course title, summary, quiz marker and canonical lesson link. A second open preview draws the RTW title, functional-limits prompts and measure options from the actual tool translations and measure catalog; it contains no case data and links to the working worksheet. Platform uses two ruled audience sections rather than nested cards. Create/Learn results are open entries; filters retain their existing bounded control group. `PublicHubPanel` remains the common flat white workspace boundary. Local Portal's `PortalPanel` uses the same quiet white boundary, including its loading state; station, dispatch and fronts entries use restrained color-only hover cues without lift or arrow motion. `ToolEditorLayout` keeps its existing form spacing and mobile edit/preview interaction but uses a flatter, smaller-radius form boundary across all editor consumers. Officer Learning retains its established palette and cover art, with a still card, explicit keyboard focus and reduced-motion-safe transition. The mobile Hub toolbar calls its module/tools drawer “Tools” / “Outils” so it is visually distinct from the global site menu while keeping its specific accessible open/close label.

Product demonstrations are not a new interactive application embedded in Home. Prefer real renderers when safe and lightweight; otherwise capture real synthetic states and label them. Do not load authenticated case data into public marketing or replicate authorization logic in a preview component.

PublicHubPanel, PortalPanel and artifact frames can use related visual tokens while retaining separate responsibilities. A notice is not a card, a page heading is not a hero, and a worksheet result is not a canvas.

Shell measurements, editor keyboard tabs, Dialog and field-feedback associations are integrated in `fd204bb1`. Reuse those foundations. WorkspaceHeader and domain-specific pilots were not imported and are not prerequisites for this pass. Introduce a shared visual primitive only when actual consumers justify it.
