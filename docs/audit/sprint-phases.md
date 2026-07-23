# UnionOps — Sprint Phase Sequencing

Sequences all 36 tickets from `docs/audit/execution-backlog.md` into four strict, chronological phases. Do not start a ticket in a later phase before its listed blockers are closed — the dependency chain below is real (mostly: later phases build persistent tables / UI on top of earlier phases' auth and schema decisions), not just a suggested order.

Legend: **Blocked by** = must be *closed* first. **Blocks** = downstream tickets that cannot land correctly until this one is done. Tickets with no cross-phase blockers can be picked up by any available sub-agent in parallel within their phase.

---

## Phase 1 — Security & Auth Hardening

**Goal:** close the session/MFA trust boundary and route-protection gaps *before* anything else touches auth, so Phase 2's real user accounts (`SEC-007`) and Phase 3's new modules inherit a correct auth model instead of building on the current bypassable one.

**Do not require Postgres.** Every ticket in this phase works against the existing in-memory `demo-users.ts` roster — that's intentional, so this phase can start immediately.

| Ticket | Severity | Files touched | Blocked by | Blocks |
|---|---|---|---|---|
| `SEC-001` — MFA flag settable via client `session.update()` | Critical | `src/auth.config.ts`, `src/app/api/mfa/verify/route.ts`, `src/app/[locale]/app/mfa/page.tsx`, new `src/lib/auth/mfa-grants.ts` | — | `SEC-002`, `SEC-005`, `RBAC-002` |
| `SEC-005` — Client can forge `localId`/`bargainingUnitId` | High | `src/auth.config.ts` (same `jwt()` callback as `SEC-001`) | `SEC-001` (same file/PR — land together per `core-domain-schema.md` §3) | `RBAC-002` |
| `SEC-002` — Shared static MFA code (`000000` default) | Critical | `src/app/api/mfa/verify/route.ts`, `.env.example`, `docs/guides/SETUP.md`; new per-user `totpSecret` field (interim: add to `DemoUser` in `src/lib/auth/demo-users.ts`; final home: `users.totpSecret` in Phase 2's schema) | `SEC-001` (needs the nonce-grant plumbing in place first) | `SEC-007` |
| `SEC-004` — `AUTH_SECRET` hardcoded fallback | Critical | `src/auth.ts`, `src/auth.config.ts`, `docker/docker-compose.yml` | — | — |
| `RBAC-002` — No enforced choke point for `/app/*` pages; `/app/audit`, `/app` client-gated only | Medium | `src/proxy.ts` (doc-only — no code change to the proxy itself), `src/app/[locale]/app/audit/page.tsx`, `src/app/[locale]/app/page.tsx`, `docs/ARCHITECTURE.md` | `SEC-001`/`SEC-005` (converting these pages to Server Components means they read the now-hardened session shape) | — |
| `SEC-008` — CSP is Vercel-only; missing on self-host | Medium | `next.config.ts`, `vercel.json` | — | — |
| `SEC-010` — Duplicate `.env.example` / `env.example` with unsafe placeholder | Low | `.env.example`, `env.example` | — | — |

**Phase 1 exit criteria:** a fresh authenticated demo session cannot set `mfaVerified: true` or change `localId`/`bargainingUnitId` via `session.update()` without a valid server-issued grant/authorization; `AUTH_SECRET` fails closed if unset in production; CSP headers apply identically on Vercel and self-host. Run the six regression tests listed in `core-domain-schema.md` §3.2 Step 6 before closing this phase.

---

## Phase 2 — Persistence & Data Layer

**Goal:** replace every in-memory adapter with a real, RLS-enforced Postgres-backed store, validated end-to-end with Zod. This is the single biggest phase and the hard dependency for most of Phase 3.

**Hard blocker for this entire phase:** none from Phase 1 at the schema level, but `SEC-007` (real accounts) should land *after* `SEC-002`'s TOTP field exists so the new `users` table is designed once, not twice.

| Ticket | Severity | Files touched | Blocked by | Blocks |
|---|---|---|---|---|
| `SEC-003` — No persistence layer at all (memory-only, data lost on restart) | Critical | New `src/lib/db/**` (per `core-domain-schema.md` §2), `docker/docker-compose.yml` (add Postgres service + volume), `docker/entrypoint.sh` (run migrations) | — | `SEC-007`, `FEAT-001`, `FEAT-002`, `FEAT-003`, `FEAT-004`, `FEAT-005`, `RBAC-001` (durable ownership checks are moot without durable rows) |
| `SEC-006` — Grievance/bumping PATCH mass-assignment (no schema validation) | High | New `src/lib/validation/{grievance,bumping,time,attachments}.ts` (per `core-domain-schema.md` §1), every mutating route under `src/app/api/{grievances,bumping,time}/**` | — (Zod schemas are independent of the DB migration and can land against the *current* memory adapters first, then carry forward unchanged once `SEC-003` swaps the storage engine) | `FEAT-004`, `FEAT-005` (new fields need schema validation from day one) |
| `SEC-007` — Demo-only plaintext auth; no real signup/invite flow | High | New `users` table (from `SEC-003`'s schema), `src/lib/auth/demo-users.ts` → real user store, `src/auth.ts`, invite-flow API routes | `SEC-003`, `SEC-002` (TOTP field must exist on `users` before this ships, not bolted on after) | — |
| `RBAC-001` — Snippet/marketplace `DELETE` ignores ownership | High | `src/app/api/snippets/[id]/route.ts`, `src/app/api/marketplace/[id]/route.ts`, `src/lib/qol/access.ts` | — (pure logic fix, works against memory adapters today; re-verify after `SEC-003` swap) | — |
| `RBAC-003` — No cross-module RBAC-matrix test | Low | New `src/lib/rbac-matrix.test.ts` | — | — |
| `SEC-009` — Hybrid slice plaintext-in-transit undocumented | Low | `src/app/api/hybrid/slice/route.ts` (comment/header only), `docs/COMPLIANCE.md`, `/app/hybrid` UI copy | — | — |

**Phase 2 exit criteria:** `docker/docker-compose.yml` includes a Postgres service; every `*Adapter` interface has a Drizzle-backed implementation passing the existing module test suites (`grievance.test.ts`, `bumping.test.ts`, `time.test.ts`) unchanged; every mutating API route validates its body against a Zod schema before touching the adapter; a container restart no longer discards case data (write a smoke test that creates a grievance, restarts the `web` container, and asserts the grievance is still there).

---

## Phase 3 — Core Union Parity Features

**Goal:** ship the domain features that make this a real union tool and close the Basecamp-parity gap — grievance outcome tracking, a real bumping seniority aid, and the greenfield collaboration primitives (message boards, to-dos, docs vault).

**Hard blocker for this entire phase:** `SEC-003` (Postgres) must be closed — every ticket here adds new persistent tables per `core-domain-schema.md` §2.3/§2.4, and `FEAT-001`'s object storage needs a durable `attachment_meta` row to point at.

| Ticket | Severity | Files touched | Blocked by | Blocks |
|---|---|---|---|---|
| `FEAT-004` — Grievance arbitration outcome / settlement entity | Medium | New `grievance_outcomes` table (`core-domain-schema.md` §2.3), `src/types/grievance.ts`, grievance detail UI, `src/lib/grievance/export.ts` | `SEC-003`, `SEC-006` (schema validation for the new fields from day one) | — |
| `FEAT-005` — Bumping seniority roster + eligibility calculator | Medium | New `member_seniority_records` table, `src/types/bumping.ts`, `src/lib/bumping/diff.ts` sibling module (new `seniority.ts`), bumping case UI | `SEC-003`, `SEC-006` | — |
| `FEAT-001` — No document/file vault; attachments are metadata-only stub | High | New object-storage integration behind `AttachmentMeta.storageKey`, real ClamAV wiring in `src/lib/attachments/scan.ts`, new general-purpose "Documents" area (new Hub route) | `SEC-003` (attachment metadata needs a durable table, not the current `memory://` stub) | — |
| `FEAT-002` — No message board / threaded discussion | High | New `DiscussionThread`/`DiscussionPost` entities + tables, new `"discussions"` `HubModule` in `src/lib/modules/registry.ts`, new API routes, new RBAC gate | `SEC-003`, `SEC-006` (new schemas from day one, not retrofitted) | — |
| `FEAT-003` — No general to-do/task list | Medium | New `Task` entity + table, `src/lib/handoff/package.ts` (optional cross-link), new `/app/tasks` route | `SEC-003`, `SEC-006` | — |
| `FEAT-006` — No shared org calendar view (read-only aggregation) | Low | New `/app/calendar` view aggregating existing `ScheduledMeeting` + `CommitteeSession` (+ `Task`/`DiscussionThread` due dates once those ship) | `FEAT-003`, `FEAT-002` (for full aggregation — a partial version covering only grievance/bumping meetings can ship earlier, independent of Postgres, if prioritized ahead of schedule) | — |

**Phase 3 exit criteria:** a grievance can be closed with a structured outcome record; a bumping case shows a suggested (not binding) eligibility ranking from the seniority roster; officers can upload a real file to a grievance and download it back after a restart; a local can start a discussion thread and see replies; a task can be assigned and marked done. Every new feature ships with EN/FR copy (see Phase 4 discipline below) and RBAC gates matching `docs/RBAC.md`.

---

## Phase 4 — Comms Tools, UI/UX & i18n Polish

**Goal:** close the remaining UX/accessibility/comms-tool gaps identified in the audit. This phase has the fewest cross-ticket dependencies and the most tickets safe to parallelize across multiple sub-agents — most are self-contained file-level fixes.

**No hard blocker from Phases 1–3** for the majority of these tickets (they touch public Comms tools and shared UI primitives, not the Hub auth/data layer) — however, `UX-001`/`UI-003` benefit from being done *after* Phase 3's new routes (`/app/tasks`, `/app/calendar`, discussions) exist, so the new error/loading/axe coverage can include them rather than needing a second pass.

| Ticket | Severity | Files touched | Blocked by | Blocks |
|---|---|---|---|---|
| `TOOL-001` — LocalStorage not wrapped for quota/private-mode | High | `src/lib/data/local-storage-adapter.ts`, `src/store/brand-store.ts` | — | — |
| `TOOL-002` — Silent export failures on most canvas tools | High | New `useExportHandler()` hook, `solidarity-poster/page.tsx`, `flyer-maker/page.tsx`, `board-banner/page.tsx`, + others listed in the ticket | — | — |
| `UX-001` — No `error.tsx`/`loading.tsx`/`not-found.tsx` anywhere | High | `src/app/[locale]/app/error.tsx` (new), `loading.tsx` (new), `src/app/[locale]/error.tsx` (new), `not-found.tsx` (new) | — (can reference Phase 3's new routes once they exist, but doesn't need to wait) | `UI-003` (axe coverage of new error/loading states) |
| `UI-001` — Thin `src/components/ui/` kit driving raw `<input>`/`<button>` sprawl | Medium | New `Select.tsx`, `Checkbox.tsx`, `Radio.tsx`, `Dialog.tsx`, `Badge.tsx`; migrate `TimeDashboard.tsx`, `document-generator/page.tsx` | — | `UX-002` (EmptyState/Skeleton follow the same primitive-library pattern) |
| `UX-002` — Ad-hoc loading/empty states across Hub | Medium | New `Skeleton.tsx`, `EmptyState.tsx` in `src/components/ui/`; `GrievanceDashboard.tsx`, `BumpingDashboard.tsx`, `TimeDashboard.tsx`, `app/audit/page.tsx` | `UI-001` (shares the new primitive-library conventions) | — |
| `UX-003` — `ContrastChecker` hardcodes `#FFFFFF` on Flyer/Graphic Maker | Medium | `flyer-maker/page.tsx`, `graphic-maker/page.tsx`, `ContrastChecker.tsx` | — | — |
| `UX-004` — Brand Kit contrast is advisory-only, not enforced | Medium | `src/lib/utils/ink.ts`, `src/store/brand-store.ts`, Brand Kit save flow | `UX-003` (fix the checker's own correctness first) | — |
| `UX-005` — Sitemap may omit bare `/guide` index | Low | `src/app/sitemap.ts` | — | — |
| `UI-002` — Hub dashboards lack mobile-first responsive layouts | Medium | `GrievanceDashboard.tsx`, `BumpingDashboard.tsx`, `src/app/[locale]/app/layout.tsx` | — | — |
| `UI-003` — Axe coverage missing on authenticated Hub + most tools | Medium | `e2e/smoke.spec.ts`, `e2e/builders.smoke.spec.ts` | `UX-001` (scan the new error/loading states, not just happy path) | — |
| `UI-004` — No `next/font`; confirm intentional | Low | `docs/DECISIONS.md` (new ADR) or `src/app/globals.css`/`layout.tsx` if a change is chosen | — | — |
| `UI-005` — Canvas previews lack `role`/accessible-name summary for screen readers | Low | `ToolEditorLayout.tsx`, `BoardTrimCanvas.tsx`, `solidarity-poster/page.tsx` | — | — |
| `TOOL-003` — PWA offline shell is EN-only | Medium | `public/sw.js`, `src/lib/pwa/shell.ts`, `src/app/manifest.ts` | — | — |
| `TOOL-004` — `html-to-image`/`jsPDF` statically imported | Medium | `src/lib/export/image-export.ts`, `src/lib/export/pdf-export.ts` | — | — |
| `TOOL-005` — No unit tests for canvas tools or `pdf-export` | Medium | New `pdf-export.test.ts`, component tests for `ToolEditorLayout.tsx`/`BoardTrimCanvas.tsx` | `TOOL-004` (test the post-dynamic-import behavior, not the code about to change) | — |
| `TOOL-006` — Brand Kit v1.1→v2.0 migration doesn't write back to storage | Low | `src/lib/data/local-storage-adapter.ts`, `src/lib/utils/local-links.ts` | `TOOL-001` (same adapter file — land together) | — |
| `TOOL-007` — Legacy `opseu-*` localStorage key names | Low | `src/lib/data/adapter.ts` | `TOOL-001`/`TOOL-006` (same adapter file — land together as one PR) | — |

**Doc reconciliation (not separately ticketed, fold into whichever PR touches the file):**
- `docs/ARCHITECTURE.md` "Middleware protects `/app/*`" → update to describe `src/proxy.ts` once `RBAC-002` lands (Phase 1).
- `docs/guides/SETUP.md` stale "MFA accepts any 6-digit code" line → update once `SEC-002` lands (Phase 1).
- `docs/modules/GRIEVANCE.md`'s `GrievanceDocument`/member-portal language → reconcile once `FEAT-001`/`FEAT-004` land (Phase 3) to describe `AttachmentMeta` and the new outcome entity by their real names.
- `docs/ARCHITECTURE.md`'s DataAdapter table (`ApiAdapter`, `LocalHybridSliceAdapter`) → correct once `SEC-003`'s adapter swap (Phase 2) makes `ApiAdapter` real.

**Phase 4 exit criteria:** `npm run test:smoke` axe coverage includes at least one page per Hub module and every canvas tool; every canvas tool's export path has a user-visible error state; `src/components/ui/` covers the primitive set needed to remove raw `<input>`/`<button>` sprawl from `TimeDashboard.tsx`; PWA offline works correctly in French; all four doc-drift items above are closed.

---

## Cross-phase parallelization guidance for sub-agent scheduling

- **Phase 1 and the Zod-schema half of Phase 2 (`SEC-006`) can run in parallel** — `SEC-006`'s schemas don't touch auth and can be authored/tested against the current memory adapters immediately.
- **Phase 4 can start immediately, in parallel with Phase 1–3**, for any ticket not marked as blocked in its table above — it touches almost entirely different files (public Comms tools, shared UI kit) than the Hub/auth/DB work in Phases 1–3. This is the best phase to hand to a lower-cost model (see `sub-agent-prompts.md`'s Frontend prompt) while a stronger model works Phases 1–3.
- **Do not parallelize within Phase 2's `SEC-003` migration itself** — one sub-agent should own the full Drizzle schema + adapter swap end-to-end per module (grievance, then bumping, then time, then attachments) to avoid merge conflicts across the shared `src/lib/db/schema/*` files.
