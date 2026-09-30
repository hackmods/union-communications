# Sitewide QOL + Launch Trust Program — master tracker

**Plan created:** 2026-09-30  
**Cursor plan:** `.cursor/plans/sitewide_qol_launch_5c5eb924.plan.md`  
**Rule:** Current-State Alignment Gate on every ID before code. Fit-gap after every 1–2 IDs.

## Alignment Gate (every ID)

1. Re-read source plan + PROGRESS + ground truth; verify paths exist  
2. Audit live code/tests  
3. Diff vs current standards (tool-editor-ux, canvas-core, Hub dashboard, DATA_WORKBENCH, ADR-020, LAUNCH tracker)  
4. Verdict: **SKIP** | **NARROW** | **REALIGN** | **FULL**  
5. Implement residual only; fit-gap starts with Baseline verdict  

Human gates (Ryan/counsel/host): legal approval, CapRover secrets, mailbox drills, production `*_DB_BACKEND` flips. Agents never invent effective legal text or claim unrun host evidence.

---

## Track T1 — Site QOL

### Wave A — Hub composition / a11y

| ID | Status | Verdict | Notes |
|----|--------|---------|-------|
| A1 VL-HUB-2 | done | NARROW | `e2e/hub.composition.spec.ts` |
| A2 VL-HUB-4 | partial | NARROW | 200% zoom auto; human SR open |
| A3 VL-HUB-3 | partial | NARROW | smoke +bylaws/proposals |
| A4 Member Portal-off landing | done | FULL | HubFeatureTeaser always for members |
| A5 Platform-admin fixture | done | FULL | `platform.admin@unionops.test` + dashboard e2e |
| A6 Live attention signals | deferred | SKIP | Adapters lack trustworthy scoped deadline summaries — keep action links only |
| A7 Hub peers mobile | done | SKIP | snippets/marketplace/overdue already in `hub.mobile` overflow matrix |
| A8 A11y manual checklist | partial | NARROW | Scripted Hub evidence noted; human rows remain Not assessed |

Fit-gap: [`session-knowledge-2026-09-30-wave-a-fitgap.md`](session-knowledge-2026-09-30-wave-a-fitgap.md)

### Wave B — Comms / poster / canvas

| ID | Status | Verdict | Notes |
|----|--------|---------|-------|
| B1–B2 | done | NARROW | Board-banner byline → shared Checkbox; rest already migrated |
| B3 | done | SKIP | Meeting Background already on shared primitives + safe zone |
| B4 | deferred | SKIP | Art residuals demand-driven |
| B5 | deferred | SKIP | Optional growth backlog |
| B6 | human | HUMAN | Steward CAAT-S sign-off |
| B7 | deferred | SKIP | COPY-006 demand-driven |
| B8 | deferred | SKIP | Caption packs need content owners |

Fit-gap: [`session-knowledge-2026-09-30-wave-b-fitgap.md`](session-knowledge-2026-09-30-wave-b-fitgap.md)

### Wave C — Public discovery

| ID | Status | Verdict | Notes |
|----|--------|---------|-------|
| C1–C3 | open | HUMAN | Content-owner + moderated usability |

### Wave D — Brand Kit / customization

| ID | Status | Verdict | Notes |
|----|--------|---------|-------|
| D1 Logo → baseline | done | FULL | Brand Styles asset upload + `logoAssetId` on draft/publish |
| D2 Sector bindings UI | deferred | SKIP | Table/adapter exist; UI demand-driven |
| D3 Preset catalog admin | deferred | SKIP | Bind existing presets only |
| D4 Auto-apply baseline | deferred | SKIP | Manual Apply remains correct |
| D5 Honest customization gaps | done | NARROW | Unavailable/MFA copy already honest |

Fit-gap: [`session-knowledge-2026-09-30-wave-d-f-jk-fitgap.md`](session-knowledge-2026-09-30-wave-d-f-jk-fitgap.md)

### Wave E — Data workbench

| ID | Status | Verdict | Notes |
|----|--------|---------|-------|
| E1 Guided stages | partial | NARROW | Map/review/publish + local banner |
| E2 Async jobs | deferred | SKIP | Request-scoped parse remains |
| E3 Publish impact | done | SKIP | Shipped + MFA step-up |
| E4 Records tool | done | SKIP | People + profile; docs re-baselined |
| E5–E7 Sensitivity / review / reports | partial | NARROW | Curated reports; saved defs deferred |

Fit-gap: [`session-knowledge-2026-09-30-wave-d-f-jk-fitgap.md`](session-knowledge-2026-09-30-wave-d-f-jk-fitgap.md)

### Wave F — Portal member UX

| ID | Status | Verdict | Notes |
|----|--------|---------|-------|
| F1 Access / share / updates UI | done | SKIP | Access panel + reason + shares + updates |
| F2 Postgres browser lifecycle | partial | HUMAN | Local Portal durability smoke passed; browser lifecycle / process-restart still need Playwright + operator fixture |

## Track T2 — Durability + Launch Trust

| Wave | Status | Notes |
|------|--------|-------|
| G Postgres flip | local done / prod HUMAN | `ops:verify-durable` passed on Docker Postgres 16; production host flip still Ryan |
| H Portal cutover | local smoke done / prod HUMAN | `db:portal-durability-smoke` passed after policy REALIGN; `PORTAL_DB_BACKEND` prod flip needs operator |
| I Launch packets 1–10 | open | Living LAUNCH tracker; human evidence / counsel |

Fit-gap: [`session-knowledge-2026-09-30-wave-g-i-durable.md`](session-knowledge-2026-09-30-wave-g-i-durable.md)

## Track T3 — Stretch

| Wave | Status | Notes |
|------|--------|-------|
| J Outreach P4 SSE | deferred | SKIP — still product-deferred |
| K1 CMEK / SSE-KMS | done | `aws:kms` + key id; host evidence |
| K2 Signed URLs | deferred | SKIP — stretch |
| L Website multi-page MVP | done | Optional `multiPage` export |

## Fit-gap log

| Date | IDs | File |
|------|-----|------|
| 2026-09-30 | A1–A5 (+A6–A8 disposition) | [session-knowledge-2026-09-30-wave-a-fitgap.md](session-knowledge-2026-09-30-wave-a-fitgap.md) |
| 2026-09-30 | B1–B8 | [session-knowledge-2026-09-30-wave-b-fitgap.md](session-knowledge-2026-09-30-wave-b-fitgap.md) |
| 2026-09-30 | L1–L3 + C–K status | [session-knowledge-2026-09-30-wave-l-program-status.md](session-knowledge-2026-09-30-wave-l-program-status.md) |
| 2026-09-30 | D1–D5, E1–E7, F1–F2, J, K1–K2 | [session-knowledge-2026-09-30-wave-d-f-jk-fitgap.md](session-knowledge-2026-09-30-wave-d-f-jk-fitgap.md) |
| 2026-09-30 | G–I durable + Launch disposition | [session-knowledge-2026-09-30-wave-g-i-durable.md](session-knowledge-2026-09-30-wave-g-i-durable.md) |

## Program completion rule

Goal is **not** complete while any ID remains OPEN without SKIP/HUMAN/BLOCKED disposition, or while G/H/I claim **production** evidence without host/counsel proof. Remaining human/open: **C**, **I**, production flips for **G/H**, plus A2/A8/B6 human rows.
