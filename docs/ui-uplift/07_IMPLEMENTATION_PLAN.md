# Visual uplift implementation plan

Planning complete: 2026-10-01. Base: `fd204bb1` on `feat/ui-uplift`, pushed to origin. This plan covers the original visual uplift; it does not declare that work implemented. Ryan requested planning now and previously paused visual implementation to manage compute.

## Selected direction

Use strong editorial hierarchy, paper-like surfaces, deliberate rules and restrained orange accents. Real outputs provide the visual interest. Public pages explain the breadth; catalogs help choose; working screens prioritize the task. Preserve all seven archetypes, routes, tenancy, permissions, storage semantics and export geometry.

The homepage headline starting point is **“Tools for the work of your union.”** Supporting copy names communications, workplace preparation, learning and shared local operations. Review English and French together in the actual layout; wording can improve without changing the narrative.

Primary action: **Explore the tools**, linking to an on-page outcome section with direct useful destinations across the existing catalogs. Secondary action: **Explore the platform**, linking to `/platform`. Neither depends on Brand Kit completion. Provide a direct example-tool action inside the product demonstration. Preserve existing hosted availability gates and distinguish explanation from an offer of immediate hosted access.

## Homepage composition

1. **Compact split hero.** Message and actions beside a readable product example selector: make a notice, prepare a workplace issue, learn steward skills. Show one example at useful size, with a short label and direct destination. No automatic rotation. Tabs, if used, have keyboard semantics and preserve the reading order. Mobile places the premise and primary action first, then the example; labels wrap and the content is not a scaled-down desktop dashboard.
2. **Today's work.** An open, ruled list of six outcomes: make graphics/documents; build a local website; prepare a grievance; plan return-to-work/accommodation; run meetings/governance; train stewards/officers. Link to verified canonical destinations, preserving existing catalog taxonomy. Brief related links expose floor notes, agreement reference and bargaining where implemented. Avoid turning this into a second exhaustive catalog.
3. **One identity, repeated use.** Show one synthetic local identity on a real graphic, document and website output where supported. Explain reuse and offer Brand Kit here. Do not imply every tool consumes every Brand Kit field or that it changes hosted membership.
4. **Shared operations, clear boundaries.** Pair an actual synthetic Officer Hub task view with an actual member-safe Portal view. Explain private officer/steward work and appropriate member information/participation. Separate captures and captions make the confidentiality boundary clear; no arrow implies automatic publication of private records. Give this section substantial space and link to Platform.
5. **Privacy and next action.** A concise comparison of browser-local preparation and permissioned hosted work, with existing Trust/Privacy/Security links. End with immediate tool discovery and the platform path. Keep Comms-free wording distinct from hosted cost recovery.

The hero and platform examples together must show breadth beyond communications. Do not substitute a long feature list for visible product evidence.

## Demonstration production

Use synthetic Local 777 examples, explicitly labelled as examples, never actual member/case data. Prefer a lightweight existing presentation component fed explicit sample props. If it requires auth, stores or a large editor dependency, capture the actual application with synthetic data instead; give the image useful alternative text, intrinsic dimensions and a caption. Never mount authenticated live data on Home or add a marketing-only imitation dashboard.

For each selected example, record route, locale, state, source component or capture path, and what the image proves. Read the canvas contract before touching any output renderer. Do not rewrite the capture engine to obtain a hero. Include French examples or genuinely language-neutral output when a screenshot carries readable text. The public bundle must not acquire full builder, export or hosted data libraries merely to display examples.

Browser revalidation is currently blocked by the browser tool's local-URL policy denial. Resolve that access through supported permission/configuration before new captures or visual acceptance; do not bypass it with another automation channel. Source work can proceed when requested, but final visual sign-off requires actual rendered evidence.

## Execution checkpoints

| Checkpoint | Work and principal owners | Exit evidence |
|---|---|---|
| 1. Shared foundation | `globals.css`, existing typography/SectionHeading, Button/ButtonLink, Card, Header and Footer. Audit consumers before edits; retain PageShell widths and measured sticky offsets. | Public and working examples rendered together; clear hierarchy, visible focus, contrast, no export-root style leakage. |
| 2. Complete homepage | `components/pages/HomeContent.tsx`, replace or reshape `HomeHeroPreview.tsx`, both message catalogs. Implement the whole narrative and real examples. Remove obsolete hero styling/helpers only after checking consumers. | EN/FR Home demonstrates multiple jobs, obvious immediate action, Brand Kit reuse, platform distinction and honest trust language. All destinations resolve; availability gates work. |
| 3. Representative adoption | PublicCatalogExplorer for Create/Learn; Brand Kit; ToolEditorLayout/Graphic Maker; RTW worksheet; Platform; Hub dashboard/nav; Portal. Prefer shared fixes discovered here. | Nine-surface review matrix; useful desktop density and intentional phone layout. Domain state/actions and output fidelity preserved. |
| 4. Verification and handoff | Fix observed defects; update docs 00–06 with actual decisions/results, PROGRESS and bilingual What's new. | Relevant automated checks and rendered acceptance completed; concrete low-value sibling migration list; reviewable final diff. |

Finish each checkpoint before broadening scope. A significant unresolved preview or shared-layout defect takes priority over styling another sibling page. Do not restart product research already recorded unless code contradicts it. Do not assign speculative hour or token estimates; checkpoint scope and remaining evidence are the planning controls.

## Acceptance matrix

- **Home and Platform:** EN/FR at 375, 768, 1280 and 1536px; 320px reflow; 200% zoom and text preferences. Verify headings, reading order, CTA targets, long French labels, demonstration controls and image alternatives. A reviewer can identify several jobs, immediate tools, shared operations and the local/hosted distinction after a brief look. Record this as review evidence, not a fabricated user-study result.
- **Create and Learn:** desktop and phone in both locales; search/filter/clear/no-results and browser Back; no unnecessary new discovery model.
- **Brand Kit, Graphic Maker, RTW:** desktop and phone, French expansion, retained form values, visible validation/save status, editor/preview switching and reachable output actions. Compare a generated output before/after any shared style change that reaches its renderer.
- **Hub and Portal:** desktop and phone with synthetic role/module states; verify existing MFA/permission boundaries and a member-safe Portal view. Keep primary actions, scope and work records prominent. Do not infer member safety from an officer screenshot.
- **Shared accessibility:** keyboard-only paths, visible focus, dialog return/containment, labels/help/errors, contrast, reduced motion and no page-level horizontal overflow. Automated checks supplement rendered and keyboard review.
- **Automated gates after implementation:** `npm run typecheck`, `npm run lint`, `npm run test:unit`, `npm run test:smoke`, and `npm run build`, plus relevant export coverage if affected. Inspect failures and actual coverage; never claim the currently skipped ESLint run is a pass. Do not repeatedly run broad suites without a change or unresolved failure.

## Stop boundary

Complete Home, shared system, Platform presentation and the nine-surface validation/fixes. Stop before repetitive migration of every guide, module or tool. Residual items must name the affected component, established pattern to adopt and verification needed. Missing hero breadth, bilingual responsiveness, working-screen regressions or inaccessible controls cannot be deferred as migration cleanup.

## Progress log

- **Checkpoint 1, code complete; visual acceptance pending:** task-first Home hierarchy, brand-aware example selector, flat shared workspace panels, quieter catalog results, and consistent Platform sections are implemented. Typecheck and production build pass. Full unit suite: 3,239 passed, 2 skipped and 1 todo. ESLint is skipped by the TypeScript 7 compatibility guard.
- **Shared-surface refinement, 2026-10-01:** flattened Local Portal's shared panel and loading shell and replaced the member station's lift/shadow hover with a color cue. This keeps the contained member work legible while reducing decorative movement. Source review only; rendered acceptance is still pending.
- **Copy accuracy, 2026-10-01:** EN/FR Home now calls the hero art a sample preview and explains that browser-local Brand Kit identity is applied. Four copy/SEO/readability test files passed (46 tests); TypeScript passed.
- **Builder adoption, 2026-10-01:** flattened the shared `ToolEditorLayout` form boundary after confirming it serves the graphic, flyer, RTW and 30+ other editors. Editor state, spacing, export output and mobile pane behavior are preserved; rendered comparison remains pending.
- **Learning adoption, 2026-10-01:** kept the Officer Learning theme but removed catalog-card lift/image zoom, added a keyboard focus ring and retained reduced-motion behavior. Hub dashboard source review found no shared visual change justified.
- **First-screen clarity, 2026-10-01:** rewrote EN/FR hero language around materials, workplace cases and moving local work; supporting lines now name agreement reference, grievance preparation, accommodation planning, learning, and separate private/member spaces. The smoke assertion now checks concrete framing and truthful sample labeling.
- **Checkpoint 2, implementation in progress:** Home copy, direct canonical task links, local identity story, hosted audience boundaries, privacy distinction and hero preview choice are in the working tree. The current communications sample does not show steward or hosted interface states. Real Hub/Portal preview evidence and responsive visual acceptance remain open.
- **Checkpoint 3, pending:** inspect and adopt the system across the nine representative routes in current runtime states.
- **Checkpoint 4, pending:** browser review, full appropriate checks, final docs and migration boundary.

The previous next action is underway. Continue checkpoint 1 while supported browser access for visual comparisons is resolved; no more architecture planning is needed.
