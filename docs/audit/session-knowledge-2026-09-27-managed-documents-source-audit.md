# Managed Documents audit and acceptance implementation — 2026-09-27

## Source and implementation state

- A read-only fetch confirmed `origin/main` at `7e3d42ea`, the merge containing
  Managed Documents. A clean managed worktree from that commit is the basis for
  the acceptance work recorded here.
- The earlier dirty worktree at `2c6f4225` retains uncommitted enterprise
  migrations `0064`–`0070`; it has not been altered or combined with this main
  worktree. In this worktree, the journal ends at `0066`, so this change appends
  migration `0067_document_acceptance_evidence` under ADR-020.

## Verified foundation

- The feature branch has a public global document library and a separate
  private union/local Hub vault. The public library has bilingual metadata,
  immutable numbered payload rows, draft/scheduled/published/archived states,
  rights and provenance fields, file signatures, malware scanning, hashed
  uploaded bytes, and production shared-storage readiness checks.
- The private vault checks current local membership, officer assignment, and
  restricted grants. Its version rows preserve prior content; archive and
  retention are distinct from public publication. Database policies prevent a
  union/platform rank alone from reading restricted private contents.
- The import seeds Privacy, Security, and Accessibility as required policy
  baselines and creates an admin-only Terms draft with no legal text. Public
  content renders as text, not injected HTML. The public file routes are
  separate from private Hub file APIs.
- Source-level test files cover the public-document registry, private document
  adapters/API, file validation, and RLS contracts. The focused public-document,
  attachment-validation, journal, RLS-contract, SEO, and bilingual-copy run
  passes (83 tests), as do full TypeScript and changed-file lint. PostgreSQL
  runtime/RLS smoke remains pending.

## Proven gaps and repair status

1. **Agreement scope repair is implemented.** A policy payload had one boolean
   `requiresAcceptance`, not a required subject/scope. The acceptance page
   offers individual, union, or local acceptance for every pending document.
   The gate considers a version accepted if *any* matching subject type is in
   the acceptance table. Payloads now have `individual` or `organization`
   scope; legacy payloads default to individual. The gate matches individual
   evidence only to the current user and organization evidence only to the
   current union/local. Publisher APIs require an explicit scope when enabled.
2. **DPA and legal baseline are incomplete.** The seed creates a Terms draft
   without text but no DPA, Privacy Officer contact, retention/deletion policy,
   or vulnerability disclosure policy. No draft is effective, which is
   correct; approval and content still need qualified review.
3. **Authority attestation repair is implemented.** Organization acceptance
   now requires an unchecked UI attestation, server confirmation, fixed
   attestation version and timestamp, and matching RLS insert checks. Current
   union-admin or local officer authorization remains independently required.
4. **Append-only/correlation repair is implemented in source.** Migration
   `0067` marks historical rows `legacy` without inventing attestation, adds
   request/source/authority fields, drops the platform-admin update policy,
   revokes runtime update/delete, and installs a mutation-rejecting trigger.
   New rows receive a server-generated correlation ID and audit metadata;
   unique-key retries do not emit duplicate acceptance audit events. Runtime
   role/RLS execution and shape generation remain unverified.
5. **Document publication lacks action-bound step-up.** Public document admin
   checks platform role, session MFA, enabled TOTP, Postgres, and production
   object storage. Create, version, publish, archive, restore, and recovery
   routes do not require a fresh challenge for the specific action. Several
   audit writes happen after state/object writes and are not request-correlated.
6. **Stable policy routes remain split.** The feature branch adds
   `/documents/{privacy,security,accessibility}` backed by managed content,
   but `/privacy`, `/security`, and `/accessibility` still render localized
   message pages. Existing inbound stable routes therefore are not guaranteed
   to show the current published version.
7. **Retention default needs approval.** Migration `0064` backfills private
   document `retention_until` to `created_at + 7 years`. This is not an
   approved per-class/customer schedule and must not become a universal legal
   promise. The cron purge itself rechecks archive date, expiry, and legal
   hold in SQL, and offers a dry run.

## Next sequence and remaining verification

1. Run a restricted-role PostgreSQL smoke for `0067`; Docker is unavailable in
   this environment, so the migration has not executed against PostgreSQL here.
2. Port the private file-step-up work from the preserved old worktree only
   after reviewing how its migration IDs fit the fetched main history.
3. Add action-bound publication step-up and correlated audit to create, version,
   publish, archive, restore, and recovery operations.
4. Route stable policy URLs to approved managed versions; keep baseline legacy
   copy visibly transitional until a reviewed publication replaces it.
5. Replace the seven-year private-vault backfill with an approved, explicit
   schedule or an unset state that blocks purge until the customer schedule is
   recorded.

This is a source audit and implementation note, not production evidence or a
claim that Packet 1 is complete. Merged code still needs runtime tests, a
generated boot-shape contract, restricted-role Postgres/RLS review,
scanner/object-storage verification, and human legal approval.
