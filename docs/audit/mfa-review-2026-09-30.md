# MFA implementation review — 2026-09-30

Reviewed checkout: `bcb37690`. This document is also the implementation tracker; each phase is committed separately and records its verification evidence and regressions.

## Assessment and limits

The checkout contains multiple concrete failure paths, including regressions introduced during the September 27 UI refactor and September 30 lockout fixes. The original deployment failures are partly repaired in source, but the recovery patches introduced inconsistent persistence and policy behavior. This needs a bounded stabilization pass before additional authentication features.

This is a source/history review. There is no `node_modules` in this checkout, and unit/browser tests were not executed. Production image, configuration, logs, database grants, encryption keys, and replica routing have not been verified. The findings below identify code defects and reproducible conditions, not a proven single cause of the live incident. No production accounts or secrets were changed.

## Existing fixes to preserve and verify on the host

- `6f9bbf19`: timestamp parameters in the attempt-limit upsert use ISO strings rather than raw Date interpolation.
- `6c876cce`: migration `0091` explicitly grants runtime access to pending enrollment, replay, grant, and attempt tables. Verify the actual deployed role and migration tail; source presence alone proves nothing about the host.
- `5fe698f3`: pending enrollment is stored durably, enrollment issues a session grant using the post-change session version, and TOTP secrets can be encrypted with a dedicated key.
- `327a5e92`: synchronous client submit locks prevent auto-submit and Enter from starting duplicate requests on challenge/confirm.
- `de48196d`: verification attempts grant creation before consuming the TOTP counter. Preserve the goal of avoiding a burned code on infrastructure failure, but make the whole operation atomic.

Do not roll back all security work indiscriminately. Preserve encrypted secrets, tenant boundaries, replay protection, current session-version checks, and durable recovery state.

## Findings

### F1 — P1: recovery codes can be shown as saved but can never verify

Evidence: `src/lib/auth/mfa-recovery-codes.ts:109–119,138–154`.

If Postgres recovery rotation fails, the catch creates codes in process memory and returns them as success. With the Postgres backend still enabled, consumption and remaining-count reads exclusively use Postgres. Even the same replica cannot consume the returned fallback codes. Existing durable codes may remain active because the failed rotation rolled back.

Fix: require a committed durable rotation before returning codes in hosted/Postgres mode. Never advertise a successful rotation after an alternate-store write. Keep enrollment and recovery rotation in one transaction, and report storage failure distinctly from bad input.

### F2 — P1: durable MFA failures silently split security state

Evidence: `mfa-totp-counters.ts:51–63`, `mfa-attempt-limits.ts:114–121`, `mfa-grants.ts:90–106`, `mfa-enrollment-store.ts:113–125,154–172`, all under `src/lib/auth`.

Hosted mode checks that Postgres is configured, but catches runtime failures and uses process memory. A grant created on replica A may be unavailable to the session update on B. Replay/attempt state starts independently on each process; a counter already consumed durably can be accepted again during an outage because memory has not tracked it. A failed pending-secret replacement can show QR B while a subsequent healthy database read returns older QR A. Cleared durable pending state can also fall through to stale memory on another replica.

Fix: one authoritative store per deployment. Hosted/production persistence failures must produce a recoverable service error, not process-local success. Retain memory for explicit demo/development mode. Provide narrowly scoped operator recovery rather than weakening normal factor validation during an outage.

### F3 — P1: reset grace contradicts protected-page policy

Evidence: `src/app/api/mfa/status/route.ts:35–52`; `src/lib/auth/mfa-requirements-grace.ts`; `src/lib/auth/mfa-policy.ts:58–73`; `src/app/[locale]/app/mfa/MfaPageClient.tsx:121–131`.

Only the status endpoint uses `sessionRequiresMfaWithGrace`. Protected pages and API session helpers use `sessionMfaOk`, which ignores grace. A reset officer receives “MFA not required” on the challenge page, presses Continue to a protected return path, and is redirected back to the challenge. The client policy provider also derives privileged-role requirements without consulting grace.

Fix: represent recovery/setup-only access explicitly and consistently. During reset, direct users to setup with the original destination retained; do not label them exempt or verified. Keep confidential modules protected. If broader grace is a deliberate product policy, it requires one shared server authorization contract and explicit scope tests, not a status-only exception.

### F4 — P1: concurrent verification can destroy the successful request's grant

Evidence: `src/app/api/mfa/verify/route.ts:144–215,246–295`; `src/lib/auth/mfa-grants.ts:78–86`.

Grant storage has one row per account. Two requests for the same TOTP can issue grants A and B before replay consumption. B overwrites A; one request consumes the counter successfully, while the other fails and burns its grant. A success response can consequently contain a nonce that no longer exists. An invalid recovery submission also creates/replaces a grant before its factor is checked. Browser submit locks do not protect separate tabs, devices, retries, or direct API requests.

Fix: serialize factor consumption and grant issuance in a single account-scoped transaction. Either retain the one-outstanding-grant policy with explicit retry handling or use bounded grants keyed by independent challenge/session identifiers. Failed factor checks must not invalidate an unrelated successful handoff.

### F5 — P1: enrollment is a partial-commit workflow without single-use confirmation

Evidence: `src/app/api/mfa/enroll/confirm/route.ts:52–54,100–124`; `src/lib/auth/mfa-user-secret.ts:110–137`; `src/app/[locale]/app/mfa/setup/MfaSetupPageClient.tsx:190–207`.

Confirmed secret/counter, grace clearing, recovery rotation, pending clearing, and grant creation are separate operations. A later failure can report setup failure after the authenticator already changed. Concurrent confirms can both read the same pending secret and rotate codes/session versions more than once. Client-side, recovery codes are not stored in state until `session.update()` completes; if that call throws, the UI loses the returned codes and shows the already-confirmed QR again.

Fix: atomically claim a versioned pending enrollment and commit secret, replay seed, recovery hashes, pending consumption, session version, and grant. Make duplicate/late confirms return a stable completed/expired result without another rotation. On the client, preserve returned recovery codes before attempting session handoff; show “authenticator saved, session verification pending” if the handoff fails. Do not silently retry enrollment after a committed change.

### F6 — P2: setup auto-submit reads stale React state

Evidence: `src/components/hub/mfa/MfaCodeField.tsx:72–75`; `src/app/[locale]/app/mfa/setup/MfaSetupPageClient.tsx:160–176,357–362`.

The field calls `onChange(next)` and immediately calls `onTotpComplete(next)`. Setup discards `next` and synchronously requests a form submit, whose handler reads the previous render's `code`. Typing the sixth digit can therefore validate the previous five digits; pasting can validate the prior empty value. Manual submission after rendering can work, which makes the failure look intermittent. Blame traces this wiring to `ebb651ab` on September 27.

Fix: accept the completed string directly in a shared `confirmWithCode(submittedCode)` function, as the normal challenge already does. Test the setup page integration, not just the field callback.

### F7 — P2: status errors become endless loading or misleading setup

Evidence: `src/app/[locale]/app/mfa/MfaPageClient.tsx:64–104`; `src/app/[locale]/app/mfa/setup/MfaSetupPageClient.tsx:77–99`; `src/app/api/mfa/status/route.ts`.

Challenge uses `null` for both loading and failed status retrieval and never retries while authentication status stays unchanged. A 500/503 or network error leaves “session loading” forever. Setup treats status failure as unenrolled/idle. The status API also reads grace and decrypts the confirmed secret without a structured error boundary, so database/schema/key problems can trigger these paths before a code is entered.

Fix: separate loading, ready, unavailable, expired-session, and retry states. Return a stable error code and request reference without secrets. Never infer enrollment absence from a failed read.

### F8 — P2: recovery rotation invalidates the session but UI keeps claiming verification

Evidence: `src/lib/auth/mfa-recovery-codes.ts:103–106`; `src/app/api/mfa/recovery-codes/route.ts:68–79`; `src/app/[locale]/app/mfa/MfaPageClient.tsx:134–177`; `src/lib/auth/refresh-jwt-tenancy.ts`.

Durable rotation increments sessionVersion, which clears MFA verification on the next session refresh. Unlike enrollment, rotation returns no grant for the initiating browser. The UI retains its original `mfaStatus.mfaVerified` and displays the verified management panel, then protected navigation asks for MFA again. The just-used TOTP is already consumed.

Fix: issue a post-rotation grant for the initiating session and consume it after saving the new codes in client state. Other sessions should lose verification as intended. Refresh status explicitly and never treat an old status response as current proof.

### F9 — P2: enrollment confirmation bypasses the shared attempt limiter

Evidence: `src/app/api/mfa/enroll/confirm/route.ts:79–98` calls `matchTotpCounter` directly with no attempt reservation.

Normal verify and replacement proof use account limits, but pending-secret confirmation accepts repeated guesses during the pending lifetime. Add a durable confirmation limit with structured 429/Retry-After handling; regeneration must not reset the account's abuse budget. This is a security gap, not established as the cause of the current outage.

### F10 — P2: replacement regeneration reuses a consumed proof

Evidence: `src/app/api/mfa/enroll/route.ts` consumes the current factor via `verifyMfaCode`; `src/app/[locale]/app/mfa/setup/MfaSetupPageClient.tsx:378–386` passes the same saved `replaceCode` to regenerate.

After replacement starts, “Generate again” submits the already-consumed old authenticator code and gets a replay/expiry failure. The regenerate button also remains enabled during confirmation, permitting overlapping writes and competing client transitions.

Fix: use a short-lived replacement authorization scoped to that enrollment, or explicitly ask for a new current code. Disable conflicting operations and add a synchronous start/regenerate lock.

## Recovery and UX work after core fixes

1. Provide explicit Authenticator / Recovery code choices. Keep numeric keyboard and six-digit autofill for TOTP; use a separate recovery input. This avoids accidental TOTP auto-submit when typing a recovery code whose first six characters happen to be digits.
2. Add a lost-phone journey. Recovery codes currently permit login, but replacing the authenticator still requires the unavailable old TOTP. Support a fresh, single-use recovery proof scoped to replacement, with audit and user notification; keep an operator-assisted path when all factors are lost.
3. Show real Retry-After countdowns and actionable “wait for the next code” guidance. Preserve the intended destination and unsent work through every challenge. Do not show storage failures as “invalid code.”
4. Show pending setup expiry and a clear restart action. Explain when an old QR becomes invalid. Make same-device manual setup straightforward; retain the existing copy-secret, recovery download, and saved-codes acknowledgement features.
5. Centralize MFA status/loading/error handling and accessible challenge controls. Associate hints/errors using `aria-describedby`, focus failed fields appropriately, announce completion, and verify keyboard, mobile, zoom, EN and FR flows.
6. Separate “authenticator enrolled,” “this session verified,” “recovery setup required,” and “service unavailable.” Add a status refresh after rotation/reset and avoid stale green success panels.
7. Replace indefinite email-based operator bypass with explicit expiry and constrained recovery scope. Current bypass also skips fresh privileged step-up and tolerates audit failure (`fresh-mfa-step-up.ts`); it should not become the normal availability mechanism.
8. Revisit the attempt budget: all successful normal and sensitive-action verifications count toward the same 10-per-15-minute cap. A busy officer can exhaust it without mistakes. Design separate abuse protection and successful step-up behavior before changing limits.
9. Consider passkeys/security keys only after the TOTP/recovery contract is reliable. They are a later feature, not required to fix this incident.

## Repair sequence and acceptance evidence

**First: identify the deployed failure.** Compare deployed image SHA with this review, correlate status/enroll/confirm/verify/session-update HTTP results with server request IDs, and check runtime schema/grants and clock synchronization. Verify consistent AUTH_SECRET and dedicated TOTP encryption keys across replicas without exposing their values. Check the required production TOTP/account backend flags. Preserve encrypted enrollments; do not rotate or discard keys as troubleshooting.

**Second: repair persistence and policy.** Address F1–F5; remove hosted fallback while restoring reliable database access and an explicit recovery-only path. Keep encrypted secrets and MFA enforcement intact. Use the current ADR-020 deployment contract for any migration work.

**Third: finish the client lifecycle.** Address F6–F10, then lost-phone recovery, rate-limit feedback, expiry, and accessibility. Keep bilingual copy and the established recovery-code save gate.

**Required proof before calling MFA restored:**

- Real Postgres using `unionops_app`, migrations through the deployed tail, actual application binders, and no memory fallback. Assert persisted rows and fallback signals, not merely successful return values.
- Enrollment on replica A, confirmation on B, grant consumption on A; restart and verify again.
- Concurrent duplicate TOTP, recovery-code use, enrollment confirm/regenerate, reset/confirm, and grant consumption. Only the intended operation may succeed; no success response may contain an invalidated handoff/code set.
- Fault injection at recovery rotation, pending clearing, grant creation/consumption, and session refresh. No false success, lost one-time codes, silent downgrade, or endless loading.
- Browser tests for typed/pasted/autofilled code with no manual rescue click; Enter races; recovery login and replacement; code rotation followed by protected navigation; grace/reset with a deep return URL; status 503 and retry; EN/FR.
- Restore drill with the preserved encryption key, plus missing/wrong-key failure behavior and rollback/deploy evidence.

Current coverage misses these contracts. `MfaCodeField.test.tsx` tests a callback rather than setup submission. `e2e/mfa.enroll-totp.spec.ts` is environment-gated, lacks the smoke tag, and manually clicks Confirm after filling, which can mask broken auto-submit. The new binder smoke in `scripts/rls-smoke.ts:25–50` can report success through memory fallback for attempt/grant operations and only reserves one attempt, missing the timestamp-sensitive conflict/update path. Run this with isolated fixture accounts on a disposable database: the binder helper writes account state and is not a production read-only diagnostic.

## Continuation plan and phase ledger

Implement and commit the following in order. Keep this ledger current in each phase commit. Do not mark a phase done on unit tests alone; record unavailable evidence as open. A later turn should resume at the first incomplete phase, inspect its current files and commit, run its stated checks, and continue without repeating already-proven work.

| Phase | Scope | Status | Commit | Verification / open evidence |
|---|---|---|---|---|
| 0. Plan | Preserve this review as the source of truth; define implementation slices, dependencies, and evidence. | Complete | `49f5314b` | `git diff --check` passed; boundaries cover F1–F10, QOL backlog, verification, and continuation rules. |
| 1. Durable-state authority | F1–F2: eliminate process-memory success after selected durable MFA store failures; ensure recovery-code responses mean codes were durably committed; use memory only when memory is the selected backend. Add focused failure-path tests. | Complete | `9d900778` | Focused Vitest: 5 files / 24 tests passed; `tsc --noEmit` passed; `git diff --check` passed. Live `unionops_app` Postgres evidence remains Phase 5. |
| 2A. Reset re-entry policy | F3: distinguish active reset grace from exemption; send the challenge page/banner to setup with the attempted destination preserved while keeping protected routes behind verified MFA. | Complete | `fb754d3f` | 46 focused MFA route/policy/return-path tests passed; `tsc --noEmit` passes after import fix; source verifies `sessionMfaOk` remains false. Browser deep-return remains Phase 5 evidence. |
| 2B. Atomic factor handoff | F4: serialize account verification; consume TOTP/recovery state before grant creation inside one durable transaction; preserve an active browser grant rather than replacing it. | Complete | `c6a7a593` | Focused Vitest: 4 files / 37 tests passed; `tsc --noEmit` passed. Real multi-replica `unionops_app` row-lock and grant-consumption evidence remains Phase 5. |
| 2C. Atomic enrollment confirmation | F5: make confirmation single-use and durable across secret/counter/recovery/pending/grant writes; preserve one-time recovery codes when session refresh fails. | Complete | `ac8c36c5` | Focused Vitest: 4 files / 42 tests passed; `tsc --noEmit` and targeted ESLint passed. Real `unionops_app` transaction/RLS smoke remains Phase 5. |
| 3A. Setup/status reliability | F6–F7: submit the actual completed code string; represent status loading, unavailable, retry, and expired-session states separately; return stable status errors and request references. | Complete | `3dfce24d` | Focused Vitest: 3 files / 28 tests passed, including setup component auto-submit and retry coverage; `tsc --noEmit` and targeted ESLint passed. Full browser typed/pasted/autofill and production status outage checks remain Phase 5. |
| 3B. Recovery/replacement lifecycle | F8–F10: preserve verification after code rotation, add durable confirmation throttling, and fix replacement proof reuse plus conflicting actions. | Complete | `2137d5b7` | Focused Vitest: 4 files / 40 tests passed, including rotation grant/session refresh, enrollment throttling, and replacement reauthentication; `tsc --noEmit` and targeted ESLint passed. Real multi-replica rotation and throttling evidence remains Phase 5. |
| 4A. Recovery UX and accessibility | Distinguish authenticator and recovery-code entry, expose Retry-After countdowns, show pending QR expiry/restart, and associate accessible field hints/errors. | Complete | `cf8019c6` | Focused Vitest: 7 files / 81 tests passed, including MFA page/setup/accessibility and EN/FR public-copy checks; `tsc --noEmit`, targeted ESLint, and `git diff --check` passed. Manual keyboard/mobile/zoom and human French-copy review remain Phase 5. |
| 4B. Lost-phone replacement | Allow one saved recovery code to authorize a new pending authenticator while the old factor remains active until confirmation; retain operator-assisted recovery as an unresolved policy path when all factors are lost. | Complete | `1c950f8e` | Focused Vitest: 8 files / 88 tests passed, including one-time recovery replacement, page payload, factor-choice interaction, and EN/FR copy; `tsc --noEmit`, targeted ESLint, and `git diff --check` passed. Postgres rollback/row-lock proof remains Phase 5B. |
| 5A. Source verification + release handoff | Run broad MFA tests, type/lint checks, attempt repository smoke/browser validation, and capture exact operator procedure. | Complete | `pending` | Broad MFA Vitest: 26 files / 161 tests passed; `tsc --noEmit` and targeted ESLint passed. `npm run test:smoke` launched 411 cases but was stopped after public Brand Kit/builders routes returned 404; this does not verify the changed MFA browser flow. Isolated Next dev server startup for MFA E2E failed with `spawn EPERM`. This checkout has no database URLs, and the Docker Desktop engine pipe returns permission denied. The evidence checklist records these limits and the next operator actions. |
| 5B. Hosted release evidence | Verify production-like Postgres `unionops_app` behavior, RLS/grants, replica handoff/restart, concurrency/fault behavior, TOTP-key restore, hosted browser journey, and rollback/deployment evidence. | Open — operator environment required | — | Continue with [`mfa-release-evidence-checklist-2026-09-30.md`](mfa-release-evidence-checklist-2026-09-30.md). Do not describe the deployed MFA service as restored until the checklist has evidence attached. |

### Phase execution rules

- One phase per conventional commit. Keep the scope bounded to the phase; update this file's ledger and add a short session-knowledge note when behavior or operator procedure changes materially.
- Before each phase, re-check `git status`, phase prerequisites, and the latest implementation. Preserve unrelated workspace changes. Do not stage `.codex/` or unrelated user files.
- For every change, add or adapt a meaningful test that covers the failure contract. If the required runtime (dependencies, Postgres, deployed host) is absent, keep that evidence explicitly open rather than treating a mock or source inspection as proof.
- If implementation reveals a regression already fixed by another phase or upstream commit, record the commit and evidence in that phase row, mark the duplicate item “covered,” and do not reintroduce it. If a regression recurs, add its reproduction and owning test to the original finding and fix it before advancing.
- After each commit, inspect the commit diff, working-tree status, test output, and remaining phase ledger. Resume from this document after interruption; never reset or amend a pushed commit.
- Phase 1 changes the durable-store failure contract. Phases 2A–2C build on that contract before broader journey changes. Phase 3 UI must consume the final Phase 2 API contract. Phase 4 follows only after factor lifecycle is stable. Phase 5A is committed source verification and handoff. Resume at Phase 5B; the hosted release gate requires operator-owned evidence and must not be marked complete from local tests.
