# Session knowledge — CapRover app-level deploy method drift (2026-09-16)

**Audience:** future agents + Ryan (ops).  
**Companions:** [`session-knowledge-2026-08-25-caprover-buildkit.md`](session-knowledge-2026-08-25-caprover-buildkit.md) (root BuildKit / OOM), [`.cursor/rules/caprover-docker.mdc`](../../.cursor/rules/caprover-docker.mdc), [`docs/guides/CAPROVER_POSTGRES.md`](../guides/CAPROVER_POSTGRES.md), [`.github/workflows/ci.yml`](../../.github/workflows/ci.yml).

---

## Symptom

Production deploy failed in CapRover UI with the on-droplet builder:

```
Step 22/60 : ARG SENTRY_AUTH_TOKEN=
…
Step 30/60 : RUN npm run build
npm error signal SIGKILL
npm error command sh -c next build
```

A second push to `main` then started the same loop. `docker-tag :main` was already pushed to GHCR but the deploy never read it — CapRover rebuilt instead.

## Diagnosis

Two independent deploy paths exist for any CapRover app, **and they don't share state**:

1. **CI `deploy:` job** (`github.actions/deploy/step Deploy pre-built GHCR image to CapRover`).
   - Runs `caprover deploy --imageName ghcr.io/<repo>:main` against the secret triplet
     `CAPROVER_SERVER + CAPROVER_PASSWORD + CAPROVER_APP`.
   - Pull + restart, **no `next build`**.
   - PR #88 (`Fix/caprover build oom deploy #88`) hardened this path: it
     refuses to fall through to `CAPROVER_WEBHOOK_URL` when the secret
     triplet is unset.
2. **CapRover app-level git webhook**. When the app's **Deployment Method** is
   `Method 1: Deploy from GitHub`, CapRover pulls the branch into a
   scratch container, runs `docker build -f ./docker/Dockerfile`, and
   rolls the resulting image out. **This is the path that OOM-SIGKILLs.**
   - It fires **independently of CI** on every push to `main` once the
     app is configured for webhook mode.
   - PR #88 did **not** touch this path — CI hardening doesn't restrict
     what CapRover does in its own webhook handler.

So when both are configured, CI's image pull fires (good) and CapRover's
webhook fires (OOM). The webhook failure surfaces first because CapRover
shows the last failed deploy in the UI even when CI's parallel path
succeeded in pushing `:main`.

## Evidence in the failure log

| Line | What it told us |
|---|---|
| `Step 22/60 : ARG SENTRY_AUTH_TOKEN=` (empty) | The droplet side of webhook rebuild — CI's docker-image job ships `SENTRY_AUTH_TOKEN` at build time; an empty arg means CapRover rebuilt from git without the secret. |
| `Step 30/60 : RUN npm run build` | Whole `Dockerfile` is executing on the droplet, not just pulling a pre-built image. |
| `npm error signal SIGKILL` | The classic TurboPack heap blow — 1–2 GB CapRover droplets cannot host `next build` (see [`session-knowledge-2026-08-25-caprover-buildkit.md`](session-knowledge-2026-08-25-caprover-buildkit.md) §35: "Heap cap default is **1536**, but worker sum still hits cap"). |

## The fix — operator + CI hardening

### Operator fix (one-time, in CapRover UI)

1. Open your **unionops** app → **Deployment** tab.
2. Change **Deployment Method** from `Method 1: Deploy from GitHub` to
   **`Method 3: Use Docker Image`**.
3. Set image name: `ghcr.io/hackmods/union-communications:main`.
4. Save, then **Force redeploy** (or `Restart with new image tag`).

After this the app reads `:main` from GHCR. `captain-definition` (which
encodes the Dockerfile path) is **not** consulted by Method 3 — it's only
Method 1 that uses it.

### CI-side hardening (this commit, `bd312c9` follow-ups)

- **Post-publish GHCR verification** — a new step in `.github/workflows/ci.yml`
  immediately after `Push demo / workshop image`. It runs `docker buildx
  imagetools inspect …:main` and compares the digest against the per-SHA
  `:sha-<7>` tag published by the same job. A drift (expired token,
  registry republish issue, stale image) fails loud with `::error::`
  before the deploy job runs, so we never roll out a `:main` that is
  not the CI's expectation for this SHA.
- **Operator guidance strengthened** — `docs/guides/CAPROVER_POSTGRES.md`
  row in the UnionOps table now reads `**Method 3: Use Docker Image**`
  with `:main`, with a sentence explaining why Method 1 still risks the
  OOM even with PR #88 in place.

### Documentation

- `docs/audit/session-knowledge-2026-09-16-caprover-app-config-drift.md`
  (this file).
- `.github/workflows/ci.yml` comment on the new verification step.

## Lessons

- **L-α — Two independent deploy paths can disagree.** CI's `deploy:` job
  pulls `:main`; CapRover's webhook rebuilds from `main`. They both fire
  on push. Hardening one doesn't harden the other. Audit both paths
  before assuming "the deploy job is the deploy".
- **L-β — Operator config drift is invisible in CI.** The webhook path
  lives in CapRover's app UI / DB, not in the repo. A single bad click
  brings the OOM regression back without touching a file. Once
  switched, re-audit any time someone touches the app's **Deployment**
  tab.
- **L-γ — Verify registry state before deployment, not after.**
  Post-publish drift checks in CI catch three failure modes at once:
  registry auth expired, container tag absent after push, and a `:main`
  republish that points at an older digest. The check costs ≤ 10s of
  job time and runs before the deploy job fires.
- **L-δ — "Method 1 + Dockerfile path" is the OOM-prone default; OOM-safety
  requires "Method 3 + GHCR image".** Documenting this in the table
  next to "Container HTTP Port = 3000" makes it the right-shaped setting
  on first app creation.

## Hand-off

- Anyone editing the unionops CapRover app's **Deployment** tab: do not
  flip back to `Method 1`. The PR #88 hardening only protects CI's
  pull path; the webhook re-OOMs on small droplets. If `:main` ever
  fails to deploy, force `Method 3` to redownload the GHCR image.
- Anyone editing `.github/workflows/ci.yml`: the post-publish verification
  step is **mandatory after `Push demo / workshop image`**. Do not
  remove it; it is the only signal that blocks a stale `:main` tag from
  being auto-rolled out by an unrelated CapRover process.
