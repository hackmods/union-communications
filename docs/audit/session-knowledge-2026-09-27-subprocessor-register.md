# Session knowledge — 2026-09-27 — subprocessor register

**Scope:** Packet 8 structured provider inventory and public-safe projection  
**Status:** Implemented in source; migration/deployed database and real provider evidence remain pending

## Design

- Migration `0069_subprocessor_registry.sql` adds an internal provider table, a
  separate minimal public projection, and an append-only audit event table.
  There are no seeded providers because this checkout does not contain the
  actual production provider inventory.
- Internal records include service and purpose, data categories and subjects,
  processing region, transfer status, effective period, DPA review state,
  review owner, internal notes, and a non-secret verification-evidence
  reference. Purpose, categories, subjects, and approved public notes are
  stored as EN/FR values; the public page selects the visitor's locale. Service
  names and provider-supplied region names remain shared values. Do not put
  credentials or member information in notes.
- The site-admin API requires `requireSiteAdminSession()`, a durable PostgreSQL
  connection, and an MFA-backed platform-admin RLS context. The database
  policies use the existing `customization_root(NULL, true)` gate, which checks
  the active platform-admin account and the MFA session GUC.
- Every create, edit, review, publish, withdraw, and register-view action adds
  an audit event in the same RLS transaction. The runtime role cannot update or
  delete event rows; a database trigger also rejects those operations.
- A provider edit resets review status and removes any public projection.
  Publication requires a platform admin distinct from the creator and latest
  editor, explicit disclosure approval, an approved review, and a currently
  active effective period. A database trigger locks and checks the internal row and requires the
  public projection to match its reviewed fields, including under concurrent
  edits. The public table contains no internal notes, evidence reference,
  reviewer, or DPA state.
- Date inputs are inclusive calendar dates. `effective_to` is stored as the
  exclusive next UTC midnight so the last selected day remains visible.
- Public page: `/{locale}/trust/subprocessors`, linked from Security and listed
  in the sitemap with EN/FR alternates. Site-admin page:
  `/app/site-admin/subprocessors`. The public list remains empty until an
  operator enters and separately approves verified production information.

## Verification and remaining evidence

- Added unit coverage for the second-reviewer rule, effective window, explicit
  disclosure approval, public-field allow-list, inclusive date conversion, and
  record validation. Added RLS contract assertions for MFA-only internal
  access, active public read, publication checks, row locking, minimal public
  fields, and append-only audit privileges.
- Added EN/FR public and operator copy and `/updates`; added both localized
  public routes to axe smoke and sitemap metadata.
- The provider form requires both English and French versions of descriptive
  public facts. Database shape checks require the locale-keyed JSON objects;
  request validation also bounds each description and each locale's lists.
- Node migration manifest check passes with 66 entries. Static TypeScript
  syntax checks, locale JSON parity (10,888 matching keys), required-shape/
  migration assertions, npm-audit policy checks (4 cases), and `git diff --check`
  pass after the bilingual-field update. Full Vitest,
  TypeScript, ESLint, Drizzle shape generation, and live Postgres RLS smoke are
  pending because dependencies and a database are not available in this
  checkout.
- The required DB shape was updated alongside the schema and migration, but
  the official Drizzle generator has not validated it. Keep that as a deploy
  gate before a production image is built.
- No provider or region is represented as a UnionOps fact. Production provider
  verification, DPA/vendor assessment, alert delivery, backup restore, data
  location, and counsel review remain operator work. This UI attestation does
  not constitute legal approval.
- The merged Managed Documents implementation is still absent locally. The
  register is structured operational data; do not extend it into a competing
  policy/document store.

## Lesson

Keep the source inventory, reviewer decision, and public disclosure in
separate records. RLS protects internal fields, while constraints and the
projection trigger prevent an approved-looking API action from publishing
invented or stale values. A manual provider inventory is still required before
the public list can support a factual subprocessor claim.
