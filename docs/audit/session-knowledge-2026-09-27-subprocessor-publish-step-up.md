# Subprocessor publication step-up — 2026-09-27

## Purpose and scope

The Packet 8 provider register can disclose hosting, email, monitoring, storage,
and other production processing relationships on `/trust/subprocessors`. This
slice protects the publish and withdraw action. It does not establish which
vendors are in production, approve DPA terms, or complete Packet 8 operations.

## Control flow

`POST /api/site-admin/subprocessors/[id]/publish` accepts only a strict JSON
object containing `published` and an optional same-request `mfaCode`. The
existing `authorizeSubprocessorAdmin()` gate first requires a platform Site
Admin session backed by MFA and durable PostgreSQL for the registry. Hosted
customer mode then also requires `AUDIT_DB_BACKEND=postgres` before allowing
the operation. The shared fresh-MFA verifier runs before provider/projection
queries. In hosted customer mode that verifier is backed by the production
TOTP policy; outside hosted mode it follows the configured development/host
policy.

After a successful challenge, a correlated `site_admin.subprocessor.publish`
intent event must append before the RLS transaction begins. The transaction
locks the provider, rechecks current publication eligibility, locks the
existing public projection, then inserts or removes the projection and appends
the subprocessor register event atomically. Its before/after values contain
only the public projection fields. The projection itself is an allow-list and
does not copy internal review notes or evidence references. The transaction
continues to rely on migration `0065` policies and the publication-validation
trigger.

A second correlated audit event records the result. If this append fails after
the transaction has committed, the API returns a specific uncertain-result
response rather than reporting success. A transaction error is treated
conservatively as uncertain because commit state may not be observable. The
Site Admin panel preserves the selected provider and desired publish/withdraw
state while collecting the fresh code, clears challenge codes after responses,
and disables other write actions during the pending action. If the result is
uncertain, the network fails, or the API confirms success but the register
refresh fails, the panel blocks another attempt until the operator reloads the
register and inspects current publication state.

All API responses are private/no-store and return a server-generated request
ID. Audit metadata is limited to phase, outcome reason, and the desired
published boolean; the challenge code and provider contents are never added to
the general security audit log. Invalid request fields are rejected before a
challenge or provider lookup. A request to publish an unapproved, expired, or
self-reviewed record returns a conflict and does not alter the projection.
Withdrawal remains possible after a provider is no longer publishable, so an
expired vendor can be removed from public disclosure.

## Review notes and operational boundaries

- The current checkout has no provider seed data. The public list remains
  empty until production configuration is inspected and a record is approved.
- Publication/withdrawal uses a second-person approval already required by the
  registry. Fresh MFA is an additional action confirmation; it does not
  replace vendor, privacy, DPA, or legal review.
- In hosted mode a memory-backed general audit adapter blocks publication.
  This route-level check complements host readiness; source configuration
  still does not prove the deployed environment or database role.
- The registry event and projection are atomic in Postgres. The general audit
  intent/result rows are separate appends, so this design does not provide a
  cross-store transaction. The intent event establishes the request ID before
  the write; a missing result event is reported as uncertain and must be
  resolved by reload and audit review.
- Confirm the runtime DB role can append but cannot rewrite or delete
  `subprocessor_audit_events`; verify the RLS policy and trigger against the
  generated schema on the target host.
- Public route output, French wording, actual data region, vendor list,
  subprocessor DPA schedule, and customer-facing statements still need human
  review. No legal or launch approval is implied.

## Tests added

`src/app/api/site-admin/subprocessors/[id]/publish/route.test.ts` covers:

1. Missing fresh MFA is denied before provider/projection query or RLS work.
2. Invalid MFA is denied before database access and the code is absent from
   audit metadata.
3. Strict input rejects unknown fields before MFA or database access.
4. Hosted customer mode rejects a memory audit backend before provider lookup.
5. Failed intent audit prevents any RLS transaction or database access.
6. Approved publication writes only the allow-listed public projection and
   confirms the correlated result without logging the challenge.
7. Withdrawal removes the projection and records a public-safe before image.
8. A self-reviewed record cannot be published.
9. A transaction error is reported as an unconfirmed outcome.
10. Failed post-transaction result audit withholds success and marks the
   publication result as uncertain.

Tests are authored but have not been executed because this checkout has no
installed `node_modules`/Vitest (`npm run test:unit -- <focused route test>`
reports that `vitest` is not recognized). Node syntax checks passed for the new
route/test and the touched audit integration tests. The 14 new EN/FR
publication strings passed JSON and placeholder parity checks, the security
workflow contract passed, and `git diff --check` passed (with existing CRLF
normalization warnings for `AGENTS.md` and current ground truth). Full
TypeScript/ESLint, React/browser interaction, actual migration generation, and
target-host audit/RLS behavior remain unverified.

## Files changed

- `src/app/api/site-admin/subprocessors/[id]/publish/route.ts`
- `src/app/api/site-admin/subprocessors/[id]/publish/route.test.ts`
- `src/components/site-admin/SubprocessorRegistryPanel.tsx`
- `messages/en.json`, `messages/fr.json`
- `docs/LAUNCH_TRUST_LEGAL_REFACTOR.md`
- `docs/PROGRESS.md`
- `docs/audit/current-ground-truth.md`
- `docs/guides/HOSTED_SECURITY.md`
- `AGENTS.md`

## Next verification

1. Run the focused route test, then the project unit suite when dependencies
   are available.
2. Run TypeScript and lint; inspect the app in EN and FR for keyboard focus,
   screen-reader status announcements, and the uncertain-outcome reload path.
3. Verify migration `0065` and `subprocessor_audit_events` append-only/RLS
   behavior with the actual production runtime role.
4. Verify hosted mode with `AUDIT_DB_BACKEND=postgres`, then prove missing or
   memory audit configuration blocks direct API publication.
5. Continue with actual provider inventory and Packet 8 alert/restore evidence;
   never add a provider based only on a guessed vendor list.
