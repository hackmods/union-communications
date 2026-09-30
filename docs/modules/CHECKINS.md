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

## Email nudges (cron v1)

Opt-in transactional reminders for officers with a Hub account email who have not answered the **current period**.

| Item | Detail |
|------|--------|
| Route | `GET\|POST /api/cron/checkin-nudges` |
| Auth | `CRON_SECRET` (`Authorization: Bearer` or `x-cron-secret`) |
| Preview | `?dryRun=1` — job count + recipients; no SMTP, no dedupe writes, no audit |
| Dedupe | Postgres `checkin_nudge_sends` (migration `0087_checkin_nudge_sends`); memory Set in demo |
| Link target | `/app/checkins/[scheduleId]` |

Requires `EMAIL_ENABLED` + SMTP to send. Skips unions without `checkins` in `enabledModules`. Weekday cadence skips Sat/Sun (no active period).

## Non-goals (broader)

Campfire chat, hill charts, calendar aggregation, repeat nudges within the same period.
