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

| Control | v1 | v2+ |
|---------|----|----|
| CSP headers | Yes (`vercel.json`) | Yes |
| File upload validation | Type + size limits | + virus scan |
| Auth | None (public comms) | Auth.js + MFA |
| RLS | N/A | Postgres policies |
| Dependency audit | CI `npm audit` | CI `npm audit` |
| `dangerouslySetInnerHTML` | Prohibited | Prohibited |

## Breach Response Playbook

1. Detect and contain (revoke tokens, isolate affected tenant)
2. Assess scope within 24 hours
3. Notify platform admin immediately
4. Notify affected union/local within 72 hours (PIPEDA)
5. Document in audit log; post-mortem within 14 days

## Legal Disclaimer (display in app)

> This tool helps track union processes. It does not provide legal advice. Locals should consult their national representative or legal counsel for grievance and arbitration matters.

## Union Body Standards Reference

| Standard | Module | Requirement |
|----------|--------|-------------|
| Ontario LRA | Grievance | Step tracking, timelines, confidentiality |
| Collective agreement | Grievance | Configurable per-union CA templates |
| PIPEDA / FIPPA | All with PII | Classification, retention, breach response |
| AODA WCAG 2.1 AA | All UI | EN/FR, keyboard, contrast, axe-core |
| Union governance | RBAC | Separation of duties, audit trail |
| Records retention | Grievance, bumping | 7-year default, configurable export |
