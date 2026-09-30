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
| B1–B8 | open | | |

### Wave C — Public discovery

| ID | Status | Verdict | Notes |
|----|--------|---------|-------|
| C1–C3 | open | | |

### Wave D — Brand Kit / customization

| ID | Status | Verdict | Notes |
|----|--------|---------|-------|
| D1–D5 | open | | |

### Wave E — Data workbench

| ID | Status | Verdict | Notes |
|----|--------|---------|-------|
| E1–E7 | open | | Re-baseline vs 2026-09-28 first |

### Wave F — Portal member UX

| ID | Status | Verdict | Notes |
|----|--------|---------|-------|
| F1–F2 | open | | |

## Track T2 — Durability + Launch Trust

| Wave | Status | Notes |
|------|--------|-------|
| G Postgres flip | open | G1 local verify first |
| H Portal cutover | open | Ryan authorizes H4 |
| I Launch packets 1–10 | open | Update LAUNCH_TRUST_LEGAL_REFACTOR.md |

## Track T3 — Stretch

| Wave | Status | Notes |
|------|--------|-------|
| J Outreach P4 SSE | open | |
| K CMEK / signed URLs | open | |
| L Website multi-page MVP | open | |

## Fit-gap log

| Date | IDs | File |
|------|-----|------|
| 2026-09-30 | A1–A5 (+A6–A8 disposition) | [session-knowledge-2026-09-30-wave-a-fitgap.md](session-knowledge-2026-09-30-wave-a-fitgap.md) |
