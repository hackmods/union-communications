# Customization foundation (C02)

This directory implements the pure **authoring/compiler** contracts. It has no routes, database connection, authentication, shared cache or renderer. `resolveCustomization` returns internal content that can include private sections; it must never be serialized directly to a reader. C03 supplies authorization and C04–C06 supply durable publication and safe delivery.

## Boundaries

- `schemas.ts`: strict Zod payloads, patches, policy, source dependencies and scope descriptors. Unsupported fields/block types/schema versions fail validation; JSON has a 256 KiB per-document limit. Plain text is data, not HTML to execute.
- `scope.ts`: exact parent chain from trusted tenant descriptors, at most five levels, no guessed tenant. Missing target means system only; an invalid explicit target throws. The future adapter must derive descriptors from actual tenant relationships, not accept them from a client request.
- `registry.ts`: code-owned supported tool parameters. Only Rules of Order initial category/action are registered now; consumer integration is C08.
- `defaults.ts`: validates versioned compiled manifests. The shipped manifest is intentionally empty until a guide/tool consumer is converted; existing TSX and Brand Kit defaults remain authoritative today.
- `merge.ts`: stable-ID block/source operations, whole source/workflow replacements, typed brand field operations, restrictive policy intersection and semantic invariants.
- `resolve.ts`: resolves one resource from its compiled manifest and active layers, recording field/block/policy provenance. Inputs are parsed/cloned; callers' manifests and overrides are not mutated.

## Calling contract

Supply a resource key, manifest, authoritative scope directory, optional target scope ID, and zero or one active layer per scope for that exact key/chain. Input order does not determine precedence. A `define` layer introduces a previously absent resource; existing resources require a typed `patch`. `inherit` means this scope contributes nothing; to remove an override, the publication adapter replaces that scope's active operation rather than appending a second operation. `withdraw` denies the resolved resource even without a definition. Disabled ancestors and withdrawn resources never fall back to generic content.

Guide source entries pin `{ id, revisionId }`. Supply their resolved `sourceDependencies` in the same chain. Missing pins, cross-chain dependencies and sources more restricted than the consuming block are compilation errors. Source-dependency audiences must include their effective ancestor restrictions when loaded by the later publication service. Current withdrawal and membership checks remain mandatory in the future reader path even for compiled content.

Results are `resolved`, `missing`, or `unavailable` (`disabled`/`withdrawn`). Invalid data throws instead of becoming `missing`. The later adapter must propagate database errors as unavailable service responses, not pass an empty layer array on failure.

An explicit block replacement cannot lower that block's audience. Removal followed by re-addition in a descendant retains the inherited audience floor. Reordering lists requires every stable ID exactly once. Whole workflow replacement changes this compiler output only; live case deadlines and workflow snapshots are untouched until C12.

`editableFields` is the inherited boundary for future local editing, not permission to mutate. This compiler does not know who authored a patch. C03 must check the actor; C14 must check submitted fields against the inherited allowlist. Likewise, compiler `enabled` state composes only supplied layer policies; callers must also enforce existing platform tool switches and Hub module gates.

## Local verification

`npm run test:unit -- --maxWorkers=2 src/lib/customization` covers synthetic independent tenants, no-context fallback, sibling/unit isolation, stable-ID conflicts, source revisions, whole workflow replacement, audience restrictions, provenance and schema limits. `npm run typecheck` and `npm run lint` validate integration with repository tooling. No E2E or production content is required for this module.

Resume from [C03 in the execution plan](../../../docs/audit/plan-2026-09-22-union-customization.md). Full design: [UNION_CUSTOMIZATION.md](../../../docs/modules/UNION_CUSTOMIZATION.md).
