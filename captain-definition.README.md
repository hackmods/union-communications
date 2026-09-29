# captain-definition

`captain-definition` (sibling) is the CapRover build manifest for
**Method 1: Deploy from GitHub** (git webhook). It tells CapRover to build
the image on the droplet using `./docker/Dockerfile`.

If you keep the app on Method 1, every push to `main` triggers an on-droplet
`docker build` → `next build` → OOM-SIGKILL on small CapRover droplets.
PR #88 ([`Fix/caprover build oom deploy`](.github/workflows/ci.yml))
hardens the **CI `deploy:` job** path, but it cannot restrict
CapRover's own webhook handler — those are independent.

**Recommendation:** the unionops app should run on **Method 6: Deploy via
ImageName** with image `ghcr.io/hackmods/union-communications:production`
(live bake: `NEXT_PUBLIC_DEMO_SITE=false`). Workshop hosts may pull `:main`
instead. CapRover pulls the pre-built GHCR image and restarts without
rebuilding on the droplet. `captain-definition` is consulted only when the
deployment method is git webhook / Method 3 in current CapRover UI numbering;
once you flip to ImageName, this file is unused.

Audit: [`session-knowledge-2026-09-16-caprover-app-config-drift.md`](docs/audit/session-knowledge-2026-09-16-caprover-app-config-drift.md)
(columns "Deploy method" in
[`docs/guides/CAPROVER_POSTGRES.md`](docs/guides/CAPROVER_POSTGRES.md)).
