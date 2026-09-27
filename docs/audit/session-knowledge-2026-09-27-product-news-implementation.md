# Session knowledge — Packet 5 product-news implementation

**Date:** 2026-09-27
**Status:** Source implementation and focused local checks complete; broad-suite, legal, and target-host release evidence pending.
**Branch:** `feat/enterprise-readiness-foundation`

## Decision and boundary

ADR-021 permits voluntary UnionOps product news to self-submitted individual addresses. This program has no import or query path from Hub, Portal, union/local member rosters, support, feedback, invitations, or customer contact records. Existing operational email still uses `sendTransactionalEmail`. Product-news transport is classified separately, and campaign code can only queue deliveries. The bounded cron worker checks current consent inside a subscriber row lock immediately before the provider request.

The `UNIONOPS_PRODUCT_NEWS_ENABLED` flag defaults off. Even when it is set to true, `readProductNewsConfig` refuses collection and sending unless the exact bilingual notice version (`product-news-2026-09-v1`), an approval reference, a validated legal sender name/from/contact/postal address, HTTPS `AUTH_URL`, durable `DATABASE_URL`, Mailgun API/domain/webhook signing key, email enablement, and signing keys are configured. **The current notice and sender details have not been legally approved.** The code does not infer approval from source control or an SMTP credential.
Disabling the flag also blocks new confirmations; existing preference and unsubscribe links remain available while signing keys and the database are present.

## Durable model

Forward Drizzle migration `0077_product_news_consent.sql` adds platform-wide subscriber projection, append-only consent event history, hashed action tokens, durable request throttles, bilingual campaigns, queued/test delivery records, provider feedback events, and a replica-wide dispatch-rate row. It does not alter older migration history. The ADR-020 required database shape and RLS contract include the new tables and policy names.

- Consent events have database-assigned order and retain the exact normalized destination, locale, notice text/version, source, timestamp, and a server request correlation ID. A new grant resets the projection to pending; only a confirmation tied to the latest grant can enable sends. Withdrawal, unsubscribe, justified admin correction, permanent failure, and complaint suppress. Old evidence stays append-only.
- Public application role access is through narrow `SECURITY DEFINER` database functions for subscription, confirmation, preference-link request/state, and unsubscribe. Direct list reads and token-table reads have no public RLS policy or table grant. Public submission rate limits are stored in Postgres per HMAC-derived client key and subscriber cooldown.
- Tokens are HMAC-signed and only their SHA-256 hashes are stored. Confirmation links expire after 48 hours; requested preference links after 30 minutes; campaign unsubscribe links after 65 days. The first configured key signs new links; old keys must remain configured for at least 65 days after their last use. Unsubscribe remains available if new subscriptions are switched off, provided keys and database remain available.
- Admins may search/export **one exact address** and append a reasoned suppression. Those actions use Site Admin MFA authorization and audit records. Search/export sends the address in a POST body, avoiding URL/query logging.

## Delivery sequence and operational behavior

1. A site admin creates a bilingual plain-text draft, records its content approval reference, may queue a test to a confirmed subscriber, and explicitly releases to the then-confirmed audience. Release needs an unchecked confirmation control. A pause stops further claims.
2. `POST /api/cron/product-news` authenticates `CRON_SECRET`, processes at most three messages per call, and uses a database-wide interval row (default 3 seconds). It creates and commits a 65-day unsubscribe token before sending. Then it locks the subscriber and delivery rows, rechecks current consent/campaign state, calls Mailgun while holding the subscriber lock, and records provider outcome. A concurrent unsubscribe cannot complete and then be followed by a newly started send. Paused claims return to the queue.
3. Failures and unknown outcomes do **not** retry automatically. A worker interruption leaves an unknown outcome, which is marked for operator review after 15 minutes. No full recipient address, message body, token, or raw provider response is written to routine delivery logs.
4. Product-news Mailgun messages carry a dedicated tag and disable open/click tracking. Signed Mailgun webhook events for that tag correlate by provider message ID. Permanent failures, complaints, and provider unsubscribes suppress the subscriber; temporary failures are recorded for review. Uncorrelated tagged events return a retryable response because a callback may arrive before the worker transaction commits. Transactional messages are ignored by this webhook.
5. The cron worker removes expired action tokens after a seven-day grace period and old rate-limit rows after two days. Consent history and delivery evidence remain for the future approved retention schedule in Packet 7.

## Routes and surfaces

- Public EN/FR `/email-preferences` form with an unchecked, separate consent, signed no-login preference link, and status/withdrawal. Confirmation and unsubscribe links use single-action pages under that route.
- Profile card links account holders to the same separate preference page.
- `/app/site-admin/product-news` and `/api/site-admin/product-news*` provide the restricted campaign and one-address evidence workflow.
- `/api/cron/product-news` dispatches; `/api/webhooks/mailgun/product-news` handles signed provider feedback.
- Footer links to preferences. A public `/updates` announcement is deferred until the feature is legally approved and actually enabled, so the site does not advertise an unavailable subscription.

## Local evidence and limits

- `npm ci --offline --ignore-scripts --no-audit --no-fund` installed cached dependencies.
- Focused Vitest: 6 files, 51 tests passed (consent projection, signed tokens/config gate, Mailgun signature/tag parsing, classified Mailgun envelope, direct API denial, and invite-route regression).
- TypeScript check, full lint (0 errors, 12 existing warnings), migration journal check (78 entries), and generated ADR-020 shape check pass. The generated shape reports 145 tables at the latest local check. The first Vitest run exposed a pre-existing correction-error assertion mismatch; it was repaired and rerun green. A few prior Packet 4 type errors were also corrected to restore typecheck.
- A full local unit run completed with 2,923 passed, 20 failed, and one skipped. Four assertions were directly stale for Packet 5 (the API route guard catalog, the journal tip, and two RLS contract checks); after updating those expectations, their focused rerun passed 28/28. The remaining 16 failures concern earlier attachment/document auth, MFA, public catalog/routes, content review, hosted controls, site-admin purge, and subprocessor publishing. They were not repaired as part of this packet; the full suite has not been rerun after these four test changes.
- The final combined Packet 5 and contract rerun passed 79/79 tests across nine files, and typecheck passed after the final source edit.
- The local Playwright smoke command selects 397 cases. It surfaced a missing `nav.documents` translation in both locales, which was fixed. The run was interrupted after 24 cases; no completed smoke-suite result is claimed. It also printed a Brand Kit JSON parse error that needs separate investigation.
- Docker Desktop's daemon is unavailable here; no PostgreSQL migration, restricted-role/RLS, concurrency, mailbox, CapRover, or real Mailgun webhook test was run. No CI/deployment pipeline was inspected at the user's request.
- The notice and sender identity need qualified human approval. CapRover values, webhook registration, verified monitored contact, bounce drill, test subscription/send/unsubscribe, and production storage/isolation evidence remain open before enabling the flag on a customer host.

## Handoff

Use [SETUP](../guides/SETUP.md) and [CAPROVER_POSTGRES](../guides/CAPROVER_POSTGRES.md#unionops-product-news) for activation. Run the forward migration through the ADR-020 owner/runtime boot gate; verify direct app-role denial of list/token access and normal operation of the narrow functions. Test concurrent unsubscribe versus dispatch, old-link validity after key rotation, provider callback correlation, and a real confirmed test send. Record the qualified EN/FR review and sender approval reference before setting `UNIONOPS_PRODUCT_NEWS_ENABLED=true`. Keep the release tracker partial until those records exist.

## Sources

- [CRTC CASL FAQ](https://crtc.gc.ca/eng/com500/faq500.htm): identification, unsubscribe mechanics and timing, consent recordkeeping.
- [Mailgun webhook signatures](https://documentation.mailgun.com/docs/mailgun/user-manual/webhooks/securing-webhooks) and [webhook payloads](https://documentation.mailgun.com/docs/mailgun/user-manual/webhooks/webhook-payloads).
- [Mailgun sending options](https://documentation.mailgun.com/docs/mailgun/user-manual/sending-messages/pass-sending-options): message tags and tracking controls.
