# captain-definition

`captain-definition` (sibling) is CapRover's app build/deploy manifest.
It is consulted when CapRover deploys via git webhook / definition file
(current CapRover UI: Method 3 Github, Method 5 captain-definition).

This repo pins **image pull** so a stray webhook cannot run
`docker build` / `next build` on the droplet (OOM on small hosts):

```json
{
  "schemaVersion": 2,
  "imageName": "ghcr.io/hackmods/union-communications:production"
}
```

Live bake: `NEXT_PUBLIC_DEMO_SITE=false`. Workshop hosts that still use
git deploy should override to `:main` in CapRover, or keep CI
`workflow_dispatch` with `image_tag=main`.

**Preferred path (independent of this file):** CI `deploy` job runs
`caprover deploy --imageName` with the verified `:production` digest
(`CAPROVER_SERVER` / `PASSWORD` / `APP`). Delete any GitHub webhook to
`captain.*.*/…/triggerbuild` so Method 3 cannot fire on push.

Do **not** restore `"dockerfilePath": "./docker/Dockerfile"` on the live
unionops app — that forces on-droplet builds again.

Audit: [`session-knowledge-2026-09-16-caprover-app-config-drift.md`](docs/audit/session-knowledge-2026-09-16-caprover-app-config-drift.md);
ops: [`docs/guides/CAPROVER_POSTGRES.md`](docs/guides/CAPROVER_POSTGRES.md).
