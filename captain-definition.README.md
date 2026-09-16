# captain-definition

`captain-definition` (sibling) is the CapRover build manifest for
**Method 1: Deploy from GitHub** (git webhook). It tells CapRover to build
the image on the droplet using `./docker/Dockerfile`.

If you keep the app on Method 1, every push to `main` triggers an on-droplet
`docker build` → `next build` → OOM-SIGKILL on small CapRover droplets.
PR #88 ([`Fix/caprover build oom deploy`](.github/workflows/ci.yml))
hardens the **CI `deploy:` job** path, but it cannot restrict
CapRover's own webhook handler — those are independent.

**Recommendation:** the unionops app should run on **Method 3: Use Docker
Image** with image `ghcr.io/hackmods/union-communications:main` so the
app pulls the pre-built GHCR image and restarts without rebuilding on the
droplet. `captain-definition` is consulted only when the deployment
method is `Method 1`; once you flip to Method 3, this file is unused.

Audit: [`session-knowledge-2026-09-16-caprover-app-config-drift.md`](docs/audit/session-knowledge-2026-09-16-caprover-app-config-drift.md)
(columns "Deploy method" in
[`docs/guides/CAPROVER_POSTGRES.md`](docs/guides/CAPROVER_POSTGRES.md)).
