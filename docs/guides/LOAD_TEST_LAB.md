# Load Test Lab — on-box capacity testing

Operator console for stressing **this CapRover host** from the host itself. Linked from `/build`. Not a steward Comms tool.

Live (when enabled): `https://unionops.org/load-test-lab/`  
Local: `http://localhost:3000/load-test-lab/`

Sibling of [Viewport Lab](VIEWPORT_LAB.md) under **QA Labs**.

## What it measures

**On-box capacity (generator co-located).** The Node load runner shares CPU/RAM with the UnionOps app. Numbers are conservative versus “external users only.” That is intentional for a single-droplet shop.

VU count ≠ requests/sec. Simulated users include think-time between page/API steps.

## Safety flags (CapRover env)

| Variable | Purpose |
|----------|---------|
| `LOAD_LAB_ENABLED=true` | Master switch (default **off**) |
| `ALLOW_PRODUCTION_LOAD_TEST=true` | Required when Environment = Production |
| `LOAD_LAB_MAX_VUS` | Hard VU cap (default 1000; tiers above are skipped) |
| `LOAD_LAB_MAX_DURATION_SEC` | Per-tier steady duration cap (default 900) |
| `LOAD_LAB_MAX_RUN_SEC` | **Whole-run wall-clock kill** (default 1200 = 20 min) |
| `LOAD_LAB_RESULTS_DIR` | Optional override for `load-results/` |

Without `LOAD_LAB_ENABLED`, Start returns 403. Production also needs the allow flag **and** the Lab confirmation checkbox.

### Built-in runaway protections

| Guard | Behavior |
|-------|----------|
| Feature flags + `platform_admin` | Cannot start when disabled or unauthenticated |
| Single-flight | Second Start while running → 409 |
| Target allowlist | Only loopback or this host’s `AUTH_URL` (blocks SSRF / external hammering) |
| VU / duration / wall-clock caps | Hard limits; wall-clock aborts the AbortController |
| Capacity circuit breaker | Stops escalating tiers on failed / ≥10% errors / p95 ≥5s |
| Mid-tier breaker | Aborts *inside* a tier once enough samples show the same cliffs |
| Auth session pool | At most 8 logins per tier (shared cookies) — avoids auth DoS |
| Bounded samples | Reservoir ≤8k latencies — avoids OOM from sample arrays |
| Read-only profiles | No write-heavy / destructive production mutations |
| Manual Abort | Operator Abort API kills the in-flight run |

**Run off-hours only.** Capacity sweeps can make the site slow or unavailable for real members.

## Who can Start / Abort

`platform_admin` session with MFA satisfied (same gate as Site Admin). Sign in at `/en/app/login` first, then open the Lab.

## Profiles

| Profile | What it does |
|---------|----------------|
| Smoke | 1–2 VUs, short public browse — proves the runner |
| Public browse | Anonymous journeys (home, Create, Utilities, Learn, a couple tools, `/api/health`) |
| Officer Hub read | Credentials login once per VU, then dashboard + grievances/tasks/meetings reads |
| Capacity sweep | Staged **50 → 100 → 250 → 500 → 1000** with ramp; **aborts** escalation if error rate ≥10% or p95 ≥5s |

Write-heavy production profiles are intentionally out of scope.

## On-box workflow

1. Set CapRover env flags (above). Redeploy/restart if needed.
2. Sign in as `platform_admin`.
3. Open `/load-test-lab/`.
4. Choose environment (prefer blank Base URL → loopback on this host).
5. Start smoke first; then public or hub-read; then capacity off-hours.
6. Watch status poll; Abort if needed.
7. Read last healthy / first degraded / first failed + HTTP bottleneck hints.
8. Optional: glance CapRover app CPU/RAM and Postgres connections for the same time window — the Lab does **not** invent infra causes.

Results also write to `load-results/<run-id>/summary.json` on the host (gitignored). You can Import that JSON later.

## CLI (development)

With the app already listening locally:

```bash
npm run test:load:smoke
npm run test:load:public
LOAD_TEST_USERNAME=… LOAD_TEST_PASSWORD=… npm run test:load:hub-read
npm run test:load:capacity
```

Production CLI (rare — prefer the Lab UI on the box):

```bash
LOAD_LAB_ENABLED=true ALLOW_PRODUCTION_LOAD_TEST=true TEST_ENV=production BASE_URL=http://127.0.0.1:3000 npm run test:load:capacity
```

## Interpreting results

- **Healthy** — errors &lt;1%, p95 &lt;750ms (dynamic)
- **Degraded** — rising latency or errors approaching thresholds
- **Failed** — errors ≥5% or p95 ≥3s
- **not attempted** — circuit breaker skipped higher tiers

Hints call out throughput saturation, timeouts, auth failures, and the hottest endpoint from HTTP samples only.

## CI

No capacity jobs in normal CI. Unit tests cover thresholds, interlock, and “Start refused when disabled.”

## Architecture

- UI: `src/app/load-test-lab/`, `src/components/ops/LoadTestLab.tsx`
- API: `/api/ops/load-lab`, `/abort`, `/results`
- Engine: `src/lib/ops/load-lab/` (in-process background run on this Node instance)
