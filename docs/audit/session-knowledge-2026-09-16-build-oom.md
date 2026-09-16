# Session knowledge — CapRover `next build` OOM (2026-09-16)

**Audience:** future agents + Ryan (ops).
**Companions:** [`CAPROVER_POSTGRES.md`](../guides/CAPROVER_POSTGRES.md), [`session-knowledge-2026-08-25-caprover-buildkit.md`](session-knowledge-2026-08-25-caprover-buildkit.md), [`.cursor/rules/caprover-docker.mdc`](../../.cursor/rules/caprover-docker.mdc), [`docker/Dockerfile`](../../docker/Dockerfile).

---

## Symptom

CapRover on-droplet build died mid-compile:

```text
npm error signal SIGKILL
npm error command sh -c next build
```

No code error — the container's memory cgroup OOM-killed the build during
"Creating an optimized production build" (Next 16.2.10, Turbopack default).

## Root cause (measured, 2026-09-16)

`NODE_OPTIONS=--max-old-space-size` **propagates to every Next build worker**, and the
cap must fit the worst single process while all processes together fit host RAM:

| Config | Result |
|--------|--------|
| Webpack @ 1024 / 2048 MB | V8 heap OOM — compile needs **> 2 GB** for this app |
| Turbopack @ 1024 MB | build worker SIGABRT (exit 134) after "Running TypeScript" |
| Turbopack @ **1536 MB** | **pass on a larger host** — 348 static pages, ~55 s. **Not sufficient on the production 1–2 GB droplet**: main + workers still exceed the cgroup and SIGKILL (observed 2026-09-16, same day). |
| Turbopack @ 2048 MB (old Dockerfile) | SIGKILL on 2 GB droplet (main + workers each allowed 2048) |

## Fix that shipped (do not regress)

| Piece | Rule |
|-------|------|
| `docker/Dockerfile` | `ARG BUILD_NODE_HEAP_MB=1536` (was 2048) — smallest per-process cap; keep Turbopack `RUN npm run build` |
| Bundler | **Do not** switch builds to webpack (`next build --webpack`) — needs > 2 GB V8 heap here |
| Docs | `.cursor/rules/caprover-docker.mdc` "Memory-safe `next build`" section; this file |
| CI deploy | `deploy` job **fails loud** (no silent webhook fallback) when `CAPROVER_SERVER/PASSWORD/APP` are unset — pull-only GHCR image deploy is the only reliable small-host path |

## Why 1536 is not a green light on small hosts

`BUILD_NODE_HEAP_MB=1536` is a **per-process floor** (1024 aborts a worker, 2048 blows a
2 GB cgroup), not a guarantee the *sum* of processes fits. `NODE_OPTIONS` propagates to
the main process **and every Turbopack worker**, so on a 1–2 GB droplet the set can still
exceed the cgroup and OOM-SIGKILL — exactly what happened on the production host after
the 1536 default shipped. The only dependable path on small droplets is to **pull the
GHCR image built in CI** (`ubuntu-latest`, far more RAM). On-host rebuilds are the
fallback and need swap.


## Why webpack was measured and rejected

The first plan assumed webpack's bounded memory would fit small hosts (Next 16 ships a
supported `--webpack` flag). Measurement showed the opposite for this app: the webpack
compile phase holds > 2 GB of **live** V8 heap (clean fatalities at both 1024 and 2048
caps). Turbopack completes a full 348-route build at a 1536 MB cap in ~55 s.

## Agent do / don't

**Do**

- Keep `BUILD_NODE_HEAP_MB=1536` default; raise via `--build-arg` on bigger hosts.
- Prefer GHCR image pull (`ghcr.io/hackmods/union-communications:main`) for CapRover; on-host rebuilds are the fallback.
- If an on-host rebuild must run on a 2 GB droplet, add ~2–4 GB swap first (`fallocate -l 4G /swapfile && chmod 600 /swapfile && mkswap /swapfile && swapon /swapfile`).
- Confirm deploy with `/api/health` `.commit`, not CapRover UI alone.

**Don't**

- Readd a webpack build path (`build:docker`) for memory reasons — it was measured and it OOMs above 2 GB.
- Lower `BUILD_NODE_HEAP_MB` below ~1536 to "save memory" — a worker aborts at 1024.
- Assume `--max-old-space-size` only affects the main process — it propagates to all build workers.

## Kickoff prompt (if regresses)

```text
CapRover next build fails with SIGKILL (OOM) during "Creating an optimized
production build". Read docs/audit/session-knowledge-2026-09-16-build-oom.md and
.cursor/rules/caprover-docker.mdc. Expected: Turbopack build, BUILD_NODE_HEAP_MB
>= 1536, GHCR image pull preferred, swap on 2 GB droplets.
```