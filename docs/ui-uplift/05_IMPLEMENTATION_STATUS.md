# Implementation status

Updated 2026-10-01. **Baseline recovered; visual implementation paused at Ryan's request to control compute use.** Typecheck, production build and 17 focused foundation tests pass. ESLint is skipped by the repository's TypeScript 7 guard. Browser revalidation remains unavailable under the browser tool URL policy. See [recovered baseline](../product-refactor/13_UPLIFT_BASELINE.md) for authoritative integration and validation details.

## Baseline discrepancy

**Resolved by user direction:** Ryan authorized repairing the remote branch/code/setup needed to proceed. `feat/ui-uplift` now starts from `8be3584f`, contains the recovered audit and selected repaired foundations, and preserves the original worktree. The historical findings below explain the recovery; they are no longer a request to wait for a different baseline.

- Current uplift checkout: `a5d3`, detached at `7f95b679`; `origin/main` was refreshed and matches this revision.
- The requested `docs/product-refactor/` files are absent here and on that remote main.
- A local copy exists in worktree `764b` at `1cd62917`, with uncommitted structural changes. Its `12_IMPLEMENTATION_LOG.md` describes partial pilots, pending migration and no runtime validation. Its sprint tracker does not establish completion.
- The user has been asked to identify the completed branch, PR or worktree. Do not import another worktree's uncommitted changes or declare that its refactor is complete.

## Evidence gathered

Read the available archetype, interaction, target model, component, preservation and handoff material. Inspected current Home/HomeHeroPreview, public catalog metadata/explorer, Platform, shared typography/buttons/panels, Hub dashboard and Portal specification. The current homepage's setup-first CTA and communications-only preview support the user's diagnosis.

The seven uplift documents record an actionable design proposal without treating it as shipped UI. Locked dependencies were installed with `npm ci`. A loopback-only Next development server was used for the initial browser inspection with synthetic demo accounts and public Hub advertising enabled locally. No production service was accessed.

### Rendered baseline observations

| Surface | Observed state | Design implication |
|---|---|---|
| Home | EN at 1280px; FR at 375px | Setup leads, a communications-only example represents the product, and broad platform work is a small lower band. French hero copy and actions occupy most of the first screen before the example. |
| Create | EN at 1280px; default catalog with 18 results | Search/filter/deliverable structure is useful. Repeated metadata and large equal cards deserve a density review. Intro still tells visitors to configure Brand Kit first. |
| Learn | EN at 1280px; common-task choices and catalog | Preserve outcome-led entry choices and separate learning semantics. Avoid adding another navigation layer. |
| Brand Kit | EN at 1280px; initial unconfigured/hydrating view with editor and live preview | Existing workspace composition is valuable. Readiness, identity controls and preview should remain adjacent; completed hydration and configured/storage-failure states still need review. |
| Graphic Maker | EN at 1280px; default Member Spotlight controls and real preview | Preserve editing/output contracts. The title, purpose, setup prompt and presets consume substantial space above the working area. |
| Steward worksheet | EN RTW/accommodation at 1280px; empty intake | Keep necessary medical-privacy guidance and structured inputs. Do not replace the worksheet with a decorative canvas. No member information was entered. |
| Platform | EN at 1280px; two text-led product panels | Hub and Portal distinction exists but is mostly described. Real examples can communicate the difference more effectively. Copy still uses the old visible name “Utilities.” |
| Officer Hub | EN at 1280px; synthetic Local 777 president | Task-first attention, check-ins, context and valid next actions already exist. Preserve them; no new dashboard is needed. Public and operational navigation are still visibly stacked in this older baseline. |
| Local Portal | EN at 1280px; synthetic president's Together view | Hall, invited Circles, Actions, Calendar and Bulletin provide real demonstration material. This officer view does not prove member permission boundaries. |

Browser screenshots and DOM snapshots were inspected during the session. They establish the listed baseline observations only; no durable screenshot comparison artifact or completed responsive/accessibility test matrix is claimed. The temporary viewport override was reset and the inspection tab closed. The development process handle was no longer available on the subsequent continuation; recheck the listener before starting another server.

The original discrepancy was revalidated after that review. The user's subsequent repair authorization resolves it. The historical eight-sprint plan is not a new requirement to implement all architecture proposals before doing the requested visual work.

## Required before completion

1. Finish validating and recording the recovered foundation branch, preserving unrelated work.
2. Reconcile these initial runtime observations against that baseline and select real demo states.
3. Implement shared visual foundations and homepage, with EN/FR copy.
4. Verify the design across all nine requested representative surfaces.
5. Run appropriate lint, type, unit/smoke, responsive and accessibility checks; fix regressions.
6. Record evidence, update PROGRESS and What's new at the implementation milestone, and narrow remaining migration to low-value sibling adoption.

No passing application test suite, translation-quality review, accessibility conformance, deployment, or user-comprehension result is claimed by these documents. Installation and page rendering are not substitutes for those checks.
