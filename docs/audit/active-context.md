# UnionOps — Active Technical Context (for AI agents)

**Purpose:** ground-truth technical reference so cheaper/faster sub-agents (Grok, Composer, etc.) don't have to re-derive the architecture from scratch. Generated 2026-07-22 from direct file reads; all paths verified against `git ls-files`. Read this alongside `AGENTS.md`, `.cursor/rules/platform.mdc`, `.cursor/rules/roadmap-next.mdc` (those remain the canonical *intent* docs; this file is the as-built map).

---

## 1. Tech stack (exact versions, from `package.json`)

- **Next.js** `16.2.10`, App Router, `src/app/[locale]/...` structure
- **React** `19.2.4` / **react-dom** `19.2.4`
- **TypeScript** `^5`, **Tailwind CSS** `^4` (`@tailwindcss/postcss`)
- **next-intl** `^4.13.1` — EN/FR via `[locale]` segment, `src/i18n/routing.ts`
- **next-auth** `^5.0.0-beta.31` ("Auth.js") — credentials provider only, JWT sessions
- **zustand** `^5.0.14` — client state for Brand Kit (`src/store/brand-store.ts`) and canvas tools
- **Export libs:** `html-to-image`, `jspdf`, `jszip`, `file-saver`, `docx`, `docxtemplater` + `docxtemplater-image-module-free`, `pizzip`, `exceljs`, `pptxgenjs`, `qrcode`, `pdfjs-dist`
- **bcryptjs** `^3.0.3` — **declared but not called anywhere in the live auth path** (see §4)
- **No** database driver, ORM, or query builder (`pg`, `prisma`, `drizzle-orm`, etc.) is present — confirms the "memory adapter" architecture is total, not partial
- **No** schema-validation library (`zod`, `yup`, etc.) — all API input validation is hand-written
- Node engine requirement: `>=24.0.0`
- Test stack: **Vitest** `^4.1.10` (`npm run test:unit`) + **Playwright** `^1.61.1` + `@axe-core/playwright` (`npm run test:smoke`, `--grep @smoke`)

## 2. Route structure

```
src/app/
  layout.tsx                      # root: metadata/PWA manifest, no next/font, passes through
  robots.ts / sitemap.ts / manifest.ts / opengraph-image.tsx / twitter-image.tsx
  api/**/route.ts                 # all server logic (see §5)
  [locale]/
    layout.tsx                    # real <html>, providers, SkipLink, Header/Footer, JSON-LD
    page.tsx                      # public marketing home
    tools/**                      # public Comms canvas tools (no auth)
    guide/**                      # public educational content (TSX + next-intl, NOT MDX)
    app/**                        # authenticated Officer Hub
      page.tsx                    # Hub dashboard (client component, useSession-gated)
      login/, register/, mfa/, join-local/
      grievances/, grievances/[id]/, grievances/new/
      bumping/, bumping/[id]/, bumping/new/
      time/, time/admin/
      audit/, overdue/, snippets/, marketplace/, handoff/, hybrid/
```

**No MDX anywhere** — zero `*.mdx` files in the repo. Guides are server components calling `getTranslations()` against `messages/en.json` / `messages/fr.json`, wrapped in shared `GuideLayout` / `SourcesBlock` / `Callout` components.

**No Next.js `loading.tsx`, `error.tsx`, or `not-found.tsx` files anywhere under `src/app/`** (verified via `git ls-files` grep — zero matches). Loading/empty states are hand-rolled `<p>{t("loading")}</p>` per component; there are no shared `Skeleton`/`EmptyState` primitives.

## 3. Route protection — how it actually works (not what docs claim)

`docs/ARCHITECTURE.md` states "Middleware protects `/app/*`." This is **stale**: there is no `middleware.ts`. Next.js 16 route gating in this repo is `src/proxy.ts`:

- Matches everything except `api`, `_next`, `_vercel`, and any path with a file extension (`.*\..*`) — **API routes are explicitly excluded from proxy-level gating** and must self-check `auth()`.
- For matched paths: if the path contains `/app` and is not `/app/login` or `/app/register`, requires `req.auth` truthy, else redirects to login.
- `src/auth.config.ts`'s `authorized()` callback duplicates the same `/app` rule (used by the Auth.js `authorized` hook the proxy consults).

**Practical consequence:** every confidential API route must independently call `auth()` + check `mfaVerified` + check roles. Most do (via `requireGrievanceSession()` / `requireBumpingSession()` / `requireTimeSession()` — see `src/lib/auth/{grievance,bumping,time}-session.ts`), but there is no single enforced choke point, so a new route that forgets the check is a silent hole. `src/app/[locale]/app/page.tsx` and `src/app/[locale]/app/audit/page.tsx` are plain client components that only gate rendering via `useSession()` — the *data* is still protected because `/api/audit` checks role+MFA server-side, but the page shell itself has no server-side redirect.

## 4. Auth model — exact behavior

- **Provider:** `src/auth.ts` — single `Credentials` provider, `authorize()` calls `findDemoUser(email, password)` from `src/lib/auth/demo-users.ts`, which does a **plaintext string compare** against a hardcoded roster (all demo accounts use password `demo123`). `bcryptjs` is never imported/called by this path.
- **Secret:** `process.env.AUTH_SECRET ?? "dev-secret-change-in-production"` in both `src/auth.ts` and `src/auth.config.ts` — silently falls back to a public, hardcoded literal if the operator forgets to set `AUTH_SECRET`.
- **JWT claims** (`src/auth.config.ts` `jwt()`/`session()` callbacks): `unionId`, `divisionId`, `localId`, `bargainingUnitId`, `accessibleLocalIds`, `roles[]`, `mfaVerified`. All of these except `roles`/`unionId` at initial sign-in are **also writable via `trigger === "update"`** — i.e. any authenticated client can call the NextAuth `session.update({...})` client hook and directly set `mfaVerified: true`, or change `localId`/`bargainingUnitId`, with **no server-side re-validation** against `accessibleLocalIds` or a real MFA check. See `src/app/[locale]/app/mfa/page.tsx` (client sets `mfaVerified` after `/api/mfa/verify` returns `{success:true}` — the API response itself never touches the session) and `HubContextSwitcher.tsx` (sets `localId`/`bargainingUnitId` the same way).
- **MFA endpoint** (`src/app/api/mfa/verify/route.ts`): accepts any `\d{6}` string, compares against `process.env.AUTH_MFA_CODE ?? process.env.AUTH_DEV_MFA_CODE ?? "000000"` — **one shared code for the entire instance**, not per-user, not TOTP. Comment in the file itself acknowledges this is a placeholder ("wire TOTP later").
- **Solo accounts** log in with `mfaVerified: true` at sign-in time (`demo-users.ts`), skipping the MFA gate entirely by design.

## 5. Data model map (as-built, not aspirational)

All types below are the actual TypeScript interfaces in the repo (not the prose descriptions in `docs/modules/*.md`, which are sometimes ahead of the code — e.g. `docs/modules/GRIEVANCE.md` describes a `GrievanceDocument` type that does not exist; the real implementation is the generic `AttachmentMeta`).

### Tenancy (`src/types/tenant.ts`)
`Union` → optional `Division` → `TenantLocal` → optional `BargainingUnit` ("Collection" in UI) → users. `UserRole` union: `platform_admin | union_admin | division_admin | local_president | local_exec | local_steward | stability_member | solo_account`.

### Grievance (`src/types/grievance.ts`)
```typescript
interface Grievance {
  id, unionId, localId, bargainingUnitId?,
  memberPseudonym?, category, status: "open"|"in_progress"|"escalated"|"resolved"|"withdrawn",
  currentStep: number, filedAt, resolvedAt?, assignedStewardId, createdById, updatedAt
}
```
- `GrievanceEvent` (timeline: `step_filed|response_received|meeting_scheduled|deadline|escalation|resolution`), `GrievanceNote` (append-only, no edit/delete), `EmailDraft` (copy-only, `step1_meeting|extension_request|member_update`).
- **No** arbitration outcome/award field, **no** settlement-terms field, **no** appeal-deadline field distinct from `CAConfig` `responseDays`. Step 4 ("Arbitration") in the reference seed has `responseDays: null` — i.e. no deadline is ever computed for it.
- Deadlines: `src/lib/grievance/deadlines.ts` computes from `filedAt` + `CAConfig.steps[].responseDays`; `resolveGrievanceConfig()` in `src/lib/tenant/loader.ts` resolves Collection (`bargainingUnitId`) config → union fallback.

### Bumping (`src/types/bumping.ts`)
```typescript
interface BumpingCase {
  id, unionId, localId, memberRef, seniorityDate: string,
  currentPosition, targetPosition, scenario, status: "open"|"in_review"|"decided"|"closed",
  incumbentPosition: PositionDescription, bumpingPosition: PositionDescription,
  checklist: ChecklistState, createdById, createdAt, updatedAt
}
```
- `seniorityDate` is **storage only** — no comparison/ranking function reads it. `ChecklistState` is a map of boolean/null flags (manual, e.g. `seniority_verified`) filled in by the committee, not computed.
- `DecisionRecord` (`outcome`, `rationale`, `dissentNotes` — free text) is how a decision is recorded; nothing in the code computes who is eligible to bump whom. This module is a **structured note-taking + PDF-diff aid**, not a seniority engine.
- PDF diff: `src/lib/bumping/pdf-extract.ts` (client-side `pdfjs-dist` text extraction) + `src/lib/bumping/diff.ts` (naive line-level diff, no real document-structure awareness).

### Time (`src/types/time.ts`)
`TimeEntry` (categories `staff|release|duty_bank|action|volunteer`; `entrySource: clock|manual_range|bulk_event`; optional GPS + `geofenceResult`), `JobCode`, `WorkSite` (geofence radius/mode), `TimeWorker` (lite roster), `TimeExpectedWindow` + `TimeNeededRow` (the "entry needed" gap board). Geofencing (`src/lib/time/geofence.ts`) is a real Haversine-distance check, but `WorkSite` rows are empty in the reference seed, so it's effectively a no-op today.

### QOL / cross-cutting (`src/types/qol.ts`)
`MemberCommunication` (channel/direction log on a grievance), `CaSnippet` (searchable CA clause library — the closest thing to a "knowledge base"), `SharedTemplate` (within-union template marketplace, kinds `ca_snippet|email|caption|checklist|other`), `ScheduledMeeting` (+ ICS export), `HandoffRequest/Package/Result` (officer handoff wizard). **None of these implement threaded discussion, task assignment, or real-time chat.**

### Attachments (`src/types/attachments.ts`) — Phase 7 scaffold, confirmed stub
```typescript
interface AttachmentMeta {
  id, unionId, localId, bargainingUnitId?, grievanceId?, bumpingCaseId?,
  fileName, mimeType, sizeBytes,
  storageKey: string,        // literally "memory://..." — no object storage
  scanStatus: "pending"|"clean"|"infected"|"skipped_dev",
  uploadedById, createdAt
}
```
`src/lib/attachments/scan.ts` does size/MIME allowlisting + an EICAR-string sniff test; anything else is marked `skipped_dev` unless `ATTACHMENT_SCAN_MODE=strict` (which then hard-fails with "Real scanner not configured"). No ClamAV or cloud scanning is wired up. `src/lib/attachments/memory-adapter.ts` stores metadata only — file bytes are not durably persisted.

### Brand Kit (`src/types/entities.ts`) — Comms side, v2
```typescript
interface BrandKit {
  version: "1.1" | "2.0", unionId?, unionName?, divisionName?,
  local: Local, profiles?: BrandKitProfile[], activeProfileId?,
  primaryColor, secondaryColor, accentColor,
  useOfficialLogo, officialLogoVariant?, customLogoDataUrl?, logoText?,
  websiteUrl?, facebookUrl?, customLinks?: LocalLink[], membershipUrls?: MembershipUrl[],
  updatedAt
}
```
v1.1 → v2 migration happens **in-memory only** on read (`normalizeBrandKit` in `src/lib/utils/local-links.ts`) — the localStorage payload itself is not rewritten until the next explicit save, so a stored kit can stay tagged `"1.1"` indefinitely even though the app treats it as v2 everywhere.

## 6. Persistence — the single most important architectural fact

Every one of these is a **module-scoped in-memory array/object**, seeded once at process start, with **no disk/DB writes**:
- `src/lib/grievance/memory-adapter.ts`
- `src/lib/bumping/memory-adapter.ts`
- `src/lib/time/memory-adapter.ts`
- `src/lib/attachments/memory-adapter.ts`
- `src/lib/audit/memory-adapter.ts`
- `src/lib/snippets/memory-adapter.ts`
- `src/lib/marketplace/memory-adapter.ts`

`docker/docker-compose.yml` has exactly one service (`web`); `docker/entrypoint.sh` states outright that there are no migrations because everything is in-memory. **Restarting the Node process (deploy, crash, container recycle) discards all grievance/bumping/time/attachment/audit data.** The only durable-ish artifacts are: (a) Brand Kit / preferences in the *browser's* `localStorage` (`src/lib/data/local-storage-adapter.ts`), and (b) the optional Hybrid encrypted export file the user manually downloads (`src/lib/hybrid/*` — real Web Crypto PBKDF2+AES-GCM, but it's a manual backup/restore feature, not a live data path — see `docs/PROGRESS.md` Phase 4 and the `AGENTS.md` "Do Not: Treat hybrid local mode as live offline store" rule).

## 7. RBAC — where enforcement actually lives

Pure, testable, server-callable functions (not just UI helpers):
- `src/lib/grievance/access.ts` — `canAccessGrievanceModule`, `isElevatedGrievanceRole`, `canCrossLocalGrievance`, `canViewGrievance`, `canEditGrievance` (solo accounts see only their own; stewards see only assigned; `local_exec` can view but never edit)
- `src/lib/qol/access.ts` — `canManageQolContent`, `canPublishMarketplace`, `isStewardRole`, `canInitiateHandoff`, `canDeleteSharedContent`
- `src/lib/bumping/access.ts`, `src/lib/time/access.ts` — analogous per-module gates
- Session gates: `src/lib/auth/{grievance,bumping,time}-session.ts` — wrap `auth()` + MFA + module-enabled + role check into one `require*Session()` call used at the top of nearly every API route in that module

**Known gaps** (see backlog): `canDeleteSharedContent` (owner-or-elevated) exists but the snippet `DELETE` route doesn't call it — any `canManageQolContent` user can delete any union's snippet; the marketplace `DELETE` route has its own inline check that omits `division_admin`. PATCH routes on grievances/bumping spread the raw request body onto the stored record with no field allowlist (mass-assignment risk on tenant-identity fields).

## 8. Module registry (`src/lib/modules/registry.ts`)

`MODULE_REGISTRY` is the single source of truth for which Hub modules render and under what conditions: `id`, `nameKey`/`descriptionKey` (i18n), `href`, `requiredRoles`, `requiresMfa`, `enabledCheck(enabledModules)`. Four modules today: `comms` (always on), `grievance`, `bumping`, `time` — each requires MFA except `comms`. `getVisibleModules()` / `canAccessModule()` are the filter functions the Hub dashboard and (should be, and mostly are) API routes use.

## 9. Comms canvas tool pattern

Every canvas tool (`board-notice`, `board-banner`, `flyer-maker`, `graphic-maker`, `logo-builder`, `meeting-background`, `qr-board`, `qr-card`, `quote-card`, `resizer`, `solidarity-poster`, `website-template`, `document-generator`) follows the same shape:
1. Zustand `brand-store.ts` for global Brand Kit state + local component state (often a custom `useUndoRedo` hook) for the tool's own fields.
2. A presentational "canvas" that is actually **styled `<div>`s**, not an HTML `<canvas>` element or SVG — this is why screen-reader text content is present in the DOM (a real accessibility positive) but there's no `role="img"`/accessible-name summary of the composed graphic.
3. Export via `src/lib/export/image-export.ts` (`toBlob`/`toPng` via `html-to-image`) or `src/lib/export/pdf-export.ts` (`jsPDF`, one data-URL image per page) or `src/lib/export/office-export.ts` (dynamic-imported docx/xlsx/pptx builders).
4. Most tools migrated to the shared `src/components/tools/ToolEditorLayout.tsx` (sticky desktop 2-col preview + mobile Edit/Preview tabs) — confirmed real and confirmed adopted by the tools listed above; `document-generator` and `alt-text` intentionally use a different layout (`PageShell`).
5. Ink/contrast: `src/lib/utils/ink.ts` (`pickContrastingInk`, `coloursClash`) is the real, consistently-used contrast helper for what actually gets drawn into exports. `src/components/tools/ContrastChecker.tsx` is a separate, **advisory-only** UI widget shown next to some tools (flyer-maker, graphic-maker) that in at least those two call sites hardcodes a `#FFFFFF` comparison instead of the tool's actual computed ink color — it can show a misleading pass/fail relative to what will actually render/export.

## 10. Known doc-vs-code drift (fix or reconcile when touching these areas)

- `docs/ARCHITECTURE.md` "Middleware protects `/app/*`" → actually `src/proxy.ts` (no `middleware.ts` exists).
- `docs/modules/GRIEVANCE.md` describes a `GrievanceDocument` type and "never shown to member portal" — no `GrievanceDocument` type exists (use `AttachmentMeta`); there is no member portal at all (confirmed: no `src/lib/portal`, no `/api/portal`, no portal UI anywhere in `git ls-files`).
- `docs/guides/SETUP.md` still says "MFA in development accepts any 6-digit code" — the code (`src/app/api/mfa/verify/route.ts`) now only accepts the exact configured/default code, not arbitrary ones.
- Two env-example files exist side by side with different placeholder philosophies: `.env.example` (blank `AUTH_SECRET=`) and `env.example` (pre-filled `dev-secret-change-in-production`) — confusing for a self-hosting operator following `docs/guides/SETUP.md`, which only references `.env.example`.
- `docs/ARCHITECTURE.md`'s DataAdapter table lists `LocalHybridSliceAdapter` and `ApiAdapter` as if present in `src/lib/data/` — the hybrid slice logic actually lives in `src/lib/hybrid/local-slice-adapter.ts`, and `ApiAdapter` does not exist yet anywhere (correctly still listed as "planned" in `docs/ROADMAP.md`).

## 11. A note on tool reliability during this audit

The `Glob` tool in this environment returned several **phantom file paths that do not exist** on disk or in `git ls-files` (e.g. `docs/modules/LOCAL_PORTAL.md`, `.cursor/rules/local-portal.mdc`, `.cursor/plans/local_portal_future.plan.md`). One parallel research sub-agent also hallucinated a "Portal/Circles" feature (`CircleWorkspace.tsx`, `PortalStation.tsx`, `e2e/portal.smoke.spec.ts`, etc.) that does not exist. Every claim in these four audit documents was cross-verified against `git ls-files` output before being recorded. **Future agents: always confirm a file's existence with `git ls-files` or `Test-Path` before citing it or acting on it — do not trust a single search-tool result.**
