# Travel export fresh MFA step-up — 2026-09-27

## Scope and outcome

`GET /api/travel/[id]/export` previously returned an XLSX, PDF, or receipt ZIP
after ordinary session and resource checks. The ZIP can contain a claim report
and receipt files, so this is a sensitive export path. The old GET method now
returns 405; `POST /api/travel/[id]/export` is the only download method.

The route requires the existing Travel session and module access, validates
the format, loads the authorization, and checks `assertTravelView` before
asking for fresh MFA. The challenge is evaluated before advances, claims, or
receipt files are loaded. Authorization remains union/local scoped; an
out-of-scope record returns the existing generic 404 and does not trigger a
challenge or export builder.

After a successful challenge, the route loads the related advance/claim,
builds the selected file, and writes a correlated success audit record before
returning the bytes. If that append fails, it returns 503 and withholds the
file. Error and denial audit metadata includes only format and a reason code;
it excludes the MFA code, claim line items, receipt names/content, and money
values. Responses are private/no-store and use a server-generated request ID.

The TravelBoard sends the selected format in a POST body. On a 428 response it
keeps the exact authorization, event title, and format pending, then shows an
EN/FR accessible challenge form in the matching travel card. Failed, throttled,
unavailable, and audit-failure outcomes receive separate user messages. The
legacy query-string request is no longer called by the UI.

## Tests added or updated

`src/app/api/travel/[id]/export/route.test.ts` covers direct API denial before
advance/claim/receipt access, MFA throttling and challenge-code omission,
correlated successful XLSX delivery, receipt ZIP generation after challenge,
fail-closed success audit, out-of-scope denial, and GET retirement.

`src/lib/travel/api-routes.test.ts` retains route-level authentication,
role, union/local isolation, and real XLSX output coverage, now using POST. It
also asserts that the old GET path returns 405.

## Decisions and limits

- The shared fresh-MFA helper preserves operator-configured behavior on
  self-hosted instances. UnionOps-operated customer hosts must enable hosted
  customer mode and production TOTP; readiness evidence remains a separate
  launch gate.
- The authorization row is read before challenge because it supplies the
  resource scope decision. Related financial records and receipt storage are
  not read until after the challenge.
- The success audit append happens after file generation but before delivery.
  It cannot roll back reads or CPU work, but it prevents delivery when audit
  evidence is unavailable.
- The route tests parse, but Vitest, TypeScript, browser download behavior,
  hosted MFA, audit durability, and target-host tenant/RLS behavior still need
  execution evidence in an equipped staging environment.

## Handoff

Before hosted launch, verify each format and receipt ZIP against the hosted
production-TOTP profile; confirm direct API denial, correct local/union
boundaries, durable audit before download, and provider/storage failures. Add
those results to Packet 6's evidence register. Continue the sensitive-export
inventory for poll results and meeting RSVP responses before closing route
coverage.
