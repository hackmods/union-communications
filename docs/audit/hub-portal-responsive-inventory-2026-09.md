# Hub / Portal responsive inventory (VL-HUB-0)

**Date:** 2026-09-26  
**Parent plan:** [`plan-2026-09-26-viewport-lab-followups.md`](plan-2026-09-26-viewport-lab-followups.md)

## Framing rule

Viewport Lab **cannot** frame `/app` or `/portal` (`frame-ancestors 'none'`). Use Playwright (`hub.mobile`, `portal.mobile`, `hub.a11y`) or a normal authenticated browser tab.

## Hub routes (`src/app/[locale]/app/`)

| Area | Path prefix | Mobile overflow coverage (2026-09-26) |
|------|-------------|----------------------------------------|
| Dashboard / nav | `/app` | Drawer tests in `hub.mobile` |
| Grievances / bumping / time | `/app/grievances`, `/bumping`, `/time` | Yes (+ axe subset) |
| Discussions / tasks / check-ins / documents | `/app/discussions`, `/tasks`, `/checkins`, `/documents` | Yes |
| Marketplace / snippets / hybrid / meetings / committees / overdue | matching `/app/*` | Yes |
| Audit / handoff / officers / minutes | matching | Yes |
| **Bylaws / proposals / data** | `/app/bylaws`, `/proposals`, `/data` | **Added 2026-09-26** |
| Calendar / elections / ledger / travel / polls / reports / org / site-admin / … | remaining | Follow-up `VL-HUB-1` widen as modules stay enabled in demo |

## Portal routes

| Path | Coverage |
|------|----------|
| `/portal` (Together) | Yes |
| Circle Hall + Bulletin tab | Yes |
| `/portal/proposals` | **Added 2026-09-26** |
| `/portal/dispatch` | **Added 2026-09-26** |
| fronts / my-cases / send-feedback / sidebars | Follow-up |

## Next

- `VL-HUB-2`: 1280 composition pass (dashboard, grievance detail, one circle)
- `VL-HUB-4`: human SR + 200% zoom (hub-dashboard session knowledge)
