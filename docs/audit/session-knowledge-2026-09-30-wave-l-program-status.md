# Session knowledge — Wave L + program mid-status (2026-09-30)

## Wave L — Website multi-page MVP

| ID | Verdict | Notes |
|----|---------|-------|
| L1–L3 | **FULL → shipped** | Optional `multiPage` on draft/config/export; emits `about.html`, `leadership.html`, `contact.html` with shared nav; default remains single brochure. Privacy stub unchanged. Unit coverage in `layouts.test.ts`. What's new: `website-multi-page`. |

## Remaining program disposition (Alignment Gate)

Human / host blocked items stay open — agents must not invent counsel approval or claim unrun Postgres.

| Wave | Status | Notes |
|------|--------|-------|
| **C** Public discovery | HUMAN | estimatedMinutes content review + moderated EN/FR usability + SR editorial |
| **D** Brand Kit admin | OPEN | Logo upload / sector bindings / preset catalog / baseline auto-apply / customization honest gaps — not started this sprint after Gate |
| **E** Data workbench | OPEN | Re-baseline vs 2026-09-28 Records/Reports still required before P0 rebuilds |
| **F** Portal member UX | OPEN | Access explanation / sharing / revocation browser flows |
| **G** Postgres flip | BLOCKED | `ops:verify-durable` ECONNREFUSED — no local Postgres on this host |
| **H** Portal cutover | BLOCKED | Depends on G + Ryan authorization |
| **I** Launch Trust 1–10 | PARTIAL/HUMAN | Code largely present; evidence/legal/CASL/MFA host drills remain Ryan/counsel |
| **J** Outreach P4 SSE | OPEN | Still deferred product |
| **K** CMEK / signed URLs | OPEN | Stretch |

## Lesson

Ship concrete vertical slices (Wave A Hub, Wave B residual, Wave L multi-page) while recording honest SKIP/HUMAN/BLOCKED for the rest keeps the master tracker trustworthy.
