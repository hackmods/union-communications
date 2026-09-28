# Email Engine

**Status:** In progress (`feat/email-engine`)  
**Policy:** ADR-016 (transactional SMTP), ADR-021 (gated product-news), COMMS fifth channel = guide + copy (no member mailer)

## Lanes (do not merge)

| Lane | Purpose | Delivery |
|------|---------|----------|
| **Compose engine** | Preset catalog → `{ subject, text, html }` | Client-safe for drafts; server for SMTP |
| **Delivery** | `send.ts` / `adapters/deliver` | Server-only; classified send |
| **Steward drafts** | Grievance, Comms invite, Hub R2 reminder | Copy / mailto / `.eml` only |
| **Marketing** | Product-news campaigns | `classification: "marketing"` + consent |

Parallel to Office / text-PDF / raster — see `.cursor/rules/export-engine-parity.mdc` (Email lane).

## Package

```
src/lib/email/
  send.ts                 # Mailgun/SMTP transport
  engine/
    types.ts
    design-tokens.ts      # host-brand → email-safe chrome
    layout.ts             # multipart HTML + plain text
    compose-transactional.ts
    validate.ts
    fixtures.ts
    index.ts
  adapters/
    mailto.ts
    eml.ts
    deliver.ts            # server-only wrapper (optional)
  messages.ts             # thin builders → engine (compat)
```

## Brand matrix

| Class | Visual source | From |
|-------|---------------|------|
| Platform transactional / security | Host-brand | `EMAIL_FROM` |
| Product-news | Host-brand chrome + approved env sender/footer | `UNIONOPS_PRODUCT_NEWS_*` |
| Steward drafts | Brand Kit (local) | Officer inbox |

## Non-goals (default)

- Mailchimp-class SaaS UX, imported national member lists, or tracking-by-default
- Enabling any enterprise capability without **both** CapRover host flag and platform-admin union entitlement (ADR-022)

## Enterprise capabilities (ADR-022 — default OFF)

| Capability | CapRover env | Union column | Notes |
|------------|--------------|--------------|-------|
| Member broadcast | `UNIONOPS_MEMBER_BROADCAST_ENABLED` | `member_broadcast_enabled` | `classification: "broadcast"`; consent/suppression before send UI ships |
| Comms auto-send | `UNIONOPS_COMMS_AUTO_SEND_ENABLED` | `comms_auto_send_enabled` | Copy/mailto stays default UX |
| Grievance SMTP | `UNIONOPS_GRIEVANCE_SMTP_ENABLED` | `grievance_smtp_enabled` | Copy-only stays default |
| Tracking pixels | `UNIONOPS_EMAIL_TRACKING_PIXELS_ENABLED` | `email_tracking_pixels_enabled` | Never on product-news `marketing` |

Gate helper: `assertEnterpriseEmailCapability` in `src/lib/email/enterprise-gates.ts`.  
Site Admin: Email Ops → Enterprise capabilities (+ `/api/site-admin/email-entitlements`).

## Operator surfaces

- Site Admin **Email operations** — `/app/site-admin/email` (template studio, transport health, test send, **enterprise entitlements**)
- Product-news panel — `/app/site-admin/product-news`
- `GET /api/auth/email-status` — transport snapshot
- `GET|POST /api/site-admin/email-ops` — preview + test send
- `GET|PATCH /api/site-admin/email-entitlements` — CapRover host flags + per-union toggles

## Tests

```bash
npm run test:unit -- src/lib/email/engine src/lib/email/messages.test.ts
```
