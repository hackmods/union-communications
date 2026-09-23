# Customization conversion inventory — C01

Baseline: `1f68490`, inspected 2026-09-22. No consumers have been converted yet.

## Selected pilot and ownership

| Resource key | Current route / catalog ID | Implementation and content owner | Conversion boundary |
|---|---|---|---|
| `guide:learn-print` | `/learn/print` (legacy `/guide/print`); `learn-print` | `src/app/[locale]/guide/print/page.tsx`; EN/FR `printGuide`; `GuideLayout` and `guide-ui` | Plain server-rendered guide selected for C08. Structured blocks can cover the five chapters without changing interactive tools. Preserve tool aside, related links and canonical metadata in code. |
| `source:<opaque-id>` | Registry only | `src/lib/constants/comms-sources.ts`; Print uses page ID `print` | Import individual reviewed references later with immutable source revision IDs. Do not copy all reference-tenant sources into neutral defaults. |
| `tool:rules-of-order` | `/create/rules-of-order`; `create-rules-of-order` | `src/app/[locale]/tools/rules-of-order/page.tsx`; `src/lib/rules-of-order/actions.ts`; EN/FR `rulesOfOrder` | C02 registers only supported initial category/action defaults. C08 wires them to the existing state. Search/copy behavior and parliamentary claims stay compiled. |
| `brand:baseline` | `/create/brand-kit` | `brand-registry.ts`, `identity-packs.ts`, `unionPresets.ts`, brand store/DataAdapter | Explicit apply/undo in C08; no saved-kit rewrite or Hub identity mapping. Fonts reference `canvas-fonts.ts`. |
| `guide:<custom-id>` | Proposed `/learn/custom/[unionSlug]/[guideSlug]` | New typed blocks and DB content | No existing catalog entry or route. Root creates content after C04–C08. |

Print pilot stable chapter IDs: `when`, `flyers`, `boards`, `logistics`, `digital`. During conversion, derive individual block IDs from chapter plus named translation item, e.g. `flyers-type`, never an array index. Manifest version starts at `1`; C02 introduces the manifest contract, not a duplicate copy of the published Print guide. Preserve current TSX fallback until conversion is verified.

All other guides remain **not converted**. Photo Consent has substantial contextual callouts and an Officer Learning cross-link; Officer Learning has bespoke module/progress behavior. Their section gating/editing must remain unavailable until individually inventoried. Catalog metadata/source integration does not make a TSX body editable. Existing union-specific compiled examples remain public.

## Workflow call-site inventory

`resolveGrievanceConfig` currently appears in:

- `src/lib/tenant/loader.ts` — synchronous collection → union fallback definition.
- `src/app/api/grievances/route.ts` — resolves case deadline configuration.
- `src/app/api/portal/my-cases/route.ts` — member-facing due configuration.
- `src/lib/hybrid/local-case-store.ts` — two calls for local case deadlines/details.
- `src/lib/tenant/loader.test.ts` — FT/PT and union fallback assertions.

C12 must re-search before converting these consumers and trace downstream export/deadline logic and hybrid serialization. C02 validates whole workflow payloads but does not change live deadlines or case storage.

## Platform compatibility findings

- Tenancy: union → optional division → local → optional bargaining unit. `locals.divisionId` is singular. Scope records must validate actual parent IDs; same local number is not same tenant.
- Existing public tool settings disable by platform/union/local; `pulse-poll` is excluded from that checklist. New audience restrictions cannot bypass those switches.
- Actor resolution uses active memberships/assignments/delegations when durable auth is configured. Union mismatch is denied by the current generic capability function; do not change that to create Root editing.
- `next.config.ts` uses `output: 'standalone'`; Cache Components is not enabled. Scoped runtime routes will need explicit dynamic/no-store serving. `/learn/:slug` rewrites to legacy guide pages; reserve the deeper `/learn/custom/...` namespace explicitly when adding routes.
- `public/sw.js` precaches only the neutral locale shells, manifest and OG image. It does not cache fetched guide bodies, RSC or APIs, but navigation failures fall back to the neutral shell. C10 must test scoped offline UX and prevent protected precaching.
- Current database journal ends at `0053_access_requests`; re-read it before C04. No migration number is reserved here.
- Brand Kit persistence remains through `DataAdapter`, browser-first; dynamic preset loading must not opt users into API persistence.

## Regression baseline and next step

Local baseline passed: 7 suites / 69 tests covering tenant loader/tenant, public-tool visibility, public catalog, source registry, brand registry and canonical route mapping. Command: `npm run test:unit -- src/lib/tenant/loader.test.ts src/lib/tenant/tenant.test.ts src/lib/public-tools/visibility.test.ts src/lib/comms/public-catalog.test.ts src/lib/constants/comms-sources.test.ts src/lib/brand/brand-registry.test.ts src/lib/seo/public-routes.test.ts`.

C01 and C02 complete. C02 implements typed contracts, scope validation and pure resolution tests under `src/lib/customization/`; the pilot consumers remain unconverted. Next: C03 authorization before C04 SQL/RLS. No E2E GitHub Actions run triggered.
