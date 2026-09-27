# Session knowledge — product-news consent foundation

**Date:** 2026-09-27  
**Scope:** Packet 5 engineering decision and pure consent-state foundation.  
**Status:** Partial groundwork only. No subscriber data is collected and no product-news email can be sent.

**Later implementation:** This is the initial design snapshot. The subsequent
[Packet 5 implementation note](session-knowledge-2026-09-27-product-news-implementation.md)
records the new durable source path and remaining legal/host gates.

## Current evidence

- Existing mail is centralized through the transactional email helper and uses SMTP or Mailgun. ADR-016 prohibited marketing campaigns and mailing lists; no consent ledger, campaign sender, unsubscribe surface, or product-news list exists in this checkout.
- The launch plan explicitly authorizes a separate program for people who voluntarily subscribe to UnionOps product news. It excludes Hub, Portal, support, feedback, invitations, customer contacts, and union member rosters.
- ADR-021 now supersedes ADR-016 only for a separately gated product-news path. The old transactional helper remains marketing-ineligible.
- The CRTC's CASL guidance identifies consent, sender identification, and an unsubscribe mechanism as the main requirements. The unsubscribe address/link must remain valid for at least 60 days after a message is sent; unsubscribe requests must be given effect without delay and no later than 10 business days. UnionOps intends to suppress immediately at the application send gate. Sources: [CRTC CASL FAQ](https://crtc.gc.ca/eng/com500/faq500.htm), [Decision CRTC 2019-111](https://crtc.gc.ca/eng/archive/2019/2019-111.htm).

## Source changes

- Added a pure consent state model in src/lib/email/marketing-consent.ts. It requires an address-verification event tied to the latest grant before allowing a send. A new grant resets the address to pending confirmation. Withdrawal and unsubscribe suppress; an administrative correction can only invalidate a specific grant and suppress it.
- The state model uses a positive, database-assigned event sequence as causal order. Timestamps do not reorder events, but a confirmation dated before its grant is rejected. The future durable writer must serialize a subscriber's event append and current-state update so stale confirmations cannot win a race.
- Address validation preserves plus tags and local-part case for delivery, canonicalizes internationalized/lowercase domains, and provides a separate case-folded lookup key. Do not use the lookup key as the delivery address.
- Narrowed the EN/FR Comms email-guide statement to its actual promise: the public drafting toolkit does not store a union's member mailing list or send union-wide emails. It no longer makes a site-wide statement that could conflict with a future, separately consented UnionOps product-news program.
- Added src/lib/email/marketing-consent.test.ts for grant/confirmation matching, stale confirmation rejection, suppression, re-subscription, correction invalidation, malformed evidence, address syntax, and IDN domain handling.
- No migration, subscriber storage, public form, confirmation email, preference route, campaign sender, admin UI, provider send, or user-data change is part of this slice. Keep every collection and sending surface absent or disabled until its later work and approval gates are implemented.

## Verification and limits

- A direct Node type-stripping smoke check passed address normalization, matching confirmation, stale confirmation rejection, unsubscribe suppression, re-subscription pending state, correction suppression, and invalid timestamp rejection.
- Focused Vitest execution remains unavailable because this checkout has no installed Vitest executable. TypeScript and lint were unavailable in the previous committed slice for the same dependency-install reason; rerun all three in a dependency-equipped checkout.
- No ADR-020 migration was created or applied, no Postgres/RLS behavior was exercised, no mailbox or provider was contacted, and no legal wording was approved.

## Next work

1. Design migration 0077 for a durable current-state projection and append-only event history. Review the public write path and RLS contract so confirmation/unsubscribe operations cannot gain list-read access or fabricate events. Use server-generated times, stable per-address locking, minimal request context, and token hashes rather than raw tokens.
2. Add public opt-in with an unchecked box and versioned EN/FR notice, but keep it disabled until the exact wording, UnionOps sender identity, monitored contact details, retention, and applicable CASL/privacy review are approved.
3. Add address confirmation and no-login email preferences. Confirm only the latest grant; make unsubscribe idempotent and immediate; ensure sent-message links stay valid at least 60 days.
4. Introduce a classified sender path. Transactional/security delivery remains independent; marketing sends must prove current consent at send time and include approved identification and unsubscribe details. Keep addresses out of routine logs.
5. Add restricted, audited recipient evidence access and campaign preview/test/send controls. Do not import tenant or member rosters.
6. Run focused/full unit tests, TypeScript, lint, migration integrity, ADR-020 fresh-DB and RLS checks, consent/unsubscribe scenarios, provider failure cases, and legal/content review before enabling sends.

## Handoff

Start from the current branch after confirming its commit and clean status. ADR-021 and the helper are design groundwork, not a customer-visible feature or a completed Packet 5. The launch tracker remains in progress; no marketing send or collection is approved.
