# Grievance Module

## Status: Phase 2 MVP (shipped) · Hybrid export Phase 4

Union-agnostic grievance tracking. CA steps and deadlines configured per union/local.

## Hybrid mode (Phase 4)

Encrypted bulk export/import of all accessible grievances for a local lives at `/app/hybrid`.
Passphrase encryption is client-side (Web Crypto); the hub API exchanges plaintext slices only over MFA sessions.
See `docs/PROGRESS.md` Phase 4.

## QOL (Phase 5)

- Member communication log and meeting scheduler (ICS) on grievance detail
- CA snippet insert into officer notes
- Overdue board at `/app/overdue`
- Officer handoff at `/app/handoff`

## Entities

### Grievance
- `id`, `unionId`, `localId`
- `memberPseudonym` (optional real name — encrypted)
- `category`, `status`, `currentStep` (from CAConfig)
- `filedAt`, `resolvedAt`
- `assignedStewardId`

### GrievanceOutcome (FEAT-004)
- Optional 1:1 arbitration / settlement record: `outcomeType` (`upheld` | `denied` | `settled` | `withdrawn`), remedy, settlement terms, arbitrator, hearing/decision dates
- API: `GET`/`POST /api/grievances/[id]/outcome`; surfaced on grievance detail; included in export bundle
- CA step may set optional `appealDays` (calendar days after `decidedAt`) — distinct from step `responseDays` (often `null` at Arbitration)

### GrievanceEvent
- Timeline: meeting scheduled, step filed, response received, deadline
- `dueAt`, `completedAt`, `stepNumber`

### GrievanceNote
- Immutable officer notes: `authorId`, `body`, `createdAt`
- Internal only — never shown to member portal

### GrievanceDocument
- Attachments: management response, CA excerpts, member statements
- Stored in object storage; virus-scanned on upload

### FollowUpEmail
- Draft templates: Step 1 meeting request, extension, member update
- **Never auto-send** — steward reviews and sends manually

### CAConfig (per union/local)
```typescript
{
  steps: [
    { number: 1, name: "Step 1", responseDays: 5 },
    { number: 2, name: "Step 2", responseDays: 10 },
    { number: 3, name: "Step 3", responseDays: 15 },
    { number: 4, name: "Arbitration", responseDays: null }
  ]
}
```

## Features

- Deadline calculator from `filedAt` + CAConfig
- Step escalation checklist
- Export grievance bundle (PDF/ZIP) for arbitration
- Email draft templates (EN/FR)
- Dashboard: overdue grievances, upcoming deadlines

## Compliance

- MFA required
- Full audit log on view/edit
- Pseudonym option for member identity
- 7-year retention default post-resolution

## Public playbook (2026-08-26)

`/guide/grievance-process` teaches how to open and walk a file (forum gate, 6 W's, clocks, CA-named jobs). The printable 6 W's sheet is Document Generator preset `grievance-intake` (on-device Excel). Do not render live tenant `grievanceConfig` on the public guide.

## Workflow stages (2026-09-23)

Hub files use `workflowStage: "intake" | "formal"` as the primary Stage 1 / Stage 2 machine. CA `currentStep` clocks apply only on **formal** files. New creates default to intake; officers advance with **Advance to formal file**. Informal Log convert seeds an intake file.

Create form captures 6 W’s + remedy, grievance type, member names, linked CA snippet snapshots, and Brand Kit–prefilled `localLabel` / `unitLabel` (editable snapshots). Human-readable `fileNumber` (`GRV-YYYY-NNNN`) is generated on create. Outcome records support mediator + sent-to-arbitration fields. Export ZIP/PDF includes the new fields and uses Brand Kit primary colour for the PDF title.

## Steward Quick-Log visibility

Informal Log entries require `visibility`: `private` | `local_executive` | `area_officer` (default/backfill `local_executive`). Enforced in `canViewInformalLogEntry` + list filtering.

## Shipped: Hub 6 W's intake

Structured intake on [`NewGrievanceForm.tsx`](../../src/components/grievance/NewGrievanceForm.tsx) + adapter fields. Notes remain immutable for later commentary. Still no auto-decision, no auto-send email, no legal advice.
