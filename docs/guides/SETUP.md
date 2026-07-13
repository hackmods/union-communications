# Local setup

UnionOps — stewarded by Ryan Morris. Source-available; see [`LICENSE`](../../LICENSE).

## Requirements

- Node.js **22.13+** (see `package.json` `engines`)
- npm (lockfile is committed)

## Install

```bash
git clone https://github.com/hackmods/union-communications.git
cd union-communications
npm ci
cp .env.example .env.local
```

Generate a secret for Auth.js:

```bash
openssl rand -base64 32
```

Put the value in `.env.local` as `AUTH_SECRET`. Set `AUTH_URL=http://localhost:3000` for local runs.

## Default brand (self-host / union-agnostic)

First-visit Brand Kit colours and local details come from **host defaults**, not from any one union:

1. Edit [`config/host-brand.json`](../../config/host-brand.json), or copy the OPSEU-oriented example:

   ```bash
   npm run brand:set -- --from=config/host-brand.example.json
   ```

2. Or set colours/local in one command:

   ```bash
   npm run brand:set -- --primary=#CE1126 --secondary=#FFFFFF --local=79 --sub="Hospital Workers"
   ```

3. Or set `NEXT_PUBLIC_BRAND_*` / `NEXT_PUBLIC_DEFAULT_*` in `.env.local` (see [`.env.example`](../../.env.example)). Env wins over the JSON file.

Restart `npm run dev` after changing the JSON file. Browsers that already saved a Brand Kit keep it until reset or import.

Logo Builder (`/tools/logo-builder`) has **Save to Brand Kit** so colours, local number, and logo choice apply across the site chrome and other tools.

## Run

```bash
npm run dev          # http://localhost:3000/en
npm run build && npm start
```

## Tests

```bash
npm run lint
npm run typecheck
npm run test:unit
npm run test:smoke   # Playwright; needs browsers installed once
```

## Demo Officer Hub (development only)

Demo accounts (password `demo123`) exist for local CI and workshops. They are documented in the README.

**Public launch toggle:** set `NEXT_PUBLIC_OFFICER_HUB_PUBLIC=true` in `.env.local` to show the Officer Hub header CTA and hub-forward marketing copy. When unset (default), the public site stays Comms-focused; `/app` remains reachable for demos and CI.

**Do not** use demo passwords for real member casework on a public host. MFA in development accepts any 6-digit code — that is not production MFA.

## Project docs

- Vision: [`docs/VISION.md`](../VISION.md)
- Architecture: [`docs/ARCHITECTURE.md`](../ARCHITECTURE.md)
- Compliance: [`docs/COMPLIANCE.md`](../COMPLIANCE.md)
- Deploy: [`DEPLOY.md`](DEPLOY.md)
