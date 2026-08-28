# Plan — Parked canvas-fonts follow-ups (2026-08-15)

Sequenced from [session-knowledge-2026-08-15-canvas-fonts.md](session-knowledge-2026-08-15-canvas-fonts.md) items still open after Website ZIP / Office Train 1 (`14ecf4e`).

## Status — complete

| # | Item | Result |
|---|------|--------|
| 1 | Quote Card / Action Card font matrix | Oswald `@smoke` + `@export` rows in `e2e/tools.fonts.smoke.spec.ts` |
| 2 | Pulse Poll font fidelity | Hub-auth Oswald `@export` (serial); authoring stays Hub-gated |
| 3 | COPY-004 FR captions | `captions.templates.*` in EN/FR messages; backlog closed |
| 4 | Ops Postgres flip | Local `npm run ops:verify-durable` green; prod flip still operator choice |
| 5 | Variable fonts | Deferred — static `public/fonts/` ≈ 278 KB |

## Explicit non-goals (honoured)

- Public Pulse Poll authoring
- OOXML binary font embed — **shipped 2026-08-27** ([`ooxml-font-embed.ts`](../../src/lib/export/ooxml-font-embed.ts)); see [`future-pdf-and-docx-engines-2026-08.md`](future-pdf-and-docx-engines-2026-08.md)
- Production Postgres flip / `HEALTH_REQUIRE_DURABLE` on live hosts
- Growing the eight-face catalog
- Per-union caption packs (still future; COPY-004 is generic FR only)
