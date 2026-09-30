# Session knowledge — Wave D–F / J–K fit-gap (2026-09-30)

## Wave D — Brand Kit / customization

| ID | Verdict | Notes |
|----|---------|-------|
| **D1** Logo in baseline draft | **FULL → shipped** | Brand Styles uploads via `/api/site-admin/customization/assets`, passes `logoAssetId` to baseline draft/publish; prior logo preserved when omitted; clear with `null`. Pure builder in `brand-baseline-layer.ts`. |
| **D2** Sector / collection bindings UI | **SKIP** | `customization_preset_bindings` + adapter exist; productizing sector matrix UI remains demand-driven (no steward request this sprint). |
| **D3** Preset catalog admin | **SKIP** | Code-free Comms preset CRUD would rewrite `unionPresets.ts` ownership — deferred; Site Admin already binds existing presets. |
| **D4** Auto-apply published baseline | **SKIP** | Intentional opt-in: `BrandBaselineApplyButton` — never silent overwrite of steward kits (matches brand-kit-admin plan). |
| **D5** Customization honest gaps | **NARROW** | Baseline unavailable copy + customization card already surface host MFA/env requirements; no fabricated “ready” claims. |

## Wave E — Data workbench

| ID | Verdict | Notes |
|----|---------|-------|
| **E1** Guided import stages | **NARROW / partial** | Map → review → publish chrome + active-local banner shipped; full Dataset→History stage machine deferred. |
| **E2** Async parse jobs + progress | **SKIP / deferred** | Still request-scoped; durable job runner is a separate milestone. |
| **E3** Publish impact review | **SKIP (done)** | Impact summary + MFA step-up on publish. |
| **E4** Records officer tool | **SKIP (done)** | People search + `PersonProfilePanel` (not JSON dump). `DATA_WORKBENCH.md` re-baselined. |
| **E5–E7** Sensitivity / review / reports | **NARROW / deferred** | Partial sensitivity copy + curated Reports; saved definitions + deeper review remain P1/P2. |

## Wave F — Portal member UX

| ID | Verdict | Notes |
|----|---------|-------|
| **F1** Access explanation / sharing / updates | **SKIP (done)** | `GrievanceAccessPanel`, attachment share toggle, member updates, authorization reason on detail. |
| **F2** Postgres browser revocation/lifecycle | **BLOCKED** | Needs durable Portal fixture + Docker Postgres (same gate as Wave G/H). |

## Wave J — Outreach P4 SSE

| ID | Verdict | Notes |
|----|---------|-------|
| **J1** Floor / broadcast SSE | **SKIP / deferred** | Still product-deferred in PROGRESS/LOCAL_PORTAL; no SSE consumer in outreach today. |

## Wave K — CMEK / signed URLs

| ID | Verdict | Notes |
|----|---------|-------|
| **K1** SSE-KMS (CMEK) | **NARROW → shipped** | `ATTACHMENT_S3_SSE=aws:kms` + `ATTACHMENT_S3_KMS_KEY_ID`; host evidence accepts KMS; docs/`.env.example` updated. |
| **K2** Signed PUT/GET URLs | **SKIP / deferred** | Bytes still through Hub APIs; stretch remains open. |

## Lesson

Alignment Gates closed more IDs as SKIP/done than FULL. Ship the true residuals (D1 logo, K1 CMEK) and keep Docker/human evidence honest.
