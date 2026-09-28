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

## Non-goals

- Member broadcast lists / Hub “email all”
- SMTP from public Comms tools
- Grievance case content via platform SMTP
- Open/click tracking

## Operator surfaces

- Site Admin **Email operations** — `/app/site-admin/email` (template studio preview, transport health, test send)
- Product-news panel — `/app/site-admin/product-news` (campaigns; wraps shared shell in a later phase)
- `GET /api/auth/email-status` — transport snapshot for login/debug
- `GET|POST /api/site-admin/email-ops` — operator preview + test send (site-admin MFA session)

## Tests

```bash
npm run test:unit -- src/lib/email/engine src/lib/email/messages.test.ts
```
