# Compliance & Security

## Data Classification

| Level | Examples | Access |
|-------|----------|--------|
| Public | Guides, templates | Anyone |
| Internal | Brand kits, captions | Local members |
| Confidential | Grievance notes | Assigned officers |
| Highly Confidential | Attachments, bumping PDFs | Need-to-know + MFA |

## Ontario & Canadian Privacy

- **PIPEDA** — consent, breach notification (72h), access rights
- **FIPPA** — public-sector members; data minimization, pseudonym option
- **Privacy by design** — v1 comms: no analytics, client-side processing
- **Canadian data residency** — preferred for v2+ hosting

## AODA / WCAG 2.1 AA

Semantic HTML, keyboard nav, contrast checker, EN/FR i18n, axe-core in CI.

## Union Governance

Separation of duties, immutable audit trail, 7-year retention default, member photo consent, legal disclaimer in app.

## Security Controls

CSP headers, upload validation, Auth.js + MFA (v2), Postgres RLS, `npm audit` in CI, no `dangerouslySetInnerHTML`.
