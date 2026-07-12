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

**Do not** use demo passwords for real member casework on a public host. MFA in development accepts any 6-digit code — that is not production MFA.

## Project docs

- Vision: [`docs/VISION.md`](../VISION.md)
- Architecture: [`docs/ARCHITECTURE.md`](../ARCHITECTURE.md)
- Compliance: [`docs/COMPLIANCE.md`](../COMPLIANCE.md)
- Deploy: [`DEPLOY.md`](DEPLOY.md)
