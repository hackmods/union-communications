# Managed Documents source branch audit — 2026-09-27

## Source and integration state

- Current checkout and locally resolved `origin/main` are both `2c6f4225`.
- The local ref `origin/feat/managed-document-library` points to
  `118f432d401f0eb156edd6b9e059c27fc79ac35c` (merge of main into the feature
  branch); it contains the Managed Documents implementation and is a descendant
  of current `origin/main`.
- `git ls-remote origin refs/heads/main` failed because the configured network
  proxy refused the connection. The source branch is available for read-only
  inspection, but it is not in this working tree or the locally resolved main.
- The feature source adds migrations `0064`–`0066`. This working tree already
  has uncommitted enterprise migrations numbered `0064`–`0070` for recovery
  codes, subprocessors, incidents, MFA replay/grants/limits, and audit fields.
  Those histories cannot be combined by copying files; reconcile the sequence,
  journal, schema shape contract, tests, and ADR-020 deployment gate after the
  correct merge base is available.

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
- Source-level test files exist for public-document registry, private document
  adapters/API, file validation, and RLS contracts. They have not been executed
  from this checkout; dependencies are absent.

## Proven gaps to repair after integration

1. **Agreement scope is ambiguous.** A policy payload has one boolean
   `requiresAcceptance`, not a required subject/scope. The acceptance page
   offers individual, union, or local acceptance for every pending document.
   The gate considers a version accepted if *any* matching subject type is in
   the acceptance table. This cannot enforce Terms for an individual and a
   DPA for a contracting union/local as separate obligations.
2. **DPA and legal baseline are incomplete.** The seed creates a Terms draft
   without text but no DPA, Privacy Officer contact, retention/deletion policy,
   or vulnerability disclosure policy. No draft is effective, which is
   correct; approval and content still need qualified review.
3. **No authority attestation.** The API verifies current `union_admin` or
   local president/vice-president authority for an organization acceptance,
   but the UI/API do not capture an explicit representation that the person
   is accepting on that party's behalf.
4. **Acceptance evidence is not fully append-only or correlated.** The ledger
   records version, subject, actor, and time, but the migration permits a
   platform-admin update policy and adds no immutable trigger. It has a
   unique key per version/subject, so retries do not create additional events.
   The API logs after insert without a server request ID or flow/source field.
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

## Next integration sequence

1. Obtain the authoritative merged `main` ref; do not merge or cherry-pick
   using the stale local refs as proof of the user's reported merge.
2. Reconcile the managed-document migration chain with the current
   uncommitted `0064`–`0070` work under ADR-020, then regenerate the official
   DB shape and RLS contract through the supported maintainer command.
3. Port the existing private file-step-up work onto the merged document API;
   the current branch routes overlap and the feature version will otherwise
   replace that hardening.
4. Fix acceptance scope and authority evidence, make acceptance immutable at
   the database boundary, and add action-bound publication step-up/audit.
5. Route stable policy URLs to approved managed versions; keep baseline legacy
   copy visibly transitional until a reviewed publication replaces it.
6. Replace the seven-year private-vault backfill with an approved, explicit
   schedule or an unset state that blocks purge until the customer schedule is
   recorded.

This is a source-branch audit, not production evidence or a claim that Packet 1
is complete. The merged source still needs runtime tests, a restricted-role
Postgres/RLS review, scanner/object-storage verification, and human legal
approval.
