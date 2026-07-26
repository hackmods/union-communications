# Check-ins (automatic)

Basecamp-style recurring questions for local officers. Opt-in HubModule `checkins`.

## Entities

- **`CheckinSchedule`** — question, cadence (`daily` | `weekdays` | `weekly`), optional `weekday` (0–6 UTC) for weekly, `active`
- **`CheckinAnswer`** — one answer per `(scheduleId, periodKey, authorId)`

Period keys are UTC `YYYY-MM-DD` (see `src/lib/checkins/periods.ts`). Weekday schedules have no active period on Sat/Sun.

## Surfaces

| Surface | Path |
|---------|------|
| List + create | `/app/checkins` |
| Detail + answers | `/app/checkins/[id]` |
| Dashboard widget | `MyCheckinsWidget` (unanswered) |
| APIs | `/api/checkins`, `/api/checkins/mine`, `/api/checkins/[id]`, `/api/checkins/[id]/answers` |

## Persistence

Default **memory** (`CHECKINS_DB_BACKEND`). Postgres + RLS via migration `0025_checkins.sql`.

## RBAC

- Access: same officer set as Discussions (incl. steward / solo)
- Manage schedules: president, exec, elevated admins
- MFA + `enabledModules` gate on pages and APIs

## Non-goals (v1)

Email/cron nudges, Campfire chat, hill charts, calendar aggregation.
