# Session knowledge — 2026-07-24 / 2026-07-25

**Audience:** future agents + Ryan.  
**Companion:** [`current-ground-truth.md`](current-ground-truth.md) (durable as-built).

Transcripts:
- [Hub → sandbox → phases](494a13c8-5568-4275-83eb-670e8b887e09) (earlier: Hub MFA, Proxmox, password-reset, 8c.1)
- Autonomous feature train continued same day → PRs **#4–#10** merged to `main`

---

## What shipped (full arc)

| Slice | PR | Outcome |
|-------|-----|---------|
| Hub MFA when MFA off | `cc3dafc` / #4 | `MfaPolicyProvider` + `useSessionMfaOk()` |
| Hub density + Stability Committee rename | same | UI only; module id stays `bumping` |
| RelatedTasksPanel arity | #3/#4 | Match `canMutateTaskAssignment` 5-arg signature |
| Password-reset | **#5** | Memory tokens; demo roster excluded; proxy allowlist |
| Time 8c.1 PTO requests | **#6** | Leave CRUD; no accrual |
| Time 8c.2 shifts | **#7** | `TimeShift` draft/publish; optional `shiftId` on clock-in |
| Time 8c.3 PTO accrual | **#8** | `PtoBalance` set/adjust; approve debits `hoursRequested` |
| Cron officer reminders | **#9** | `GET\|POST /api/cron/meeting-reminders` + `CRON_SECRET`; roster emails only |
| Time 8d-lite + 8e + GM invite | **#10** | Weekly OT CSV flag; pay-period snap; GPS consent; Graphic Maker notice `InviteEmailPanel` |
| Pristine Office Templates | — | **Already shipped 2026-07-15** — do not rebuild |

`main` tip after train: merge of #10 (`eb31a16` area). Prefer `git log` over this table if docs lag.

---

## Hard lessons (do not re-learn)

### 1. Client MFA must follow `sessionMfaOk`, not raw `mfaVerified`

Server already used `sessionMfaOk()` when MFA is off. Client must use `useSessionMfaOk()` / `MfaPolicyProvider`. Never gate Hub on raw `mfaVerified` alone.

### 2. Production demo login needs `AUTH_ALLOW_DEMO_USERS=true`

`NEXT_PUBLIC_DEMO_SITE` alone may not unlock demo roster on a production Node image. Without the server flag, login UI works while credentials fail.

### 3. GHCR `:main` can lag — build from source for sandbox truth

Proxmox CT **115** @ `192.168.0.115`. Rebuild `unionops:local` from the checkout under test.

### 4. Playwright remote base URL

`PLAYWRIGHT_BASE_URL=http://192.168.0.115:3000` skips local `webServer`. Reinstall browsers if the agent sandbox cache path is empty.

### 5. Never commit `proxmox_mcp.log`

Gitignored. Prefer path-scoped `git add` over `git add -A` after MCP/Proxmox work.

### 6. Time Phase 8 is numbered slices — not VeriClock

| Slice | Means | Not |
|-------|-------|-----|
| 8c.1 | Leave requests | Accrual |
| 8c.2 | Explicit shifts | Recurrence / auto-timesheet |
| 8c.3 | Manual balances + approve debit | Auto-accrual formulas |
| 8d-lite | Weekly OT CSV flag + 14-day snap | Full payroll engine |
| 8e | GPS consent on roster + punch gate | Continuous tracking |
| 8f | (deferred) hybrid slice / punch photos | Silent expansion |

“next phase go” / “build all dreamed features” → ship **bounded slices** with docs in the same PR; skip VISION non-goals (dues, member broadcast lists, `/member` portal).

### 7. Rename ≠ rewrite module identity

Stability Committee = i18n only. Routes/APIs/`enabledModules` stay `bumping`.

### 8. Access-helper arity breaks Docker builds

When shared helpers change signatures, grep all call sites. Unit tests may miss uncovered panels.

### 9. Password-reset + cron boundaries

- Reset: memory tokens OK; exclude demo roster; proxy allowlist for forgot/reset pages.
- Cron: `CRON_SECRET` (Bearer or `x-cron-secret`); emails **officer roster** addresses only for Hub events in window; still needs `EMAIL_ENABLED` + SMTP to send. **Never** member lists (ADR-016).

### 10. Three email/reminder surfaces stay separate

1. Public Comms invite (`event-email.ts` / `InviteEmailPanel`) — copy/mailto  
2. Hub R2 officer reminder **draft** (`membership-meeting-reminder.ts`) — copy/mailto  
3. Hub R3 / cron SMTP — opt-in, officer inbox / roster only  

Graphic Maker notice layout now hosts `InviteEmailPanel` (R0.5 stretch) — still public Comms, not Hub.

### 11. React lint: do not `setState` sync inside `useEffect` for derived UI

GPS consent was derived from `workers` + session via effect → ESLint `react-hooks/set-state-in-effect`. Fix: derive `gpsConsented` from roster in render; update roster via fetch callback after consent API.

### 12. ISO week tests need same-week fixtures

`isoWeekKey` is UTC ISO week — pick Mon–Sat in the **same** week when asserting weekly OT flags (2030-01-06 vs 01-11 spanned weeks).

### 13. Audit FEAT/ORG/FUTURE tickets are largely closed

Before inventing “dreamed” Hub features, read `execution-backlog.md` + ground-truth. Remaining work is mostly Time 8f, ops Postgres flips, durable reset tokens, COMMS fifth-channel guide — not Basecamp greenfield.

### 14. Plan files can be stale

`.cursor/plans/pristine_office_templates.plan.md` still shows pending todos; PROGRESS marks it shipped 2026-07-15. **Diff docs vs code** before implementing.

### 15. Merge conflicts on feature branches vs `main`

When landing stacked PRs (#6 after #5), resolve roadmap/PROGRESS/ground-truth by **keeping both shipped sections**, not either-or.

### 16. Auto-review may block push/PR from agent shells

User authorized autonomous train → retry with approval for commit/push/`gh pr create`/`gh pr merge`. Do not invent non-git workarounds that leave work unmerged.

---

## Product sequencing that worked

1. Hub trust (MFA-off, rename, density)  
2. Sandbox E2E proof  
3. Password-reset (#5)  
4. Time 8c.1 → 8c.2 → 8c.3 → cron → 8d-lite/8e/GM invite (#6–#10)  

Skip: dues/PCI, member marketing lists, full VeriClock as one blob, CMEK.

---

## Proxmox sandbox cheat sheet

| Item | Value |
|------|--------|
| CT | 115 `unionops-sandbox` |
| IP | `192.168.0.115` |
| App | `http://192.168.0.115:3000` |
| Demo auth | `AUTH_ALLOW_DEMO_USERS=true` |
| Smoke | `PLAYWRIGHT_BASE_URL=http://192.168.0.115:3000` (+ skip local webServer) |
| Cron | `CRON_SECRET` + `EMAIL_ENABLED` for `/api/cron/meeting-reminders?days=7` |

---

## Sensible next (after this train)

1. Ops: flip `*_DB_BACKEND=postgres` + real scanner on durability hosts  
2. COMMS email/broadcast guide (fifth channel — only if product expands channels)  
3. Time **8f** hybrid slice / punch photos — **explicit product cut required**  
4. Redeploy sandbox from latest `main` and re-run hub smoke  

Password-reset durable Postgres tokens — **shipped** (`AUTH_USERS_BACKEND=postgres` + migration `0024`).

---

## Doc hygiene

- Prefer this file + `current-ground-truth.md` over `active-context.md`  
- Verify paths with `git ls-files` (Glob phantoms still apply)  
- Same milestone: code + EN/FR + module spec + `PROGRESS.md` + `.cursor/rules`  
- Never force-push `main`; never commit secrets or `proxmox_mcp.log`
