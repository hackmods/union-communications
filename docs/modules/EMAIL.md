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

- Site Admin Email Ops (design preview, health, test send) — planned
- Product-news panel — existing; wraps shared shell
- `GET /api/auth/email-status` — transport snapshot

## Tests

```bash
npm run test:unit -- src/lib/email/engine src/lib/email/messages.test.ts
```
