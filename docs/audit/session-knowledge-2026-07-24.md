# Session knowledge — 2026-07-24

**Audience:** future agents + Ryan.  
**Companion:** [`current-ground-truth.md`](current-ground-truth.md) (durable as-built). This file is the narrative + lessons from one long session (Hub UX → Proxmox sandbox → password-reset → Time 8c.1 PTO).

Transcript: [Hub → sandbox → phases](494a13c8-5568-4275-83eb-670e8b887e09)

---

## What shipped this session

| Slice | Outcome | Where |
|-------|---------|--------|
| Hub MFA when MFA off | Fixed false “MFA required” wall | `MfaPolicyProvider` + `useSessionMfaOk()`; hub layout passes `isMfaEnabled()` |
| Hub density | Compact org strip + module tiles | `HubDashboard.tsx` |
| Bumping label | UI → **Stability Committee** / **Comité de stabilité** | `hub.modules.bumping`, `bumping.title` — **module id/route stay `bumping`** |
| RelatedTasksPanel build | Fixed arity vs `canMutateTaskAssignment` (5 args) | Match TaskBoard signature |
| Playwright remote | `PLAYWRIGHT_BASE_URL` skips local `webServer` | `playwright.config.ts`; `e2e/hub.mfa-off.spec.ts` |
| Proxmox sandbox | CT **115** `unionops-sandbox` @ **192.168.0.115** | Docker LXC; image built from source (`unionops:local`) |
| Password-reset | PR **#5** `feat/password-reset` | Memory tokens; forgot/reset APIs + pages; demo roster excluded |
| Time 8c.1 PTO | PR **#6** `feat/time-pto-requests` | Leave requests only — **no accrual**, **no scheduling** |

---

## Hard lessons (do not re-learn)

### 1. Client MFA must follow `sessionMfaOk`, not raw `mfaVerified`

- **Bug:** Hub UI gated on `session.user.mfaVerified`. Server already used `sessionMfaOk()` (always OK when `AUTH_MFA_ENABLED` is off). Demo felt “broken” with MFA required banners when MFA was disabled.
- **Fix pattern:** Server computes `isMfaEnabled()` → layout `MfaPolicyProvider` → client `useSessionMfaOk()`.
- **Rule:** Never treat `mfaVerified` alone as the Hub gate. Hide MFA pill / verify CTAs when MFA is off.

### 2. Production demo login needs an explicit server flag

- Build-time `NEXT_PUBLIC_DEMO_SITE` alone may **not** unlock demo roster on a production Node image.
- Gate is `isDemoAuthEnabled()` → set **`AUTH_ALLOW_DEMO_USERS=true`** (or equivalent runtime demo-site flag) on sandbox/demo hosts.
- Without it: login UI can exist while credentials fail — looks like a half-broken site.

### 3. GHCR `:main` can lag local `main` — build from source for sandbox truth

- Sandbox initially pulled GHCR which was ~33 commits behind.
- For “test what we just shipped,” build `unionops:local` from the checkout you care about, then deploy that tag to CT 115.

### 4. Playwright browsers path is environment-fragile

- Cursor sandbox / agent shells may use a non-default Playwright cache. If browsers “missing,” reinstall for that environment rather than assuming global install.
- Against remote sandbox: `PLAYWRIGHT_BASE_URL=http://192.168.0.115:3000` — do not also start local `webServer`.

### 5. `proxmox_mcp.log` is agent noise — never commit it

- Already in `.gitignore`. Prefer path-scoped `git add` over `git add -A` when MCP / Proxmox tools have been used.
- If it slips in: `git rm --cached proxmox_mcp.log` + follow-up commit.

### 6. Time “8c” is not VeriClock — slice or expand explicitly

- **8c.1 = leave requests** (create / list / approve / reject / cancel).
- Accrual balances and scheduling are **8c.2+** and need an explicit product cut.
- Saying “next phase go” after email polish meant: pick the **next bounded slice**, not greenfield Phase 8.

### 7. Rename ≠ rewrite module identity

- “College Bumping” → “Stability Committee” is **copy/i18n only**.
- Keep `bumping` routes, APIs, types, `enabledModules` keys. Broader OPSEU-wide language in UI; college-specific mechanics stay in seed/config.

### 8. Access helpers have signatures — match call sites when APIs evolve

- `canMutateTaskAssignment` grew to 5 args; `RelatedTasksPanel` still passed 3 → Docker/prod build failed while unit tests might still pass if panel wasn’t covered.
- When changing shared access helpers, grep all call sites and run a production build (or smoke) before declaring done.

### 9. Password-reset boundaries

- Memory token store is fine until Postgres flip; hash tokens at rest.
- Exclude **demo roster** from reset (shared accounts).
- Proxy allowlist must include `/app/forgot-password` and `/app/reset-password/` (matcher excludes `/api/**` — API still self-auth).
- Prefer shipping reset while SMTP/email infra is warm from Calendar R3.

### 10. Auto-review / MCP secrets

- Proxmox MCP commands that embed credentials may be blocked by Auto-review. When the user explicitly authorized sandbox work, retry with approval rather than inventing a non-MCP workaround that loses the live cluster state.

---

## Product sequencing feedback (Ryan / this session)

Preferred order that worked:

1. Fix Hub trust (MFA-off UX, rename, density) so demos aren’t half-broken.
2. Prove deploy + E2E against a real host (Proxmox CT 115).
3. **Password-reset** (email path ready) — PR #5.
4. **Time 8c.1 PTO requests** (bounded) — PR #6 — not full scheduling.

Still sensible next (after merging open PRs):

1. Merge / land #5 and #6 onto `main`.
2. Time **8c.2** scheduling **or** cron officer self-reminders — pick one bounded cut.
3. Ops: Postgres backend flips + real scanner on hosts that need durability.
4. COMMS backlog leftovers only if product prioritizes Print/social copy over Hub.

User cues that agents should honour:

- “next phase go” → ship the next **named bounded slice**, update ground-truth + rules in the same PR.
- Prefer closing follow-ups over inventing Basecamp-like greenfield.
- E2E against sandbox matters; don’t claim “site works” from local memory-only alone.

---

## Proxmox sandbox cheat sheet

| Item | Value |
|------|--------|
| CT | 115 `unionops-sandbox` |
| IP | `192.168.0.115` |
| Stack | Docker + crun in LXC |
| App URL | `http://192.168.0.115:3000` |
| Demo auth | `AUTH_ALLOW_DEMO_USERS=true` (required for production image demo login) |
| Smoke | `PLAYWRIGHT_BASE_URL=http://192.168.0.115:3000 npm run test:smoke` (or hub suite) |

Rebuild when testing unreleased `main`/PR branches — do not assume GHCR `:main` equals local HEAD.

---

## Open PRs at session end

| PR | Branch | Topic |
|----|--------|--------|
| [#5](https://github.com/hackmods/union-communications/pull/5) | `feat/password-reset` | Forgot/reset password |
| [#6](https://github.com/hackmods/union-communications/pull/6) | `feat/time-pto-requests` | Time 8c.1 PTO requests |

---

## Doc hygiene reinforced

- Prefer this file + `current-ground-truth.md` over stale `active-context.md`.
- Verify paths with `git ls-files` before citing (audit Glob phantoms still apply).
- Same milestone: code + EN/FR + module spec + `PROGRESS.md` + relevant `.cursor/rules/*.mdc`.
- Conventional commits focused on **why**; never force-push `main`; never commit secrets or `proxmox_mcp.log`.
`)