# Contributing to UnionOps

UnionOps is **source-available**, stewarded by **Ryan Morris**. Contributions are welcome for discussion; acceptance is at the steward’s discretion.

## Before you start

1. Read [`docs/VISION.md`](docs/VISION.md) and [`AGENTS.md`](AGENTS.md).
2. Respect multi-union rules: no hardcoding a single union as the platform default.
3. Do not commit secrets, `.env` files, private keys, or real member data.

## How to propose a change

1. Open an issue describing the problem or idea (use the templates).
2. Fork or branch from `main`.
3. Keep PRs focused. Prefer small, reviewable diffs.
4. Update EN **and** FR strings when you change user-facing copy (`messages/en.json`, `messages/fr.json`).
5. Run before opening a PR:

```bash
npm run lint
npm run typecheck
npm run test:unit
```

For UI/route changes, also run `npm run test:smoke` when practical.

## License of contributions

By submitting a contribution, you assign copyright in that contribution to Ryan Morris (see [`LICENSE`](LICENSE)). Do not submit code you cannot assign.

## What we will not merge

- Analytics or third-party tracking
- Cross-union data access
- `dangerouslySetInnerHTML`
- Hardcoded OPSEU/CAAT as defaults for new tenant signups
- Secrets, credentials, or real PII

## Code of conduct

See [`.github/CODE_OF_CONDUCT.md`](.github/CODE_OF_CONDUCT.md).
