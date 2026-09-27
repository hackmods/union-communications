# UnionOps Launch Trust, Legal, Security & Compliance Refactor

**Status:** Managed Documents acceptance evidence and enterprise hardening are integrated at `3da2503e` on `feat/enterprise-readiness-prior-hardening`; a localized Trust index and managed policy redirects are in progress; legal approvals, effective Terms/DPA, hosted operating evidence, and deployment proof remain open
**Last reviewed:** 2026-09-27
**Target:** UnionOps-operated hosted customer instances storing sensitive union data; procurement readiness; staged pilot
**Source brief:** User-provided launch trust/legal refactor brief, 2026-09-27

This is the living fit-gap assessment, decision log, claim register, evidence
register, and packet tracker for the launch readiness work. Update it in every
packet. A public promise is complete only when the supporting application
control and operating evidence exist. Draft documents are never effective
policy.

## Current environment and foundation status

The managed-document merge at `7e3d42ea` and the preserved hardening work are
integrated in `3da2503e`. This worktree now contains migrations `0064`–`0074`:
Managed Documents and acceptance scope remain `0064`–`0067`, followed by the
hardening migrations `0068`–`0074`. The original hardening branch was
fast-forwarded to the integration commit so work can continue from one
consistent source tree. Database journal/generated-shape checks and source
tests exist; PostgreSQL runtime/RLS and target-host evidence remain pending.
See
[`session-knowledge-2026-09-27-managed-documents-source-audit.md`](audit/session-knowledge-2026-09-27-managed-documents-source-audit.md).

Relevant verified platform facts from this checkout:

- Next.js 16 App Router, TypeScript, Tailwind CSS v4, next-intl EN/FR, Drizzle
  migrations, PostgreSQL/RLS adapters, Auth.js, Docker and CapRover CI.
- Public routes include localized `/trust`, `/trust/subprocessors`, and
  `/documents/{privacy,security,accessibility}`. Stable legacy policy routes
  now permanently redirect to the managed document routes. No `/terms`, `/dpa`,
  `/email-preferences`, or managed subprocessor/incident surfaces were found.
- Hub remains invite-only. Existing invite acceptance is the account activation
  flow; there is no public `/app/register`.
- The managed policy pages fall back to the existing localized Privacy,
  Security, and Accessibility content until approved published text exists.
  Privacy and Security copy vary by the public Officer Hub feature flag. Trust
  is an index only; its statements still need claim-by-claim review and
  operating evidence.
- `requireSiteAdminSession()` checks session MFA and platform-admin role, but
  `sessionMfaOk()` returned true when MFA was off. Hosted customer mode now
  requires production TOTP configuration. A role-to-capability map requires
  enrollment for privileged/sensitive roles while exempting basic local members
  unless their account explicitly enabled MFA. `decideCapability()` also
  enforces MFA on effective assignments and active delegations. The status
  route resolves current authority for the enrollment gate; role, assignment,
  and delegation changes invalidate prior MFA claims. Verification grants are
  bound to the current session version. Recovery codes are one-time and hashed;
  verified TOTP counters now use account-scoped durable Postgres state in
  hosted mode to reject replay across requests and replicas. The MFA session
  handoff now has one durable hashed grant row per hosted account; pending
  enrollment remains process-memory-backed. Route/RLS integration coverage,
  broader action-bound step-up, and deployed grant evidence remain open. Site
  Admin Hub-role changes now require a fresh challenge when MFA is enabled.
  TOTP secret storage/encryption needs a separate review.
- `audit_log` and site-admin/tenant audit UIs now include outcome and optional
  request correlation. Migration `0074` marks historical outcomes `unknown`
  and removes runtime update/delete privileges. MFA verification/rotation and
  operator audit-list requests emit server-generated request IDs; most legacy
  audit call sites still omit them. Durable storage depends on
  `AUDIT_DB_BACKEND=postgres`.
- Error reporting supports opt-in Sentry and server JSONL sinks; these are
  error telemetry, not the security audit trail. `/api/health` exposes basic
  health/deployment status. Hosted operational evidence is omitted from public
  health and returned only with the dedicated `HOST_READINESS_SECRET` bearer;
  the CI/site-admin readiness gates now cover hosted TOTP, storage/scanning,
  backup restore, and alert delivery attestations.
- Email is centralized in `sendTransactionalEmail()` and currently documented
  as transactional only. It supports SMTP/Mailgun. No marketing consent,
  campaign, suppression, or preference-centre implementation was found.
- CI includes lint, typecheck, unit tests, build, Playwright smoke, Docker
  migration smoke, blocking critical/high npm audit, full-history redacted
  Gitleaks scanning, and critical/high Trivy scans of built and dispatch-selected
  images. GitHub CodeQL's extended JavaScript/TypeScript suite is also
  configured for PRs, pushes, and weekly runs. Demo and production-configured
  images are scanned before their push;
  deploy requires the relevant image scan plus successful test/build, audit,
  and secret-scan jobs. Actual hosted scan results remain unverified. Axe/
  Playwright coverage exists on selected flows and needs a representative
  public/authenticated route matrix.
- Post-deploy readiness runs for both direct CI image deployments and target
  deployments separately confirmed through `/api/health`. The deploy job now
  depends on the successful test/build/audit job. GitHub Actions server-side
  validation remains pending. CapRover's independent Git deployment/webhook
  path is external to this workflow and must be disabled or independently gated
  before it can be claimed that all production deployments require the audit.
- The initial compliance review found an unsupported 72-hour PIPEDA breach
  claim and universal retention wording; `docs/COMPLIANCE.md` now uses the
  applicable “as soon as feasible” language and requires approved schedules by
  data class. The locally available Managed Documents feature ref separately
  backfills private-vault retention to seven years; this remains unapproved and
  is an integration gap, not a current-main behavior.
- Database changes must follow ADR-020: append-only Drizzle migration journal,
  owner migration URL, restricted runtime role, and generated boot-shape gate.
  Do not reintroduce `platform_meta` or a second migration/version ledger.

## Fit-gap matrix

| Requirement | Current implementation | Gap | Proposed implementation | Tests / evidence | Status |
|---|---|---|---|---|---|
| Managed Documents | Present in integrated history `3da2503e`; public library and private Hub vault are separate; `/documents/{privacy,security,accessibility}` render managed publications with a legacy localized-content fallback | Publication lacks action-bound fresh MFA; seven-year private-vault backfill is unapproved; PostgreSQL runtime/RLS proof pending | Reuse merged system; migration `0067` adds scope-aware append-only acceptance evidence; repair only proven gaps | Focused source tests and migration/generated-shape checks were recorded in the integration audit; restricted-role PostgreSQL and host checks pending | Implemented in integrated source; runtime verification pending |
| Public trust/policies | Managed `/documents/{privacy,security,accessibility}` pages; localized `/trust` index; legacy policy routes permanently redirect; `/trust/subprocessors` has localized public fields | Trust is navigation, not proof of controls; no effective Terms/DPA or complete claim evidence; policy wording still needs qualified approval | Keep managed pages canonical; maintain Trust navigation, accurate locale copy, metadata, and claim-to-control evidence | Focused EN/FR copy, SEO, and sitemap tests; accessibility and legal claim review remain pending | Partial; public index and stable redirects implemented, approvals/evidence open |
| Legal docs and Privacy Officer | Merged system seeds required Privacy/Security/Accessibility baselines and an admin-only empty Terms draft; no DPA or configurable Privacy Officer is present | No effective approved Terms/DPA or contact source; Terms draft has no legal text | Managed drafts and approvals; legal contact config; qualified review; add DPA record in the merged store | Publication audit, effective status, contact monitoring/currentness | Open; legal review required |
| Agreement acceptance | Durable public-document acceptance table keyed by exact version and subject; merged source checks current union/local authority | Earlier acceptance records lack source/request and authority fields; legacy rows cannot prove an attestation; PostgreSQL RLS execution remains unverified | `0067` adds individual/organization scope, authority attestation, server-generated correlation, DB append-only guard, and legacy-row marker; full Terms/DPA gating still depends on approved documents | 83 acceptance and adjacent regression tests pass; `db:check`, typecheck, changed-file lint, and generated shape pass; runtime RLS smoke pending | Implemented in current worktree; not verified for launch |
| CASL marketing | Transactional email only; no product campaigns | No separate opt-in, evidence, suppression, or unsubscribe | Voluntary individual subscription and restricted marketing pathway; no member roster imports | Consent, withdrawal, suppression, transactional independence | Open |
| MFA | Existing TOTP; hosted customer profile requires production TOTP; roles, effective officer assignments, and active delegated capabilities are MFA-gated; Site Admin role changes, password-reset emails, cross-union/local account assignment, local lifecycle and provisioning, union membership-policy changes, cross-tenant audit reads, subprocessor review and publish/withdraw, officer/delegation authority changes, UnionOps Data accepted-row publication, sensitive exports, payroll/webhook dispatch, and Hub document-vault downloads/deletions now require fresh step-up when MFA is enabled; basic members can use permitted member surfaces without forced enrollment; one-time recovery codes, durable TOTP replay counters, and hashed session grants ship in this checkout | Verify every sensitive route and target-host RLS path; pending enrollment and TOTP secret storage remain process/plaintext risks requiring multi-replica/key-management review | Keep server/API and UI gates aligned; maintain the role/capability matrix; extend step-up decisions to remaining high-impact actions and complete durable audit | Role matrix, delegated capability denial, effective status/enrollment, privilege-change invalidation, recovery-code and TOTP-counter single-use tests, session-version-bound grant checks, direct API denial/success tests for selected access, authority, review, publication, export, deletion, and cross-tenant actions | Partial; selected step-up routes are covered; pending enrollment, secret-storage review, remaining action coverage, and deployed grant/production evidence remain |
| Security audit | `audit_log` with outcome/request ID fields, MFA event correlation, and runtime append-only permissions; durable storage depends on `AUDIT_DB_BACKEND=postgres` | Broad success/failure event coverage and hosted DB/RLS verification remain incomplete | Instrument role/access, publication, consent, export, deletion, and incident actions; verify durable audit access/review | Audit adapter tests, migration `0074`, MFA route outcomes, RLS/append-only smoke, route matrix | Partial; core fields and selected MFA events implemented, broad coverage and deployed evidence pending |
| Monitoring | Health endpoint; env-gated Sentry/JSONL; hosted readiness now requires current operator attestations for alert delivery and backup restore | Actual provider/jobs, delivery, restore, and measured RTO/RPO remain unverified | Verify provider/job/DB/storage/backup signals; actionable alerts and drills | Readiness config tests plus target-host alert delivery and restore records | Partial; app gate added, operating proof remains |
| Retention/deletion | Initial schema/storage/lifecycle inventory in [`data-inventory-retention-register.md`](audit/data-inventory-retention-register.md); no approved schedules or central hold/purge service | Periods, legal holds, backup expiry, and per-domain deletion are not implemented or approved | Approve schedule by class; build dry-run, hold-aware deletion and evidence | Hold, tenant boundary, attachment, audit, retry, backup-expiry tests | Partial; engineering inventory captured, approvals and operations open |
| Incident response | MFA-gated `/app/site-admin/incidents` register and action-bound API added; no incident records seeded and no drill evidence | Qualified notification decisions, approved retention, legal/customer duties, and an exercised incident/privacy-request workflow remain open | Use the restricted platform register for UnionOps-operated incidents; retain operator runbooks for self-hosted deployments; record decisions and metadata-only access evidence | Direct API denial, action-bound TOTP, rate-limited failed challenges, RLS/append-only SQL checks, field validation and controlled JSON export; live DB and drill pending | Partial; source implementation only |
| Subprocessors | Restricted Postgres register and `/trust/subprocessors` projection added; second-admin review and publication/withdrawal require fresh MFA and correlated audit; hosted customer mode blocks without durable audit | Actual production providers and processing details remain unverified; DPA/vendor review and public field approval are not legal sign-off | Populate only from verified host configuration; second platform-admin review; publish allow-listed fields only after action-bound challenges | Migration `0069_subprocessor_registry.sql`, RLS/trigger checks, registry validation/projection, and review/publication step-up tests; deployed DB and provider evidence pending | Partial; code is present, provider inventory and operating review remain |
| Security scans | CI blocks critical/unexcepted high npm audit findings; weekly lockfile audit/Dependabot updates run; full-history Gitleaks and CRITICAL/HIGH Trivy scans are wired for demo, production-configured, and workflow-dispatch-selected images; extended CodeQL analysis and a weekly ZAP baseline workflow are configured; deploy requires applicable image, test, audit, and secret scan jobs | No approved staging hostname or GitHub `DAST_STAGING_URL` is configured, so ZAP explicitly skips and no DAST evidence exists; scanner runs/findings remain unobserved; CodeQL branch-protection enforcement is unverified; CapRover's independent Git/webhook deploy path is outside this workflow; container and npm exception approver governance remain open | Approve an isolated synthetic-data staging origin and add exact hostname to the allowlist; review ZAP/CodeQL reports; remediate or approve time-bounded exceptions; require CodeQL through branch protection; govern external deploy path | DAST target validator tests pass for absent, approved, production, local, malformed, and unapproved URLs; workflow/CI policy checks pass; live scans, scan report review, branch rule, Docker scanners, and hosted evidence pending | Partial |
| Accessibility | Axe smoke covers eight localized Privacy, Security, Accessibility, and Trust/subprocessor routes; home/Create/Utilities/Learn, sign-in, invite error, selected Hub, and Portal journeys now include EN/FR paths | Successful invite activation and Site Admin document states lack dedicated E2E identities/fixtures; axe findings have not been executed in this checkout; keyboard/screen-reader/print review remains | Expand representative EN/FR journeys; add safe test identities and successful invite fixtures; keep WCAG 2.2 AA internal target and record manual evidence | Playwright cases exist in `e2e/smoke.spec.ts`, `e2e/hub.a11y.spec.ts`, and `e2e/portal.smoke.spec.ts`; execution pending dependencies | Partial; automated route matrix expanded, results and manual assessment pending |
| Hosted durability | Postgres/RLS adapters, verified DB deployment gate, readiness checks for required backends/TOTP, and new hosted storage/scanner/backup/alert gates | Runtime flags and owner/date attestations do not independently prove provider policies, scan service behavior, restore quality, or alert delivery | Keep readiness checks, verify runtime DB role/RLS and deployed providers, exercise backup/restore and alerts, and close host-specific gaps | Unit tests for configuration/evidence rules; target-host RLS, scanner, restore, and alert evidence still required | Partial |
| Procurement readiness | Operator guides and architecture documentation exist | No evidence-linked customer pack or independent review record | Build questionnaire pack and independent hosted-config review | Evidence register, findings, retests, pilot report | Open |

## Public claim register

| Claim area | Current source | Evidence to verify | Owner | Disposition |
|---|---|---|---|---|
| Comms drafts stay on device; no analytics | `/privacy`, `/security`, product copy, ADR-006 | Check browser network/data paths, storage, external scripts and uploads | Product/engineering | Verify before preserving |
| Hosted Hub/Portal data is controlled by instance operator | Privacy and security pages; COMPLIANCE | Confirm hosting and controller/customer contract boundaries | Legal/privacy + operator | Qualify by hosting model |
| MFA protects confidential modules and high-impact Site Admin changes | RBAC, security page, MFA policy, selected Site Admin APIs | Hosted production configuration, role/delegation map, direct API enforcement, target-host evidence | Security owner | Qualified in docs and EN/FR security copy: production TOTP applies to privileged hosted-customer capabilities; selected exports, authority changes, account support, local lifecycle, membership-policy writes, and cross-tenant audit reads require action-bound challenges; complete route and host verification remains |
| Union records are scoped and isolated | RBAC, security page, database policy | Runtime DB role, policy matrix, direct-API and database tenant-isolation tests on the deployed configuration | Engineering/security | Qualified in EN/FR security copy to describe the required scope; Postgres/RLS host evidence remains mandatory |
| Attachment scanning/encryption | COMPLIANCE / HOSTED_SECURITY; hosted readiness | Scanner URL/strict mode, fail-closed behavior, current scan-test attestation, explicit storage config, encryption/location review | Operator + security owner | Config-dependent; host readiness is an operator attestation, not an independent storage/scanner verification |
| Breach notification timing | COMPLIANCE, HOSTED_SECURITY | OPC guidance requires “as soon as feasible” when the applicable PIPEDA threshold is met; required breach records are retained 24 months | Privacy/legal | Corrected; qualified legal review remains |
| Seven-year retention default | COMPLIANCE | Per-category legal/contractual basis not established | Privacy/legal + customer | Remove universal assertion; define approved schedule |
| Accessibility conformance | Accessibility page / COMPLIANCE | Full-page manual and automated assessment, applicable customer obligations | Accessibility owner | No conformance claim until assessed |
| Email “reply-only, never a mailing list” | Feedback copy and ADR-018 | Remains valid; future product-news consent must be a distinct collection purpose | Product/privacy | Preserve and clarify |
| Subprocessor disclosure | `/trust/subprocessors`, Security page | Production configuration review, verified service/data-flow record, second-admin approval, fresh MFA and durable audit in hosted mode, DPA review | Operations + privacy/legal | Route exists; no provider facts published until verified and approved; control is source-tested only |

## Evidence register

| Evidence | Control/promise | Source | Required before hosted launch | Status |
|---|---|---|---|---|
| Managed document publication history | Current legal/policy version | Managed Documents admin and DB | Yes | Present in fetched main; fresh action-bound publication step-up and hosted DB evidence remain open |
| Terms acceptance records | Exact Terms acceptance | Durable append-only agreement ledger | Yes | Acceptance table exists on source ref, but generic scope, mutable DB policy, no flow/request evidence, empty Terms draft, and missing legal approval remain open |
| DPA acceptance records | Contracting party acceptance | Durable union/local party ledger | Yes | No DPA seed or explicit DPA-required scope exists on source ref |
| Consent/suppression records | CASL marketing controls | Consent events, send gate, provider results | Yes, before marketing send | Not implemented here |
| MFA and security audit | Privileged access | Hosted role/capability checks; fresh MFA challenge for Site Admin role/account, local lifecycle, membership policy, cross-tenant audit reads, subprocessor publication, tenant authority, data publication, sensitive exports, payroll/webhook dispatch, and time-report downloads; grievance, bumping, time-entry, and explicitly shared Portal file routes now audit before reading bytes and before delivery; TOTP enrollment/replay counter; recovery-code, counter, session-grant, attempt-limit, and audit outcome/correlation migrations with focused tests; durable audit DB and deployed RLS evidence | Yes | Partial; selected step-up APIs and correlated MFA outcomes are implemented, but pending-secret durability, TOTP secret protection, broad correlated event coverage, remaining sensitive actions, and deployed RLS/host evidence remain |
| Deletion/retention run reports | Retention policy | Central service, hold state, audit evidence | Yes | Not implemented here |
| Incident drill and register | Incident response | Restricted site-admin register; append-only metadata audit and export | Yes | Partial; code only, no real records or drill evidence |
| Subprocessor review | Public vendor register/DPA schedule | Site-admin registry, second-admin approval, fresh challenge, correlated audit | Yes | Partial; review and publication controls are source-tested, production records and legal review remain pending |
| Scan findings/exceptions | Vulnerability policy | CI artifacts and exception log | Yes | Partial |
| Accessibility assessment | Accessibility statement | EN/FR Playwright axe report plus [manual review checklist](audit/accessibility-manual-review-checklist.md) results for keyboard, screen reader, mobile/zoom, dialogs, and print | Yes | Partial; route cases added, execution and manual checklist remain pending |
| Backup/restore and alert drills | Recovery/monitoring claims; hosted customer readiness gate | Operator run logs, owner/date attestations, actual target-host restore and alert evidence | Yes | Readiness now checks attestation fields within 90 days; external operation remains unverified |
| Independent security review | Procurement pack | External review report and remediation retests | Yes for procurement readiness | Not started |

## Packet tracker

| Packet | Scope | Dependencies | Acceptance/evidence | Status |
|---|---|---|---|---|
| 1. Foundation audit and living plan | Verify Managed Documents and reconcile its migrations | Authoritative repository `main` and ADR-020-compatible migration integration | Audited versioning/auth/storage/route/acceptance/retention contract; this file updated | Partial: Managed Documents and hardening histories integrated; `0067`, migrations through `0074`, generated shape, and focused tests pass; PostgreSQL runtime/RLS verification pending |
| 2. Legal/operating baseline | Privacy Officer config, draft docs, internal procedures, counsel review | Packet 1, named reviewers | Approved owners/status/effective date; no effective placeholders | Open |
| 3. Public Trust/legal surface | Trust index, stable localized routes, content migration, footer/SEO/print | Packet 1-2 | EN/FR and accessibility review; claims trace to evidence | Partial: EN/FR index, footer, sitemap/metadata, provider disclosure copy, and legacy redirects implemented; legal and accessibility review pending |
| 4. Terms/DPA agreements | Durable exact-version acceptance and reacceptance | Party model, approved docs | Server enforcement and party-isolation tests | Open |
| 5. Marketing program | CASL notice, subscription, consent, suppression, campaign pathway | Email classification and approved wording | End-to-end consent and unsubscribe evidence | Open |
| 6. Privileged MFA/audit | Capability policy, recovery, replay prevention, durable session grants, step-up, durable audit | Auth/session and hosted profile audit | API-level denial and successful privileged flows | Partial; hosted policy, recovery, replay state, hashed session grants, audit outcome/correlation fields, Site Admin role-change, password-reset, account-assignment, local lifecycle, union policy, cross-tenant audit, and subprocessor review/publication step-up; officer/delegation authority, UnionOps Data publication, sensitive exports, and payroll/webhook step-up added; other sensitive actions, broad event coverage, and deployed audit evidence remain |
| 7. Privacy operations | Data map, retention, holds, deletion, incident register | Approved schedule and DB/storage inventory | Dry run, deletion, incident drill records | Partial; initial source-backed data map captured, period and legal-hold approval pending |
| 8. Vendors/operational controls | Subprocessor registry, alerts, backup/restore readiness | Production provider inventory | Change audit, delivered alerts, restore proof | Partial; registry code and hosted readiness gates added; production inventory and operating evidence pending |
| 9. Continuous assurance | Security scans, accessibility route matrix | CI/staging and test identities | Enforced gates and tracked exceptions | Partial; blocking dependency policy, weekly audit/Dependabot, full-history secret scan, pre-publish built-image scans, dispatch-image scan, extended CodeQL workflow, and EN/FR axe journeys are configured; hosted findings, DAST, CodeQL branch protection, Site Admin and successful invite fixtures, and manual assessment remain |
| 10. Procurement/pilot | Evidence pack, independent review, launch gate | Packets 1-9 and counsel approval | Findings resolved, pilot review, launch report | Open |

## Release evidence tracker

One row per packet; “pending” means the required evidence or sign-off is not
available yet. Production configuration and approval fields must be filled
from the target host and accountable reviewers, not inferred from source code.

| Packet | Owner | Dependencies | Acceptance tests / evidence | Evidence location | Legal/content sign-off | Production configuration | Completion date |
|---|---|---|---|---|---|---|---|
| 1. Foundation audit | Ryan / engineering | ADR-020; Managed Documents merge `7e3d42ea`; hardening merge `3da2503e` | Managed Documents versioning, auth, storage, locale, audit, routes, acceptance and retention review | [Managed Documents audit and acceptance implementation](audit/session-knowledge-2026-09-27-managed-documents-source-audit.md); journal through `0074`; runtime verification pending | Product/legal claim review pending | Target release profile inventory pending | Partial; source integrated, not production verified |
| 2. Legal baseline | Ryan / product; qualified counsel for approval | Packet 1; Privacy Officer and monitored contacts | Approved owners, status, effective dates, policy/procedure inventory | Managed document records after source sync | Qualified privacy/legal review required | Contact and role configuration pending | Open |
| 3. Trust/legal site | Ryan / product engineering | Packets 1-2; approved documents | EN/FR routes, canonical/hreflang, mobile/print/accessibility and claim-to-control tests | `/trust`, managed `/documents/*` policies, localized metadata/sitemap, provider projection, and focused tests; manual/accessibility records pending | EN/FR legal/content approval required | Public deployment URLs and cache behavior pending | Partial; index and redirects implemented, tests/review in progress |
| 4. Terms/DPA acceptance | Ryan / engineering | Managed published versions; union/local contracting-party model | Invite activation, reacceptance, direct API denial, retries, stale sessions, cross-party tests | Agreement schema/routes/tests pending | Counsel must approve Terms, DPA, authority attestation | Durable Postgres and migration attestation pending | Open |
| 5. Product-news program | Ryan / engineering + privacy reviewer | Mail classification; approved consent/sender copy | Double opt-in, withdrawal/suppression, send-time gate, transactional independence, expiry/replay tests | Consent tables/routes/jobs/send log tests pending | CASL/privacy wording and sender identity approval required | Mail provider, domain, complaint/bounce config pending | Open |
| 6. Privileged MFA/audit | Ryan / engineering | Current auth/RBAC and hosted profile | Role/capability, delegated access, recovery, replay, throttling, stale-session and direct API tests; Postgres deploy/RLS checks | Focused MFA routes include Site Admin role, password reset, account assignment, local lifecycle/provisioning, onboarding/invite union creation, union policy, audit read, subprocessor review/publication, tenant authority, Data publication, sensitive exports, payroll, and Hub document download/deletion; grievance, bumping, time-entry, and member-shared Portal downloads now require pre-read and pre-delivery audit; route syntax checks pass, Vitest/typecheck/generator/live DB remain unavailable | Security owner review pending; no policy text approval in this slice | `UNIONOPS_HOSTED_CUSTOMER_MODE=true`, production TOTP, durable auth and audit DB; multi-replica enrollment and deployed grant/RLS evidence pending | In progress |
| 7. Privacy operations | Ryan / product engineering + privacy officer | Data inventory and approved retention schedule | Dry-run/deletion/hold/retry/cross-tenant tests and incident drill | [Initial inventory](audit/data-inventory-retention-register.md); [incident register knowledge](audit/session-knowledge-2026-09-27-incident-register.md); migration/API/UI and drill evidence pending | Counsel/customer approve periods and notification decisions | Durable DB, object storage, backup expiry and job schedule pending | Partial; inventory + restricted register source slices 2026-09-27 |
| 8. Vendors/operating controls | Ryan / operations | Actual production provider list | Public/internal field checks, second-admin review challenge, fresh publication challenge, durable correlated audit, test alerts, restore drill, measured RTO/RPO | [Hosted readiness note](audit/session-knowledge-2026-09-27-host-readiness.md); [subprocessor registry note](audit/session-knowledge-2026-09-27-subprocessor-register.md); [review step-up note](audit/session-knowledge-2026-09-27-subprocessor-review-step-up.md); [publication step-up note](audit/session-knowledge-2026-09-27-subprocessor-publish-step-up.md); deployed provider evidence, alert logs, and restore report pending | DPA/subprocessor schedule review required | Hosted flags/attestations documented; actual provider configuration and drills pending | Partial |
| 9. Continuous assurance | Ryan / engineering + accessibility reviewer | CI and safe staging identities | Critical/high gate, weekly dependency report, scanner artifacts, EN/FR representative axe and manual assessment | [Scheduled dependency audit workflow](../.github/workflows/scheduled-dependency-audit.yml); GitHub run artifact pending; accessibility records pending | Accessibility statement/conformance copy requires scoped review | Weekly dependency run configured; safe staging target not yet configured | Partial; dependency policy/schedule and legal-route axe slice implemented |
| 10. Procurement/pilot | Ryan / product + security/operations | Packets 1-9; approved policies; independent reviewer | Full release matrix, retests, restore/incident/consent drills, bounded pilot report | Customer evidence pack and launch report pending | Counsel, accessibility reviewer, and contracting authority approvals required | Production smoke, on-call ownership, backups/alerts, pilot tenant config pending | Open |

## Detailed implementation sequence

Execute each packet as a bounded reviewable change. Update its status, code
paths, migration IDs, tests, evidence, unresolved decisions, and owner in this
file before starting the next dependent packet. Do not mark a packet complete
because its UI exists; its stated acceptance conditions must pass.

### Packet 1 — Foundation and Managed Documents contract

1. Sync this worktree to the user-reported merged `main`; preserve these local
   edits while syncing. Confirm the commit containing Managed Documents and
   inspect its diff and documentation.
2. Trace document schema, storage adapter, Site Admin pages/APIs, authorization
   helpers, audit calls, public renderers, locale handling, and migrations.
3. Verify draft creation/edit, preview, publish, publication replacement,
   rollback, and archived history. Prove a published version is immutable and
   a rollback creates a new publication state without rewriting history.
4. Verify only platform-admin + required MFA can administer documents; APIs
   enforce access independently of the UI. Internal documents never enter
   public loaders. Public pages read approved/published records only.
5. Check safe content rendering, document metadata, mobile/keyboard use,
   bilingual versions, deterministic version URLs, caching, and deploy/database
   failure behavior. Do not depend on process memory for effective documents.
6. Inventory all existing policy copy and record each public claim in the
   claim register with code/config/evidence owner and status.

**Acceptance:** Merged system is reused; publication and access tests pass;
there is no competing document store. This tracker names remaining gaps and
packet owners.

**Source audit and repair — 2026-09-27:** The merged Managed Documents source
and acceptance implementation are recorded in
[`session-knowledge-2026-09-27-managed-documents-source-audit.md`](audit/session-knowledge-2026-09-27-managed-documents-source-audit.md).
The system includes the public versioned library, acceptance table, private
vault, RLS, shared-object storage checks, and retention job. Migration `0067`
and the current APIs now separate individual/organization acceptance, require
organization authority attestation, and make evidence append-only with request
correlation. Unit and migration-integrity checks pass; typecheck still reports
other merged-source errors and Postgres RLS verification remains pending.
Stable legacy policy URLs now redirect to managed document detail routes, whose
fallback retains the previous EN/FR content if no managed publication exists.
Action-bound publication step-up, legal approval, and the
unapproved seven-year private-vault backfill remain open.

### Packet 2 — Legal and operating baseline

1. Add centrally managed legal identity and role-based contact settings for
   privacy, security, and support. Verify ownership, access, monitoring, and
   fallback procedure for each mailbox/address.
2. Seed drafts for Privacy, Terms, DPA/customer data terms, Retention and
   Deletion, Security/Trust, Accessibility, Vulnerability Disclosure, and the
   CASL notice. Seed internal procedures for incident response, privacy
   requests, retention, access/MFA, security, vulnerability handling,
   monitoring, backup/restore, marketing, vendor review, data inventory,
   privacy impact assessments, and accessibility remediation.
3. Show draft/not-effective status on every draft. Never use a draft as current
   Terms, a DPA acceptance target, or a public statement of implemented control.
4. Identify which entity provides/operates each hosted service and who controls
   the customer data. Have qualified reviewers determine applicable federal
   and provincial requirements, controller/processor responsibilities,
   customer-specific requirements, CASL scope, incident duties, and retention
   schedules. Record decisions and reviewer/date.
5. Record document owner, approval, effective date, review date, superseding
   version, and audience. Require an authorized publication action and audit
   record.

**Acceptance:** Launch-critical documents are approved before activation;
internal procedures have named owners and workable steps; placeholders remain
visibly ineffective.

### Packet 3 — Public Trust and legal routes

1. Add a bilingual Trust index covering privacy, security, access control, MFA,
   data handling, retention, backups/recovery, incident response, subprocessors,
   accessibility, and vulnerability reporting. Link each entry to its current
   approved document or structured register.
2. Keep existing Privacy, Security, and Accessibility URLs stable. Render the
   managed version there or use a permanent redirect to a deliberate canonical
   destination. Add Terms and DPA routes plus approved retention and disclosure
   pages. Keep public HTML readable without requiring a PDF viewer.
3. Show version, effective date, publication status, contents navigation, and
   print layout. Add semantic headings, keyboard navigation, mobile layout, and
   status indicators that do not depend on colour alone.
4. Add sitemap/canonical/hreflang entries using the existing SEO helpers and
   locale routing. Add both EN and FR copy together; review French meaning.
5. Keep the footer group compact. Preserve product navigation focus. Ensure
   only approved public fields appear; never render internal vendor notes or
   incident instructions.
6. Add a steward-facing What's New entry with both locales after the pages ship.

**Acceptance:** Every public policy has one authoritative source, stable
localized URLs, verified metadata, and a traceable factual-claim record.

### Packet 4 — Terms and organization DPA evidence

1. Add an append-only acceptance ledger keyed to immutable document version.
   Record user, union/local contracting party, acceptance scope, timestamp,
   source/flow, and the minimum useful session/request correlation. Avoid raw
   IP, cookies, or unnecessary identity data.
2. Extend invite activation to show the exact current Terms version with an
   unchecked checkbox. Enforce acceptance server-side before completing
   activation. Keep login, MFA, Terms acceptance, and support reachable if
   reacceptance is required.
3. Add an explicit “require reacceptance” publication choice. Gate relevant
   authenticated pages and APIs until the affected account accepts. A routine
   publication does not trigger reacceptance. Preserve acceptance history.
4. Bind DPA acceptance to either a union or local contracting party. Require
   the administrator to attest authority; show current DPA and status in party
   settings. Ordinary members never accept on behalf of an organization.
5. Make writes idempotent or safely reject duplicates; handle expired versions,
   archived parties, changed authority, transaction failure, retry, and stale
   session. Audit acceptance and reacceptance decisions.
6. Scope reads/writes by union and local. Test APIs directly and exercise
   missing/disabled/published document states.

**Acceptance:** Exact version, actor, party, time, and flow are durable; no API
path bypasses required Terms; cross-union acceptance/read attempts fail.

### Packet 5 — CASL marketing consent and controlled sends

1. Add a clearly optional unchecked subscription on a suitable public form and
   account preference surface. Explain product-news purpose and withdrawal.
   Do not combine it with Terms, Privacy, support, feedback, or transactional
   account messages.
2. Add append-only consent events for grant, confirmation, withdrawal,
   unsubscribe, and justified administrative correction. Preserve exact
   wording/version, normalized destination, source, time, and minimal proof
   context. Compute current state from the event history or a transactionally
   maintained projection.
3. Verify public subscription addresses before activating them. Do not send
   product news until address confirmation; review confirmation wording as
   part of legal approval.
4. Add `/email-preferences` with signed, expiring, single-purpose tokens. Make
   unsubscribe no-login, one-step, idempotent, and effective before another
   campaign check. Retain unsubscribe evidence and keep links valid for the
   required post-send window.
5. Introduce centralized message classification and enforce consent at the
   sending boundary. Transactional/security mail is independent from marketing
   suppression. Ban direct provider calls for campaign code.
6. Add restricted admin search/export for one address, campaign preview/test
   send/rate controls/send log, explicit send action, provider outcome handling,
   sender identification, contact, and unsubscribe link. Do not import Hub,
   Portal, support, feedback, or union rosters.
7. Apply suppression on every recipient at send time and audit admin evidence
   access and corrections. Minimize addresses in provider/error logs.

**Acceptance:** Positive opt-in is recorded, withdrawal remains auditable,
suppression is checked immediately before send, unsubscribes are simple, and
transactional messages still work for unsubscribed accounts.

### Packet 6 — Privileged MFA and security audit

1. Complete a route/API inventory mapping actual capabilities to privileged
   actors: site-admin, role administrators, agreement/document publishers,
   incident viewers, sensitive-data administrators, and confidential casework
   administrators. Include delegated permissions and no-union-crossing rules.
2. Use `UNIONOPS_HOSTED_CUSTOMER_MODE=true` for UnionOps-operated customer
   deployments. The current slice maps all existing roles except basic
   `local_member` to privileged or sensitive module/capability access. Confirm
   the mapping against delegated assignments and role-gated routes, and extend
   it to any privileged API not already using the shared gate. Host readiness
   requires production TOTP.
3. Enforce enrollment after privilege elevation; leave only login, MFA setup,
   security recovery, Terms acceptance, and support available until verified.
   Reject shared codes in hosted production. Keep demo behavior outside this
   profile.
4. Add recovery codes with one-time use, hashed storage, invalidation on
   regeneration, and explicit user guidance. Add auditable reset with step-up
   or a second operator process. Revoke stale sessions after role/MFA changes.
5. Add step-up challenges to publication, role change, MFA reset, sensitive
   export, organization deletion, and incident access. Expire grants and bind
   them to the user/action.
   The expense spreadsheet/PDF/receipt ZIP endpoint now uses POST and enforces
   a same-request challenge after tenant access succeeds. Payroll export also
   challenges after local-profile authorization and requires a pre-dispatch
   audit before its optional webhook. The Travel spreadsheet, PDF, and receipt ZIP exports also use POST and require a same-request challenge after resource scope succeeds but before advances, claims, or receipt files are loaded; the confirmed audit is required before returning bytes, and the old GET path returns 405. The general Time report endpoint now
   uses POST for CSV/XLSX/PDF, validates date/category filters, challenges
   before reading entries, and requires a correlated success audit before
   delivering the file; legacy GET returns 405. Poll-results CSV/XLSX exports
   now follow the same POST, scope-before-challenge, fresh-MFA, correlated
   success-audit-before-bytes contract; their old GET path returns 405.
   Meeting RSVP roster CSV export follows the same contract before reading
   attendee names/contact details/notes, and its old GET path returns 405.
   Site Admin password-reset email delivery now requires fresh MFA when host
   policy is enabled, writes a correlated authorization audit before issuing
   or sending the token, records delivery outcome, and never returns the reset
   token or target address. An uncertain result warns operators to check before
   retrying. The Site Admin union/local account-assignment API also requires a
   fresh challenge, records a correlated authorization event before applying
   the write, and warns against a blind retry if result evidence is uncertain.
   Site Admin local archive and restore now also require fresh MFA, require a
   correlated authorization audit before mutation, and write a separate result
   event. The UI resumes the chosen action after a challenge and offers an
   explicit status reload if the mutation result is uncertain. Site Admin
   membership-policy changes now also require fresh MFA before union or member
   impact reads; intent audit precedes the scoped aggregate and write, with a
   result event after. The bilingual form freezes the selected policy during
   challenge and blocks blind retry on uncertain results. Organization
   deletion, MFA reset, and any other sensitive action still require route
   decisions. Cross-tenant Site Admin audit-log reads now use POST and fresh
   MFA before querying rows, with an access-intent event before the query and a
   result event before returning entries; the old GET path returns 405.
6. Extend durable audit records for auth success/failure, MFA, roles, ownership,
   publication, acceptances, marketing changes, exports, deletion, and incident
   access. Add outcome and correlation ID where missing. Ensure logs omit
   credentials, tokens, recovery codes, case narratives, medical data, and
   uploaded content.
7. Review TOTP secret storage and encryption-at-rest evidence. Do not make an
   encryption claim until storage design and deployed infrastructure support it.

**Acceptance:** Direct API tests demonstrate MFA enforcement, recovery and
step-up are auditable, disabled/stale sessions fail closed, and audit evidence
is durable and tenant-safe.

**Implementation slice — 2026-09-27:** Hosted MFA no longer forces every Hub
account through enrollment. The server and client share a session requirement;
the login flow derives it from hosted role scope plus persisted per-user MFA,
and the status endpoint only requests enrollment when required. Basic
`local_member` accounts can reach their allowed member surfaces without TOTP.
Unknown/missing role claims fail closed. Postgres JWT refresh recomputes policy
from current roles and stored MFA state, and role/session-version changes clear
the old verification claim. Direct capability decisions also require MFA for
assignments and delegations; the status endpoint resolves those relationships
to activate enrollment, and grant/revoke operations invalidate the recipient's
session. Focused tests cover the role matrix, delegated decision, and role
elevation invalidation; MFA grants also reject an older session version. Full
route/RLS coverage, broad step-up, and durable audit fields remain open.

**Site Admin local lifecycle slice — 2026-09-27:** Archive and restore now
challenge before reading the target local. The API records an authorization
event before the update and a result event after it, both with a server request
ID and union scope; audit metadata contains IDs and controlled phase/reason
tags only. The localized
operator control resumes the same archive/restore choice, handles throttling
and service outages, and blocks blind retries if the write or its result event
is uncertain. Direct route cases are authored for both actions. Runtime tests,
typecheck, browser behavior, and deployed audit/RLS/TOTP evidence remain
pending; other Site Admin and tenant-sensitive actions remain in the Packet 6
inventory. See
[`session-knowledge-2026-09-27-local-lifecycle-step-up.md`](audit/session-knowledge-2026-09-27-local-lifecycle-step-up.md).

**Site Admin membership-policy slice — 2026-09-27:** The union policy PATCH
now requires fresh MFA after strict request validation and before union/member
impact reads. Intent audit precedes the union-scoped multi-local aggregate and
policy write; result evidence follows. The EN/FR settings form preserves the
selected policy during challenge and blocks repeat writes when the result is
uncertain. Direct route tests cover ordering, denial, audit outage, successful
change, and uncertain write/result. Runtime tests, typecheck, browser checks,
and deployed Postgres/RLS/TOTP/audit evidence remain pending. See
[`session-knowledge-2026-09-27-membership-policy-step-up.md`](audit/session-knowledge-2026-09-27-membership-policy-step-up.md).

**Site Admin audit-read slice — 2026-09-27:** Cross-tenant operator audit
records now require fresh MFA before querying. The GET/query-string path is
retired; a strict POST carries the bounded limit and optional code. A
correlated intent event must append before the query, and a result event must
append before rows are returned. The operator page has EN/FR challenge and
failure states. Focused route coverage is authored; runtime tests, browser
checks, owner-DB least-privilege review, and deployed audit/RLS verification
remain pending. See
[`session-knowledge-2026-09-27-site-admin-audit-step-up.md`](audit/session-knowledge-2026-09-27-site-admin-audit-step-up.md).

**Recovery-code slice — 2026-09-27:** TOTP enrollment now returns ten
high-entropy recovery codes once; Postgres stores SHA-256 hashes, verification
consumes them atomically, and a fresh TOTP challenge rotates the set while
invalidating older codes. The forward migration and boot-shape entry are
present. Focused tests cover normalization, owner binding, concurrent use,
rotation, and API behavior, but Vitest and Drizzle contract generation could
not run because dependencies are absent. Pending enrollment still uses process
memory. MFA grants now have a durable hosted path; deployed verification
remains required.

**TOTP replay slice — 2026-09-27:** The verifier now returns the exact accepted
RFC 6238 counter. New migration `0071_mfa_totp_replay_guard.sql` stores only
the latest accepted counter per account under `FORCE ROW LEVEL SECURITY`;
hosted mode fails closed unless Postgres-backed account storage is configured.
An atomic conditional upsert allows a counter once across concurrent requests
and app replicas. TOTP confirmation seeds the just-used enrollment counter in
the same transaction as the Postgres secret update, so the setup code cannot
immediately issue a second grant. The `db:rls-smoke` path now tests own-account
visibility, cross-account denial, and writes in a rolled-back transaction.
Focused tests cover exact-window counter matching, repeat rejection, and a
concurrent duplicate. Typecheck, Vitest, generated DB shape, and live RLS are
still pending in this dependency/database-free checkout. The table is replay
state, not an event log. Migration `0073_mfa_verification_attempts.sql` now
adds a separate account-scoped 10-attempt/15-minute verifier window; its
deployment and cross-replica RLS behavior remain unverified. TOTP-secret
encryption remains separate work.

**Session-grant slice — 2026-09-27:** Migration
`0072_mfa_session_grants.sql` stores one latest grant row per account with a
SHA-256 token digest, session version, issue/expiry times, and consumed time.
Hosted mode fails closed without Postgres-backed accounts; issuing grants
upserts the account row and consuming uses a single conditional `UPDATE ...
RETURNING`, so only one replica can accept a nonce. Stale-version and expired
matching grants are consumed but do not verify the session. The row is bounded
to one per account, not an event history, and the runtime role cannot delete
it. The Auth.js JWT update callback now awaits grant consumption and fails
closed if storage is unavailable. A failed grant write returns 503 after the
TOTP counter has been consumed; the next counter must be used. Focused tests,
generated shape verification, and live RLS checks remain pending. Pending
enrollment persistence and TOTP-secret encryption are still open.
Design note: [`session-knowledge-2026-09-27-mfa-grants.md`](audit/session-knowledge-2026-09-27-mfa-grants.md).

**Portal route slice — 2026-09-27:** Added one shared access check that combines
the authenticated session's MFA state with current actor authority. Privileged
roles, effective assignments/delegations, and Circle administrators are
checked before both Portal page rendering and Portal API work. API requests
without the required verification return 403; Portal pages direct the user to
the MFA route. The MFA status endpoint also detects current Circle admin
authority, and Hub UI waits for that server check before treating a hosted
member as exempt. Basic local members remain exempt under hosted mode unless
their account enabled MFA, while evaluation/self-hosted settings continue to
use the existing host policy. Focused tests cover the local-member exemption,
privileged roles, delegated capability, Circle administration, and the
non-hosted MFA-off behavior. This does not complete the full protected-route
audit or prove production persistence/multi-replica behavior.
Design note: [`session-knowledge-2026-09-27-portal-mfa-guard.md`](audit/session-knowledge-2026-09-27-portal-mfa-guard.md).

**Security-audit evidence slice — 2026-09-27:** Migration
`0074_audit_outcome_request_correlation.sql` adds an outcome and optional
request ID to audit rows. Existing outcomes are `unknown`; the database default
is `success` only for new records. MFA verification and recovery-code rotation
now record success, denial, or error with a server-generated UUID also returned
as `X-Request-ID`; the site-admin audit-list read records its correlation ID.
No submitted MFA code is written to audit metadata. The runtime role has
UPDATE/DELETE revoked on `audit_log`, and the RLS smoke source checks field
persistence, cross-union read denial, and append-only permissions. Tenant and
operator audit views show the new fields. Existing event callsites still
default to success and generally lack correlation; this is not broad route
  coverage. Durable operation still requires `AUDIT_DB_BACKEND=postgres` and
  deployed migration/RLS verification. The migration journal, four npm audit
  policy checks, shape inspection, and `git diff --check` pass; Vitest,
typecheck, generated shape verification, and live RLS could not run because
dependencies/database are unavailable.
Design note: [`session-knowledge-2026-09-27-security-audit-fields.md`](audit/session-knowledge-2026-09-27-security-audit-fields.md).

**Role-change step-up slice — 2026-09-27:** The Site Admin Hub-role API now
requires a fresh MFA challenge on hosts with MFA enabled before it calls
`setUserRoles`. In the hosted customer profile, the route fails closed unless
production TOTP is configured. The role form first requests the change; the
API responds with a step-up-required status and the form then asks for a fresh
code. Verification uses the shared attempt limiter and replay counter. Denied,
limited, unavailable, and successful attempts receive server-generated request
IDs and outcome audit rows without recording the submitted code. The UI and
existing Hub MFA `/updates` note have EN/FR copy. Tests in
[`route.test.ts`](../src/app/api/site-admin/users/[id]/roles/route.test.ts)
cover missing/invalid/limited challenges, successful correlated mutation, and
misconfigured hosted TOTP. This slice covers only the platform Site Admin Hub
role endpoint; tenant authority changes are documented below. Other sensitive
actions still need route inventory and step-up decisions. Full test execution and deployed
verification remain unavailable in this checkout.

**Tenant authority-change step-up slice — 2026-09-27:** The
`POST /api/organization/officers`, `POST /api/organization/delegations`, and
corresponding `DELETE` routes now verify a fresh challenge after
authorization/scope validation and before opening their write transaction.
They use the shared hosted-TOTP fail-closed verifier and attempt/replay
safeguards. Direct API calls receive status `428` with
`mfa_step_up_required` without mutation when a code is absent; invalid, limited,
and unavailable checks also stop the grant/revocation. All four routes emit server-generated
request IDs and outcome audit rows scoped to the actor, union, and local, with
only stable reason/action metadata and no MFA code. The organization UI retains
the requested authority change across the challenge, accepts a fresh code, and presents
localized verification, failure, rate-limit, and outage states in EN/FR, and
identifies the exact pending person/office/capability before confirmation. The
existing bilingual hosted-MFA What's New item now names these authority
changes. Focused direct-route tests cover denial-before-transaction and
successful correlated changes for all four routes, plus attempt-limit behavior.
Managed Document/legal-policy publication, sensitive exports, account
recovery, deletion, and other actions remain outside this slice. Audit append
still follows the mutation transaction, so an audit-store
failure after commit can leave a successful grant with a failed response; a
transactional outbox remains an open audit-integrity question.

**UnionOps Data publication step-up slice — 2026-09-27:**
`POST /api/data/imports/[id]/publish` now requires a fresh MFA challenge after
the existing local-scoped writer authorization and before `publishImport`.
The UI identifies the source filename, collects the code, and resumes the same
publication request with the challenge; EN/FR messages cover invalid, limited,
and unavailable verification. The API audits denial and successful publication
with a server request ID, never the code or member values. Direct route tests
cover missing-code denial before publication, attempt throttling, success
correlation, and an explicit `503 publication_audit_unavailable` response if
the database transaction completed but the following audit append failed. The
publication service's dataset/run locking and duplicate-request checks remain
the concurrency guard. UnionOps Data remains unfit for a real member-data
pilot until storage, malware scanning, retention, and its P0 review UX are
verified. Legal-policy publication, other publish APIs, exports, deletion, and
target-host verification remain open. See
[`session-knowledge-2026-09-27-data-publish-step-up.md`](audit/session-knowledge-2026-09-27-data-publish-step-up.md).

**Sensitive expense export step-up slice — 2026-09-27:**
`POST /api/expenses/[id]/export` replaces the legacy GET download flow for
spreadsheet, PDF, and receipt ZIP exports. The route validates the requested
format, requires expense-view authorization before calling the shared fresh
MFA verifier, then builds the requested file. The bilingual Expenses form
keeps the exact submission and export format pending across the challenge and
uses a request body for the code. Every response is `private, no-store` and
has a server-generated request ID. Denial, throttle, generation error, and
success outcomes are audited without the code or expense contents. A generated
file is returned only after its success audit append is confirmed; audit
failure returns `503 export_audit_unavailable` with no file bytes. The old GET
path returns 405. Tests cover direct API denial before builders, throttling,
successful correlated audit, audit failure, cross-scope denial, expense-store
outage, and GET retirement. Vitest and production audit/RLS verification
remain unavailable.
See [`session-knowledge-2026-09-27-expense-export-step-up.md`](audit/session-knowledge-2026-09-27-expense-export-step-up.md).

**Payroll export and webhook step-up slice — 2026-09-27:**
`POST /api/time/payroll-export` now validates the selected active profile in
the actor's local scope and requires fresh MFA when host MFA policy is enabled,
before reading approved rows, building the CSV, or dispatching the optional
webhook. UnionOps-hosted customer instances require production TOTP. The Time
admin form preserves the exact profile and date range across the challenge and
tells the operator that a configured webhook may receive the rows. The route
records a correlated authorization event before webhook dispatch so an audit outage
stops the external side effect. A result event records the row count and
webhook status without employee data or endpoint secrets. If the webhook ran
but the result audit failed, the route returns 503 and the UI warns against
retrying until delivery is checked. Responses are private and non-cacheable.
Tests cover direct denial, throttling, local profile isolation, audit-before-
webhook ordering, rejected webhook results, and both pre/post-dispatch audit
failures. Vitest and deployed webhook, audit, and RLS evidence remain unavailable. See
[`session-knowledge-2026-09-27-payroll-export-step-up.md`](audit/session-knowledge-2026-09-27-payroll-export-step-up.md).

**Verification:** Migration journal/file check, policy harness, security
workflow contract check, EN/FR key parity, and static syntax checks pass;
`git diff --check` passes. Full Vitest, TypeScript, and ESLint remain blocked by
missing dependencies; live RLS and hosted verification are unavailable.

### Packet 7 — Data inventory, retention, deletion, incidents

**Implementation slice — 2026-09-27:** Added the source-backed engineering
inventory in [`data-inventory-retention-register.md`](audit/data-inventory-retention-register.md).
It groups the checked-in schema into data classes, records purpose, sensitivity,
scope, owner, candidate lifecycle trigger, and observed deletion/archive behavior,
and maps the current per-module database flags, attachment storage, scanner,
email, telemetry, and external backup responsibilities. The checked-in boot
shape contained 123 tables at the initial inventory pass; subsequent MFA,
incident, and subprocessor migrations have brought the manually updated shape
to 132 tables. Neither count is evidence of a live host configuration.
The inventory confirms that raw Data imports have no purge job, archives and
token expiry do not physically delete records, and object/relational deletion
is not coordinated. It also records temporary MFA state that remains
process-memory-backed and the customization upload orphan risk.

During this review, corrected the stale universal seven-year claims in the
grievance, workforce time, and Portal security audit docs; removed the
unapproved 24-month feedback default; and changed the compliance matrix from
claiming legal holds are supported to recording that no hold workflow exists.
No general retention schedule was selected and no destructive deletion path
was added. The applicable PIPEDA breach-record period is noted conditionally.
The inventory is engineering evidence only; Privacy Officer, customer, and
qualified legal approval is still required before scheduled purge, publication,
or a real-data pilot for affected classes.

**Hosted destructive-action guard — 2026-09-27:** The shared Demo Cleanup gate
now disables the UI, preview API, and purge API in UnionOps-operated customer
mode even if `SITE_ADMIN_DEMO_PURGE_ENABLED=true` is accidentally configured.
The owner-DB CLI independently refuses to run under that profile before opening
a database connection. Demo/workshop hosts retain the existing explicit web
feature flag, Postgres requirement, owner migration connection, typed
confirmation, and password reauthentication. This prevents a demo maintenance
switch from becoming a destructive customer-data path; it is not the planned
union/local deletion workflow and does not close the Packet 7 deletion
requirement. Regression cases are included in the feature-flag and Site Admin
route suites; focused Vitest execution remains unavailable in this checkout.

**Verification at the initial inventory pass:** Source/schema/configuration
cross-check; stale active-claim search; `git diff --check`; EN/FR JSON and all
10,901 catalog keys; migration journal (65 entries); and four npm-audit policy
harness checks passed. The initial generated boot-shape contract had 123
tables. Current source/shape counts and later checks are recorded in their
dated change-log entries below. Drizzle generation cannot run here without
`tsx`. Full Vitest, TypeScript, and ESLint checks cannot run because their
binaries are absent. No live database, object store, backup, or operator
configuration was available for verification.

1. Inventory account, organization, membership, grievance/case, attachment,
   discussion, meeting/minutes, election/poll, audit/security, marketing
   consent, feedback, backup, billing-if-present, and incident records. Record
   purpose, sensitivity, location, owner, trigger, approved retention,
   deletion mechanism, and legal-hold exceptions.
2. Obtain customer/legal-approved schedules before enabling purge. Do not bake
   unapproved legal periods into code. Explain backup expiry and customer
   responsibility in the published policy.
3. Build a central retention service with dry-run/report, scheduled execution,
   legal-hold suspension, resource/account/org deletion, attachment cleanup,
   dependent rows, queues/cache/index review, idempotency, retry, and audit.
4. For destructive organization deletion, show impact summary and export
   option, require privileged role and step-up, record explicit confirmation,
   report progress/failure, and prove tenant boundaries.
5. Create a tightly restricted internal incident register separate from error
   telemetry. Capture discovery/occurrence, severity/status, scope, data types,
   affected parties/individual estimate, containment, risk analysis, notification
   decisions and rationale, dates, remediation, lessons, closure, and record
   review date. Support controlled export for counsel.
6. Run an incident simulation and privacy access/deletion request exercise.
   Record evidence and follow-up actions.

**Acceptance:** Dry-run matches expected scope, held data is excluded, completed
deletion includes linked stored files and audit evidence, incidents are private,
and operational exercises produce retained evidence.

**Implementation slice — 2026-09-27:** Added a platform-level incident register
for UnionOps-operated hosting on migration `0070_platform_incident_register.sql`.
The site-admin page and every incident API require the platform-admin session,
Postgres-backed accounts/storage, and TOTP mode; each view/create/update/export
then needs a fresh TOTP challenge that issues a one-use, 60-second,
actor/action/resource-bound token. Failed challenges are metadata-audited and
limited to five per actor in 15 minutes under a transaction advisory lock.
RLS applies to the incident, audit, and step-up tables; runtime deletion is
blocked for incident and grant rows, grant updates can only consume a grant,
and incident audit rows are append-only with actor IDs bound to the current
RLS user and database-stamped timestamps. Exports contain one incident and up
to 500 related access/action metadata events. The UI is bilingual and warns
operators not to enter member/case identifiers, secrets, or unnecessary detail.
Records capture optional occurrence time, affected group categories and an
aggregate individual estimate, notification decision date, and optional review
date without asking for individual names or contact details. Client-held data
clears after five minutes without form/code activity, and a manual lock is
available.

No record is seeded. This is not a notification-decision engine or a legal
determination. The current implementation does not establish approved incident
retention, cleanup of expired step-up grant rows, a privacy-request workflow, an exercised
incident drill, real host authorization, or qualified notification decisions.
Those remain release blockers. Self-hosted operators remain responsible for
their own incident evidence.

**Verification:** Migration journal/file validation passes at 67 entries;
static SQL/RLS contract and focused incident validation/authorization/API tests
were added; required-shape rows were updated manually because Drizzle tooling
is unavailable. EN/FR JSON parses and recursive key parity passes; npm audit
policy harness and `git diff --check` pass. Full Vitest, TypeScript, ESLint,
official DB-shape generation, deployed Postgres/RLS tests, and a security drill
remain unverified because dependencies and an authorized host are unavailable.

### Packet 8 — Subprocessors, monitoring, recovery

1. Add a database-backed provider register with provider/service, purpose, data
   categories/subjects, processing regions/transfers, public links, internal
   DPA/security-review fields, active/effective state, notes, and public notes.
2. Populate only providers confirmed in the customer deployment. Audit add,
   edit, activate/deactivate, and publication. Project only approved fields to
   the public localized page and link it from Trust and DPA.
3. Inventory host signals for uptime/5xx, database and migration gate, scheduled
   job failures, backup failures, email/storage/scanner failures, and unusual
   authentication. Assign each signal an operator, threshold, runbook, and
   escalation route.
4. Verify external monitoring data scrubbing. Add monitoring providers to the
   subprocessor registry when personal information may reach them.
5. Configure alert delivery and test it. Perform a database and attachment
   restore exercise; record measured recovery time/point and problems before
   setting customer-facing recovery objectives.
6. Expand hosted readiness so a customer profile cannot be marked ready with
   memory-backed customer records, missing RLS/limited runtime DB role,
   unverified migration contract, missing upload scan/storage config, missing
   required MFA, or untested backup/alert setup.

**Acceptance:** Register matches deployed services; internal fields do not leak;
test alerts arrive; restore succeeds; readiness reports unmet required controls.

**Implementation slice — 2026-09-27:** Added migration `0069_subprocessor_registry.sql`
with separate restricted internal records, a minimal public projection, and
append-only audit evidence. RLS uses the existing MFA-aware platform-admin
policy; public reads are limited to active projection rows. Insert/update
policies and a row-locking trigger require approved disclosure and exact field
agreement with the reviewed record, including during concurrent edits. Site
admins use `/app/site-admin/subprocessors`; the public localized page is
`/trust/subprocessors`. Editing resets approval and removes the projection;
publication requires a platform administrator distinct from the record creator
and latest editor plus an explicit disclosure attestation. EN/FR copy, sitemap metadata, Security-page link, axe
smoke route, `/updates`, operator guidance, and a session knowledge note were
added. Purpose, data categories, data subjects, and optional public notes are
stored bilingually, and the public route displays the requested locale. No
vendors are seeded. Static syntax, journal, shape-presence, locale-key,
audit-policy, and diff checks pass. Vitest, typecheck, lint, official Drizzle
generation, and live Postgres RLS verification remain pending without installed
dependencies/database. Production provider inventory and DPA/legal review
remain required before publication.

**Second-admin review control follow-through — 2026-09-27:** The review handler
is mounted at `POST /api/site-admin/subprocessors/[id]`; the Site Admin panel
previously targeted a nonexistent `/[id]/review` route. The panel now posts to
the actual route and preserves the exact approval/rejection choices while the
reviewer completes fresh MFA. The endpoint challenges before provider lookup,
requires durable general audit in hosted customer mode, records a correlated
intent event before the RLS transaction, preserves the existing distinct-admin
check, and appends the review event atomically with the row change. A correlated
result event is required before success; an uncertain result or failed refresh
locks further changes until the registry is reloaded. No reviewer-entered
free-text is written to general audit metadata. Direct route cases are authored;
Vitest, live RLS/audit checks, provider verification, and DPA/legal review
remain outstanding. See
[`session-knowledge-2026-09-27-subprocessor-review-step-up.md`](audit/session-knowledge-2026-09-27-subprocessor-review-step-up.md).

**Publication control follow-through — 2026-09-27:** Publishing or withdrawing
a provider projection now requires a same-request fresh MFA challenge after
Site Admin authorization and before the provider row is read. Hosted customer
mode refuses the operation unless `AUDIT_DB_BACKEND=postgres`. A correlated
access-intent event must append before the RLS transaction changes the public
projection; the transaction records its allow-listed before/after projection;
and the response is withheld if the correlated result event fails. The
localized admin panel preserves the exact provider/action for challenge
completion and requires a status reload after an uncertain outcome. Provider
inventory, legal review, generated shape, and deployed RLS/audit behavior
remain pending. See
[`session-knowledge-2026-09-27-subprocessor-publish-step-up.md`](audit/session-knowledge-2026-09-27-subprocessor-publish-step-up.md).

### Packet 9 — Security and accessibility assurance

1. Make lockfile-aware dependency scanning an enforced CI gate at agreed
   severity. Critical blocks. High blocks unless an approved exception records
   identifier, rationale, owner, expiry/review date, and compensating action.
   Lower findings become tracked work.
2. Add dependency update automation, secret scanning, security static analysis,
   image scanning for production Docker images, and a baseline DAST scan only
   against safe staging. Keep scan results and exceptions reviewable; do not
   mask non-zero scanner results.
3. Add axe to representative Playwright routes: Home, Create, Utilities, Learn,
   Privacy, Terms, Trust, Accessibility, Login, invite activation, dashboard,
   Portal, grievance, account settings, MFA, Site Admin documents, and dialogs.
   Exercise EN/FR and authenticated roles where feasible.
4. Add a manual checklist for keyboard-only flows, focus visibility/order,
   dialogs, screen reader labels/status, contrast, zoom/reflow, touch targets,
   mobile, language changes, and legal policy reading/printing.
5. Keep WCAG 2.2 AA as internal target for new changes. Record assessment
   scope and known barriers; publish conformance wording only after evidence.

The blank [manual assessment worksheet](audit/accessibility-manual-review-checklist.md)
records build, locale, assistive technology, routes, findings, remediation, and
retest evidence. All rows begin Not assessed; the template is not evidence that
any manual review has occurred.

**Acceptance:** CI blocks the chosen critical/high policy, expiring exceptions
are visible, secret scans and scans of every deployable image run before
publication/deployment, a reviewed synthetic-data staging target receives its
scheduled passive baseline scan, and automated plus manual accessibility
evidence exists for the agreed matrix. A scheduled workflow skip is not scan
evidence.

**Implementation slice — 2026-09-27:** The existing CI dependency audit is now
blocking. `scripts/check-npm-audit.mjs` always blocks critical findings and
requires each high advisory to have an exact package/advisory entry in
`.github/security/npm-audit-exceptions.json`, with a named approver, rationale,
and expiry date. The registry is empty by default. Moderate/low findings do not
block this gate and are summarized in the job output; a separate tracked-work
process is still needed. Weekly npm auditing and npm/GitHub Actions Dependabot
updates are configured below. At the time of this dependency-only slice, secret
scanning, container scanning, safe-staging DAST, and accessibility matrix
expansion were open. Later scanner wiring is recorded in the follow-through
below. Exception entries currently rely on review discipline; the repository
does not yet enforce who may approve them or require a compensating-action
field.

**Scheduled dependency follow-through — 2026-09-27:** Added a weekly npm audit
workflow that runs the same severity/exception evaluator used by PR CI and
uploads the complete npm report for 30 days. Added weekly Dependabot updates for
the npm lockfile and GitHub Actions. The workflow is manual-dispatchable and
does not suppress audit failures. Local YAML/schema checks pass; a hosted
scheduled run, artifact review, and actual Dependabot PR behavior are pending.
At that point this closed only scheduled dependency monitoring; secret
scanning, image scanning, safe-staging DAST, broader accessibility journeys,
and manual review remained open. Added `scripts/check-security-workflows.mjs` to PR CI so the direct
  and externally confirmed deployment readiness conditions, scheduled report
  artifact, and both weekly Dependabot ecosystems remain present.

**Deployment dependency correction — 2026-09-27:** Review showed that the
blocking `npm audit` lived in `test-and-build`, while `deploy` depended only on
`docker-image`. A failing security audit therefore did not prevent image
publication or the CI deploy job from running. Moved dependency scanning to a
standalone `security-audit` job. Docker image publication waits for it; deploy
requires `docker-image`, `test-and-build`, and `security-audit`, with explicit
success conditions for the latter two on both push and manual dispatch. The
workflow contract test checks audit contents and these job dependencies. Image
build remains parallel with E2E/test work but starts after the audit. This does
not govern a separate CapRover Git/webhook deploy, which is an unresolved
host-level release gate. Static workflow contract passes; GitHub-hosted
workflow validation and an observed failing-audit publication/deployment test
remain pending.

**Secret and image scan follow-through — 2026-09-27:** Added a digest-pinned
Gitleaks CLI job that checks all fetched Git refs and redacts secret values in
logs. Demo image publication now waits for a CRITICAL/HIGH Trivy scan of the
Docker-built image. The separate production configuration is built locally,
scanned, and only then pushed as `:production`. Manual dispatch pulls and scans
the selected GHCR tag before the deploy condition can pass, closing the prior
prebuilt-tag skip path. Both push and manual-dispatch flows pass the exact
registry digest that Trivy scanned through to CapRover, avoiding a second
mutable-tag lookup at deploy time. Scan JSON reports are retained for 30 days
when generated. The workflow checker asserts scanner pins, severity/exit
behavior, pre-publish ordering, digest handoff, and the dispatch gate. Node
contract tests, PyYAML parsing and job-graph inspection, and `git diff --check`
pass. This host's Docker Engine is unavailable, so the Gitleaks and Trivy tools could not run locally; GitHub
Actions must produce and review the first reports. These checks do not cover
CapRover's independent Git/webhook deployment route; disable or gate that path
before launch. Safe-staging DAST and static analysis remain open.

**CodeQL static analysis — 2026-09-27:** Added `.github/workflows/codeql.yml`
for the extended JavaScript/TypeScript query suite on pull requests, pushes to
`main`, weekly schedule, and manual dispatch. It publishes results to GitHub
code scanning using the current CodeQL Action release. Repository visibility
was verified as public, which makes GitHub code scanning available without a
private-repository Code Security entitlement. The workflow contract checks the
event schedule, language, query suite, permissions, and action version. Local
workflow validation passes; no hosted CodeQL run or findings review
exists yet. CodeQL alerts do not by themselves prove branch protection rejects
unreviewed findings; inspect repository rules and set severity/triage policy
before using this as a release gate. A ZAP baseline workflow is now configured
with a hostname allowlist and explicit skip behavior, but no staging origin has
been approved/configured and no DAST scan has run; additional static analysis
remains open. See
[`session-knowledge-2026-09-27-dast-staging.md`](audit/session-knowledge-2026-09-27-dast-staging.md).

**Safe-staging DAST follow-through — 2026-09-27:** Added a weekly/manual ZAP
baseline workflow and a Node-only target validator. It requires a root HTTPS
origin whose exact hostname appears in `.github/security/dast-staging-hosts.json`;
it rejects the production apex/`www`, IP literals, localhost, custom ports,
credentials, query/fragment, subpaths, and unapproved hosts. When
`DAST_STAGING_URL` is absent, the workflow records **no scan ran** in the step
summary and skips the scanner. The ZAP action is report-only on findings,
disables automatic issue creation, and retains its report artifact. The
allowlist is intentionally empty because no verified staging host was found in
the repository/operator documentation. The workflow checker, DAST target
policy cases, YAML/job-gating checks, npm audit harness, and whitespace check
pass. This config is not DAST evidence; provision an isolated staging host
containing synthetic data, approve its hostname, configure the repo variable,
then review the first report. The baseline scan covers unauthenticated public
routes only.

The existing public accessibility smoke now includes axe checks for Privacy,
Security, Accessibility, and Trust/subprocessor pages in EN and FR. These
policy checks cover serious and critical structural/name/role findings; the
helper disables color contrast for them. Contrast-enabled checks remain for
selected public shell pages. Manual keyboard, focus, screen-reader, zoom, and
policy-print review remains required.

**Localized journey follow-through — 2026-09-27:** Expanded the default smoke
matrix to scan Home, Create, Utilities, and Learn in both locales; public policy
and Trust pages in both locales; Hub login and invite-error states in both
locales; dashboard, grievance, and profile pages in both locales, with time
administration and MFA setup also represented; and the member Portal's Together
page in both locales. Existing English mobile Hub scans remain. Public catalog scans include
contrast; the other added routes use serious/critical axe checks with contrast
disabled by the shared helper. The invite case covers the invalid-token error
state, not successful acceptance. No demo platform-admin identity exists, so
Site Admin document flows remain unscanned rather than weakening that boundary.
The worktree lacks `node_modules`, so these Playwright cases and axe rules have
not been executed here. Keyboard, focus, assistive-technology, zoom/reflow,
touch-target, and print checks still require manual evidence.

### Packet 10 — Procurement pack and staged customer pilot

1. Build a customer evidence pack from approved public docs and evidence
   register: security overview, architecture/data-flow, hosting responsibility,
   subprocessor register, data region, retention/deletion, privacy contact,
   incident response summary, accessibility assessment, availability/support
   terms, DPA schedules, and questionnaire answers.
2. Commission an independent security review/penetration test of the actual
   hosted customer profile. Record findings; resolve and retest critical/high
   findings before pilot. Do not claim unearned SOC 2, ISO, or other assurance.
3. Replace launch-critical placeholders with approved EN/FR versions and verify
   effective links, version acceptance, contacts, and customer party binding.
4. Run unit/integration/E2E, migration integrity, fresh/upgrade DB deployment,
   RLS/tenant isolation, direct API authorization, upload/scanner failure,
   audit secret-scrub, agreement/consent/unsubscribe, MFA/recovery, retention
   dry-run, incident access, accessibility, vulnerability scans, and
   bilingual route checks.
5. Perform restore and incident exercises on the target production-like stack.
   Confirm all operators know the on-call/contact and how to stop writes or
   isolate a tenant.
6. Admit a bounded pilot. Review real alert noise, support intake, mail bounce
   handling, acceptance completion, MFA enrollment, durability, and open
   findings. Resolve pilot blockers before expansion.
7. Publish a final report of implemented controls, migrations/routes/admin
   tools/jobs, test and scan results, exceptions, production configuration,
   legal approvals, remaining placeholders, deferred gaps, and manual launch
   steps. Update `docs/PROGRESS.md` and public `/updates` for user-facing work.

**Acceptance:** No live sensitive data before the release gate; the pilot has a
signed evidence pack, approved documents, passed control checks, and a recorded
operator decision to expand.

## Cross-cutting implementation and verification rules

- Use existing localized App Router and `/app/site-admin/*` conventions; the
  source brief's `/admin/*` paths map to this platform's site-admin surface.
- APIs are outside the proxy matcher and must enforce auth/role/MFA themselves.
  Test denied requests directly, not only hidden UI.
- Keep agreement, consent, incident, audit, and provider evidence durable in
  Postgres for hosted customers. Use union/local scoping and RLS where the data
  is tenant-owned; platform incident records require separate platform-admin
  protection.
- Append only Drizzle migrations. Use the owner migration URL and restricted
  runtime `DATABASE_URL`; preserve the ADR-020 generated schema/RLS boot gate.
- Treat storage, scanner, monitoring, mail, and backup configuration as
  environment facts. Do not claim encryption or residency from application
  intent alone.
- For each policy claim, retain a control owner, exact test/operational evidence,
  evidence date, and review date.
- Required failure scenarios include expired/single-use tokens, replay, retry,
  concurrency, missing DB/storage/provider config, cross-union/local access,
  stale sessions, held records, and external provider failure.

## Decisions and constraints

- Hosted customer readiness is the release gate. Self-host operators receive
  setup and verification guidance; UnionOps cannot attest to their operation.
- Product news is for voluntarily subscribed individuals. Do not ingest Hub,
  Portal, feedback, support, or union member rosters.
- A contract customer may be a union or a local. The accepting administrator is
  distinct from the contracting party.
- PIPEDA/privacy applicability and final wording vary by facts and customer.
  Legal reviewers approve the policy and schedule; no universal retention
  period or unsupported legal deadline is encoded here.
- Internal accessibility target is WCAG 2.2 AA. Do not claim conformance until
  the scoped site has been assessed. Ontario AODA requirements depend on the
  organization and site context.
- Preserve the ADR-020 forward-only Drizzle migration/deploy contract and the
  multi-union authorization/RLS rules.
- Recovery codes contain 80 random bits, are shown only once, and persist only
  SHA-256 hashes. They are account-owned rather than tenant-owned and use a
  `current_user_id` RLS policy. A fresh TOTP challenge is required to replace a
  set; rotation invalidates prior codes and increments the account session
  version. TOTP replay counters, MFA session grants, and challenge windows have
  durable hosted source paths in migrations `0071`–`0073`. Deployment and
  cross-replica RLS evidence remain pending. Pending enrollment remains
  process-memory-backed, and TOTP-secret encryption is not implemented.
- High-impact authority changes use a fresh challenge in the same API request
  as the mutation. No reusable cross-action step-up token is issued; this keeps
  the verified factor bound to the operation whose audit event receives that
  request ID.
- Public subprocessor publication and withdrawal are high-impact disclosure
  actions: require a same-request fresh challenge, durable hosted audit, a
  pre-change access event, and a transactional append-only projection event.
  If final correlated audit cannot be confirmed, the UI reloads live state
  before another publication attempt.
- Second-admin approval/rejection is also a high-impact disclosure decision.
  Keep its API path aligned with the Site Admin client; require a fresh
  same-request challenge and durable hosted intent/result audit, preserve the
  distinct-reviewer rule, and make uncertain outcomes reload-only.
- Never claim SOC 2/ISO certification, full encryption, or zero knowledge
  without substantiated evidence.
- Each steward-facing release includes `/updates` and `docs/PROGRESS.md`.

## Deferred work and blockers

- **Worktree reconciliation:** Managed Documents and the preserved hardening
  work are integrated at `3da2503e`; migration IDs are sequenced `0064`–`0074`
  and generated DB shape/journal checks pass. The original `main` worktree
  remains at `2c6f4225`; do not copy migrations between it and this integrated
  branch without reconciling the journal, generated DB contract, and ADR-020
  boot gate.
- Legal wording, customer agreement allocation, retention periods, and breach
  decisions require the qualified reviewers identified in Packet 2.
- Independent penetration testing and production backup/restore drills require
  an approved staging/host environment and accountable operator.

## Change log

- 2026-09-27: Fetched and verified Managed Documents merge at `origin/main`
  `7e3d42ea` in a clean managed worktree. Added acceptance scope enforcement,
  authority attestation, request/source evidence, immutable database trigger,
  RLS insert checks, and migration `0067`; legacy rows remain explicitly
  unverified and are not retroactively attested. Fixed merged-source type errors,
  added bilingual host-readiness and Managed Documents SEO entries, and corrected
  the PIPEDA and retention language. Generated the ADR-020 DB shape; `db:check`,
  typecheck, changed-file lint, and 83 focused regression tests pass. No
  PostgreSQL runtime or target-host proof yet. Remaining gaps include
  action-bound document publication step-up, stable policy routes, legal
  approval, and retention schedule. See
  [`session-knowledge-2026-09-27-managed-documents-source-audit.md`](audit/session-knowledge-2026-09-27-managed-documents-source-audit.md).

- 2026-09-27: Fixed the subprocessor review client to call the actual
  `/api/site-admin/subprocessors/[id]` POST route (the prior `/review` path had
  no handler). Approval/rejection now requires fresh MFA before provider
  lookup, checks durable audit in hosted mode, records correlated intent/result
  events, and retains the existing second-admin approval constraint. The EN/FR
  UI preserves the review decision and requires a reload after uncertain
  outcomes. Direct route cases were added; project test/typecheck and deployed
  RLS/audit verification remain unavailable. See
  [`session-knowledge-2026-09-27-subprocessor-review-step-up.md`](audit/session-knowledge-2026-09-27-subprocessor-review-step-up.md).

- 2026-09-27: Added fresh-MFA and correlated audit gates to subprocessor
  publication/withdrawal. Hosted customer mode refuses this operation when
  the general audit backend is not PostgreSQL. The safe projection and its
  before/after register event remain in the same RLS transaction; uncertain
  results force a register reload in the EN/FR Site Admin UI. Direct route
  cases cover challenge-before-query, strict input, durable audit requirement,
  pre-audit failure, publish/withdraw, second-review enforcement, and
  post-transaction audit failure. Vitest, typecheck, and deployed RLS/audit
  verification remain pending. See
  [`session-knowledge-2026-09-27-subprocessor-publish-step-up.md`](audit/session-knowledge-2026-09-27-subprocessor-publish-step-up.md).

- 2026-09-27: Added fresh MFA verification to the Site Admin Hub-role mutation
  API. The route stops before role writes on missing, invalid, throttled, or
  unavailable challenges, fails closed if hosted production TOTP is not
  configured, and correlates denied/successful outcomes without storing the
  code. The bilingual account-support form reveals its MFA prompt only when
  the server requests it; the existing Hub MFA What's New item now mentions
  role changes. Focused route cases were added, but Vitest and live-host
  verification remain unavailable. See
  [`session-knowledge-2026-09-27-role-change-step-up.md`](audit/session-knowledge-2026-09-27-role-change-step-up.md).
- 2026-09-27: Added same-request fresh MFA step-up to officer-assignment and
  delegation-grant/revocation APIs after tenant authorization and before
  database writes. The organization form preserves the pending change, shows
  its target, and collects a one-time code with bilingual error states. Denied
  and successful outcomes carry a server-generated request ID; direct API and
  success-correlation cases were added for all four endpoints. Other high-impact actions remain in
  Packet 6. Full tests and deployed RLS/host evidence are unavailable. See
  [`session-knowledge-2026-09-27-org-authority-step-up.md`](audit/session-knowledge-2026-09-27-org-authority-step-up.md).
- 2026-09-27: Added audit outcome and request-correlation fields in migration
  `0074_audit_outcome_request_correlation.sql`. Historical outcomes remain
  unknown; new rows default to success. The app role can append but not update
  or delete audit rows. MFA verification/recovery rotation and the operator
  audit-list endpoint use server-generated correlation IDs; broad route
  coverage and deployed DB/RLS proof remain open. The request ID constraint
  enforces canonical UUID shape. Updated the audit views,
  RLS-smoke source, denial-path correlation assertions, retention inventory,
  and session knowledge. The migration
  journal, four npm audit-policy checks, shape inspection, and diff checks pass.
  Unit tests, TypeScript, generated shape, and live database checks remain
  unavailable in this checkout.
- 2026-09-27: Added the Packet 8 subprocessor register on migration `0065`:
  restricted internal inventory, public-only projection, append-only access and
  change events, MFA-aware platform-admin RLS, and a DB trigger that enforces
  approved disclosures match the reviewed active provider row. Public descriptive
  fields are stored bilingually and rendered in the requested locale. Added site-admin
  record/review/publish UI, `/trust/subprocessors`, EN/FR copy and metadata,
  Security link, axe smoke, and operator knowledge. No providers are seeded or
  published. Static syntax/journal/shape/locale/audit-policy checks pass; full
  project suites, official Drizzle generation, live DB/RLS verification,
  provider inventory, and legal review remain pending.
- 2026-09-27: Added the Packet 7 restricted platform incident register on
  migration `0066`: site-admin page and APIs require Postgres-backed accounts,
  MFA-aware platform-admin RLS, fresh TOTP challenges, and one-use
  action/resource-bound step-up grants; failed challenges are capped at five
  per actor per 15 minutes and metadata-audited. Incident records cannot be
  deleted by the app role; audit rows are append-only; JSON export is audited.
  Added bilingual UI, field validation, direct API boundary and RLS tests, and
  the incident session note. Journal and static checks pass. Full tests,
  official shape generation, deployed RLS verification, retention approval,
  privacy-request workflow, and incident drill remain pending. TOTP replay
  prevention now has a durable source implementation; live RLS verification
  and expired-grant cleanup remain follow-up gaps.
- 2026-09-27: Extended hosted customer readiness to require explicit/reviewed
  attachment storage, strict fail-closed scanning with a recent test, and
  named/date-stamped backup restore and alert delivery attestations. Evidence
  expires after 90 days as a provisional internal operating target. The health
  endpoint exposes only pass/fail booleans on requests carrying the dedicated
  operator bearer secret; public health omits these fields. The site-admin view
  labels them operator-attested and explains that it cannot independently prove
  provider behavior. The CI post-deploy gate now enforces these controls only
  when hosted customer mode is active; evaluation/self-hosted checks remain
  advisory. EN/FR UI/copy and `/updates` were added. Configuration/evidence
  unit tests are present but could not run without installed project packages;
  scanner, backups, alert delivery, and host storage remain unverified. The
  separate subprocessor registry is now implemented with no seeded providers;
  the missing Managed Documents foundation remains a sync blocker and is not
  duplicated.
- 2026-09-27: Repaired the post-deploy host-readiness gate in `.github/workflows/ci.yml`: fixed its malformed indentation and included deployments confirmed via `/api/health` when CI does not have CapRover image-deploy credentials. Local YAML parsing confirms the step is in the `deploy` job after the deployment smoke; GitHub Actions validation remains pending.
- 2026-09-27: Added a weekly scheduled npm audit using the same critical/high exception policy as PR CI, retained the full audit JSON as a 30-day Actions artifact, and configured weekly Dependabot updates for npm dependencies and GitHub Actions. Static workflow/config parsing passes; no hosted schedule run or update PR has yet supplied operating evidence.
- 2026-09-27: Added the Node-only `check-security-workflows` PR check for deployment readiness conditions, audit artifact retention, and weekly update ecosystems. The host readiness gate now also covers deployments confirmed externally through `/api/health`; YAML structure and ordering checks pass locally.
- 2026-09-27: Added full-history redacted secret scanning and blocking CRITICAL/HIGH scans of demo, production-configured, and manually selected deploy images. Retained scan reports for 30 days when generated and extended the workflow contract to check gates and ordering. Local static validation passes; Docker is unavailable here and the initial hosted scans/reports remain unverified.
- 2026-09-27: Added scheduled and PR/push GitHub CodeQL analysis using the extended JavaScript/TypeScript suite. The repository is publicly visible; GitHub documents code scanning for public repositories. Workflow contract checks the scan configuration. No hosted result or branch-protection evidence exists; alerts are reviewable but not presumed blocking.
- 2026-09-27: Created initial fit-gap, claim, evidence, and packet registers.
  Verified current local commit and key app/CI/auth/email facts. Corrected the
  universal PIPEDA 72-hour claim and seven-year retention assertion in
  `docs/COMPLIANCE.md`; hosting guide wording also corrected. Managed Documents
  could not be inspected because merged code is not present and remote access
  failed.
- 2026-09-27: Added `UNIONOPS_HOSTED_CUSTOMER_MODE` so protected privileged Hub
  access requires production TOTP in UnionOps-operated customer mode, even if
  `AUTH_MFA_ENABLED` is unset or false. Health reports the profile and resolved
  MFA mode; host readiness blocks when TOTP is not active. The initial global
  enrollment behavior was subsequently narrowed to the current role/capability
  map below. Added focused policy, health, and readiness tests. Tests could not
  run because this checkout has no installed npm dependencies and registry
  access is unavailable. Recovery codes, step-up challenges, and
  encryption/storage review remain open.
- 2026-09-27: Expanded this file into the detailed ten-packet implementation
  sequence with acceptance criteria, test scenarios, dependencies, and operating
  gates. Corrected the current hosted security guide's stale Portal memory-only
  description after verifying the Postgres Portal adapter in the repository.
- 2026-09-27: Made the CI npm audit gate blocking. Added exact advisory-scoped,
  expiring high-severity exceptions and a small Node assertion suite. Local Node
  tests and a clean audit fixture pass; full CI audit remains unverified because
  dependencies and registry access are unavailable. Moderate/low tracking,
  secret/image/staging scans, and exception approver governance remain open.
- 2026-09-27: Added EN/FR axe smoke for the current Privacy, Security, and
  Accessibility pages. Full Playwright execution is pending dependency install;
  these scans do not establish a WCAG conformance claim.
- 2026-09-27: Replaced the hosted all-account MFA enrollment behavior with a
  shared server/client requirement and role-to-capability map. Basic local
  members no longer require enrollment; all current privileged/sensitive roles
  do. Direct capability decisions now enforce MFA for active assignments and
  delegations. Grant/revoke changes invalidate recipient sessions, and the
  status endpoint resolves current authority for enrollment. MFA grants are
  bound to session versions and rejected after role changes. Full route/RLS
  inventory and test execution remain open.
- 2026-09-27: Added the EN/FR `/updates` note describing hosted privileged MFA
  behavior without claiming full enterprise readiness or certification.
- 2026-09-27: Added the `mfa_recovery_codes` forward migration, required-shape
  entry, and account-scoped MFA recovery service. TOTP enrollment now returns
  ten high-entropy one-time codes; only hashes are stored, recovery use is
  atomic and single-use, and replacement requires a fresh TOTP challenge.
  Enrollment/rotation increments `session_version`. Added localized display,
  remaining-count, and replacement controls plus focused service/route tests.
  Full test execution, migration-contract generation against Drizzle, deployed
  Postgres verification, enrollment-store durability, durable MFA grants, and
  TOTP secret protection still need evidence. The standalone journal/file
  check passes with 65 entries; the npm audit policy harness passes; syntax,
  locale JSON, required-shape presence, and diff checks pass. Full Vitest and
  Drizzle contract generation are unavailable because `vitest`/`tsx` are not
  installed and package access failed.
- 2026-09-27: Added a source-backed data-class/storage/lifecycle inventory for
  Packet 7; corrected stale seven-year grievance/time/Portal retention claims,
  removed the unapproved 24-month feedback default, and documented that legal
  holds and central purge are not implemented. No general deletion schedule
  was inferred; the applicable PIPEDA breach-record requirement is recorded
  conditionally. Customer/privacy/legal approval and
  host evidence remain release dependencies.
- 2026-09-27: Revalidated the older Portal security audit and live hardening
  guide against current Postgres/RLS and hosted-MFA code; marked historical
  production observations as dated, corrected obsolete “when Postgres lands”
  and go-live wording, and updated EN/FR host-readiness and Security copy for
  the customer-profile TOTP rule. Added the conditional PIPEDA breach-record
  schedule (24 months from determination) while leaving general incident
  retention to approval. Updated current EN/FR Security claims to qualify MFA
  by hosting model, data isolation by deployment verification, and Portal
  durability/encryption by host configuration.
- 2026-09-27: Added the hosted MFA session-grant path on migration `0068`.
  Postgres stores one SHA-256 nonce digest per account; the Auth.js JWT callback
  consumes it atomically and fails closed on storage errors. RLS/source tests
  and a rolled-back live smoke case are present; generated contract, deployed
  migration, concurrent host validation, pending-enrollment persistence, and
  TOTP-secret key management remain open.
- 2026-09-27: Added a shared per-account MFA challenge limit on migration
  `0069`. Hosted attempts use one conditional Postgres upsert within a
  15-minute window; ten total submissions, including successful verification,
  are allowed per account. Recovery-code submissions reserve one slot, and
  callers fail closed without durable hosted storage. RLS/contract and rollback
  smoke coverage were added. Source syntax and migration/shape checks pass;
  Vitest, typecheck, official shape generation, and live Postgres verification
  remain unavailable here. The threshold is an internal default pending
  security/usability review.
- 2026-09-27: Added fresh MFA step-up to the sensitive expense export route.
  Spreadsheet/PDF/receipt ZIP downloads now use POST, validate tenant access
  before challenge, and require a confirmed success audit before returning
  bytes. The old GET path returns 405. Added correlated route cases and a
  bilingual pending-export challenge form. Static syntax, locale, migration,
  workflow-contract, and diff checks pass; Vitest, typecheck, and target-host
  audit/RLS verification remain unavailable. See
  [`session-knowledge-2026-09-27-expense-export-step-up.md`](audit/session-knowledge-2026-09-27-expense-export-step-up.md).
- 2026-09-27: Added fresh MFA step-up to payroll export after active local
  profile authorization and before approved rows are loaded or sent to the
  configured webhook. A correlated pre-dispatch audit now stops webhook sends
  during audit outages; the post-dispatch audit warns users not to retry until
  delivery is checked if it fails. Added EN/FR confirmation and failure copy
  plus focused route tests. Static and locale checks pass; Vitest and deployed
  webhook/audit/RLS evidence remain unavailable. See
  [`session-knowledge-2026-09-27-payroll-export-step-up.md`](audit/session-knowledge-2026-09-27-payroll-export-step-up.md).
- 2026-09-27: Moved general Time report CSV/XLSX/PDF downloads to POST, retired
  the query-string GET path, and added filter validation, tenant-scoped list
  filters, pre-read fresh-MFA step-up, correlated audit, and fail-closed file
  delivery. Added an EN/FR resume form that preserves format and date range,
  focused route/integration cases, and updated Time operator guidance. Source
  route/test syntax checks, recursive locale JSON parity, migration journal
  validation (71 entries), audit-policy checks, security-workflow validation,
  and `git diff --check` pass. Vitest and `tsc` are unavailable because this
  checkout has no installed dependencies; browser behavior, deployed TOTP,
  audit durability, and RLS evidence remain unavailable. See
  [`session-knowledge-2026-09-27-time-export-step-up.md`](audit/session-knowledge-2026-09-27-time-export-step-up.md).
- 2026-09-27: Moved Travel XLSX/PDF/receipt ZIP exports to POST and added
  fresh MFA after authorization/scope checks but before advance, claim, or
  receipt reads. A correlated success audit must append before bytes are
  returned; denied/error metadata excludes financial details and receipt
  contents. Added focused API and integration cases, a bilingual resume form,
  and updated hosted security and `/updates` copy. Route/test syntax and
  locale/migration/workflow checks pass; Vitest, `tsc`, browser execution,
  hosted TOTP, durable audit, and target-host RLS remain unverified. See
  [`session-knowledge-2026-09-27-travel-export-step-up.md`](audit/session-knowledge-2026-09-27-travel-export-step-up.md).
- 2026-09-27: Moved Poll results CSV/XLSX exports to POST and added fresh MFA
  after poll tenant scope succeeds but before aggregate/free-text answer reads.
  The correlated success audit must append before bytes are returned; legacy
  GET returns 405. Added an EN/FR challenge/resume form and route/integration
  cases, and updated the hosted MFA `/updates` item. Syntax, locale, migration,
  and workflow checks pass; Vitest, TypeScript, browser, hosted TOTP/audit, and
  target-host RLS verification remain unavailable. See
  [`session-knowledge-2026-09-27-poll-export-step-up.md`](audit/session-knowledge-2026-09-27-poll-export-step-up.md).
- 2026-09-27: Moved meeting RSVP roster CSV exports to POST and added fresh
  MFA after union/local meeting scope checks but before attendee rows are read.
  The success audit must append before CSV bytes are returned; the old GET
  path returns 405. Added the localized resume form, route tests, hosted-MFA
  `/updates` copy, and operating notes. Syntax, locale, migration, workflow,
  and whitespace checks pass; Vitest, TypeScript, browser, and deployed
  MFA/audit/RLS verification remain unavailable. See
  [`session-knowledge-2026-09-27-rsvp-export-step-up.md`](audit/session-knowledge-2026-09-27-rsvp-export-step-up.md).
- 2026-09-27: Hardened Site Admin forced password-reset delivery. The route
  now challenges with fresh MFA, requires a correlated audit before token
  creation and email dispatch, records delivery outcome, and never returns the
  reset token or target email address. The account-support UI resumes the
  action and warns against blind retry when delivery is uncertain. Direct route
  cases cover step-up, audit failures, archived targets, email failure, and
  token/address redaction. Static route syntax and locale checks pass; Vitest,
  TypeScript, browser, hosted TOTP, and durable audit evidence remain pending.
  See [`session-knowledge-2026-09-27-password-reset-step-up.md`](audit/session-knowledge-2026-09-27-password-reset-step-up.md).
- 2026-09-27: Added fresh MFA step-up to cross-union/local Site Admin account
  assignment. A correlated authorization event must append before the
  membership helper runs; the result event records membership ID and coarse
  create/replace counts without account PII. If result evidence fails after
  the write, the API and UI tell the operator to inspect the account before
  retrying. EN/FR copy and direct cases cover denial, authorization-audit
  outage, single-local conflict, success, and result-audit uncertainty. Static
  route syntax and locale checks pass; Vitest, TypeScript, browser, and hosted
  Postgres/TOTP/audit verification remain pending. See
  [`session-knowledge-2026-09-27-site-admin-assignment-step-up.md`](audit/session-knowledge-2026-09-27-site-admin-assignment-step-up.md).
- 2026-09-27: Added fresh MFA to Site Admin local archive and restore before
  target lookup. A correlated authorization audit is required before mutation;
  the result audit is separate, and DB/write or audit uncertainty directs the
  operator to reload and inspect before retrying. Added localized resume and
  recovery controls plus direct tests for both actions. Route syntax, locale,
  migration, workflow, and whitespace checks pass; Vitest, typecheck, browser,
  and deployed TOTP/audit/RLS evidence remain pending. See
  [`session-knowledge-2026-09-27-local-lifecycle-step-up.md`](audit/session-knowledge-2026-09-27-local-lifecycle-step-up.md).
- 2026-09-27: Added fresh MFA to the union membership-policy PATCH before
  union/member impact reads. Intent audit now precedes the scoped aggregate
  and policy update; result audit follows. The bilingual form preserves the
  selected policy during challenge and requires a settings reload after an
  uncertain result. Direct tests cover validation/challenge order, audit
  failure, success, and uncertain writes. Syntax, locale, migration-journal,
  workflow, and whitespace checks pass; Vitest, TypeScript, browser, and
  deployed TOTP/audit/RLS evidence remain pending. See
  [`session-knowledge-2026-09-27-membership-policy-step-up.md`](audit/session-knowledge-2026-09-27-membership-policy-step-up.md).
- 2026-09-27: Moved cross-tenant Site Admin audit-log access from GET to a
  strict POST and require fresh MFA before querying. A correlated intent audit
  must append before the owner/runtime audit query and a result event must
  append before rows are returned. Updated the operator page with an EN/FR
  challenge/retry flow and added direct route cases for denial, ordering,
  withholding on audit failure, and GET retirement. Static route syntax,
  locale, migration-journal, workflow, and whitespace checks pass; Vitest,
  TypeScript, browser, owner-DB least-privilege, and deployed RLS/audit evidence
  remain pending. See
  [`session-knowledge-2026-09-27-site-admin-audit-step-up.md`](audit/session-knowledge-2026-09-27-site-admin-audit-step-up.md).
- 2026-09-27: Disabled Demo Cleanup UI and preview/purge APIs for the hosted
  customer profile even when the demo feature flag is set; the owner-DB CLI
  independently refuses hosted customer mode before connecting. Added feature
  and route regression cases and updated CapRover operator guidance. Node
  syntax, security-workflow, dependency-audit harness, and whitespace checks
  pass; Vitest and deployed-host verification remain pending. This does not
  implement the planned customer organization deletion workflow. See
  [`session-knowledge-2026-09-27-demo-purge-host-guard.md`](audit/session-knowledge-2026-09-27-demo-purge-host-guard.md).
- 2026-09-27: Site Admin local provisioning now requires fresh MFA before
  local or optional bargaining-unit writes. A server-generated request ID
  correlates the pre-write authorization and result audit; an audit/write
  uncertainty returns a no-blind-retry response in the bilingual local form.
  Direct route cases were added, but Vitest, TypeScript, browser, hosted TOTP,
  durable audit, and target-host RLS checks remain pending. At this point the
  separate access-request provisioning callers remained open; the follow-up
  below closes that source gap. See
  [`session-knowledge-2026-09-27-local-provision-step-up.md`](audit/session-knowledge-2026-09-27-local-provision-step-up.md).
- 2026-09-27: Extended Packet 6 to cover both platform tenant-provisioning
  APIs: union creation (including its optional first local) and local/optional
  bargaining-unit creation. Updated the local form and access-request inbox to
  resume after fresh MFA and prevent blind retry on an uncertain result. Direct
  route tests cover authorization-before-write ordering and audit redaction;
  Node 24 syntax parsing passes, while Vitest, TypeScript type checking,
  browser, and target-host TOTP/audit/RLS checks remain pending. See
  [`session-knowledge-2026-09-27-tenant-provision-step-up.md`](audit/session-knowledge-2026-09-27-tenant-provision-step-up.md).
- 2026-09-27: Closed the alternate union-creation path through
  `/api/tenant` action `create_union`, used by the onboarding wizard. It now
  requires fresh MFA, durable tenant/audit storage in hosted customer mode, a
  correlated authorization audit before creation, and result evidence after.
  The wizard preserves form values for the challenge and blocks retry after an
  uncertain result. Added direct tests for the hosted durability gate and
  audit/write ordering; Node 24 syntax parsing passes, while Vitest, TypeScript
  type checking, browser, and hosted verification remain pending. See
  [`session-knowledge-2026-09-27-tenant-provision-step-up.md`](audit/session-knowledge-2026-09-27-tenant-provision-step-up.md).
- 2026-09-27: Added a hosted-profile guard to both Site Admin tenant-creation
  routes so they require `AUDIT_DB_BACKEND=postgres` in addition to Postgres
  tenant storage. Updated the local form and access-request inbox to show the
  durable-storage failure state. Direct route cases cover this denial; Node 24
  syntax parsing passes, while Vitest/typecheck and deployed audit/RLS checks
  remain pending.
- 2026-09-27: Closed the invite-board union-creation bypass in `POST
  /api/invites` (`newUnionName`). The route now requires fresh MFA and, for the
  hosted customer profile, durable tenant and audit backends; records a
  correlated authorization event before creating the union and a result event
  after the union/invite flow. The EN/FR composers resume after MFA and block
  retry when the result is uncertain or the response is lost; uncertain
  responses withhold the invite token.
  Direct route cases cover the challenge, hosted durability, audit ordering and
  redaction, uncertain result, and existing-union behavior. Node syntax parsing
  and static checks pass; Vitest, typecheck, browser, and target-host
  TOTP/Postgres/RLS/audit evidence remain pending. See
  [`session-knowledge-2026-09-27-tenant-provision-step-up.md`](audit/session-knowledge-2026-09-27-tenant-provision-step-up.md).
- 2026-09-27: Hardened the existing Hub Local Documents Vault separately from
  the missing Managed Documents policy system. Document downloads now use POST
  with fresh MFA, an authorization audit before file reads, and a result audit
  before bytes are returned; the old GET route returns 405. Deletion now
  requires fresh MFA and correlated intent/result evidence. Hosted mode fails
  closed without Postgres document metadata and audit; the bilingual UI resumes
  after challenge and blocks retry after uncertainty or a lost response.
  Focused and integration tests are authored; Node syntax, EN/FR parity,
  workflow/audit/DAST policy, and whitespace checks pass. Vitest, typecheck,
  browser, live storage, and hosted TOTP/Postgres/RLS/audit evidence remain
  pending. See
  [`session-knowledge-2026-09-27-document-file-step-up.md`](audit/session-knowledge-2026-09-27-document-file-step-up.md).
- 2026-09-27: Corrected the legacy compliance standards table so it no longer
  labels Ontario AODA website requirements as WCAG 2.1 AA. The document now
  distinguishes the WCAG 2.0 AA reference for covered Ontario organizations
  from UnionOps's internal WCAG 2.2 AA target; applicability and any
  conformance claim still require a scoped assessment.
- 2026-09-27: Refreshed the retention evidence register to include schema
  changes through migration `0074` and the restricted incident-register source
  added in migration `0070`. Live-host durability, access verification, and the
  required incident drill remain open evidence items.
- 2026-09-27: Hardened grievance, bumping, time-entry, and member-shared
  Portal attachment downloads so a
  correlated authorization audit must append before file bytes are read and a
  delivery event before bytes are returned. Hosted customer mode now fails
  closed unless attachment metadata and audit use Postgres. Direct route tests
  cover event records and an unavailable authorization audit; target-host RLS,
  object-storage, and audit verification remain open.

- 2026-09-27: Integrated the Managed Documents and preserved hardening histories
  at `3da2503e`, retaining migration history through `0074`. Added the bilingual
  `/trust` index, footer entry, locale metadata/sitemap entries, missing public
  provider-register copy, and permanent redirects from legacy policy URLs to
  their managed document routes. `/trust` remains a navigation surface; legal
  approval, provider verification, and claim evidence remain open. EN/FR
  namespace/update checks and whitespace checks pass; Vitest, lint, and
  typecheck are blocked because this checkout has no installed project
  dependencies and network access is unavailable.


### Integration note — prior hardening branch

The pre Managed Documents hardening branch was integrated after the merged document foundation at `3da2503e`. Its migrations are preserved and sequenced as `0068`–`0074` after Managed Documents `0064`–`0066` and acceptance evidence `0067`. The old branch's file actions targeted the former grievance document API; the merged vault uses archive and version-history operations, so those conflicting old endpoint implementations were not transplanted. Fresh MFA step-up for managed-vault download/archive remains a tracked verification item before hosted launch. The compatible hardening code, tests, operating guides, and registers are retained.
