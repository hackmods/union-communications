# Session knowledge — Sticky Brand Kit across deploy and login (2026-10-03)

## Problem

Signed-in Brand Kit appeared to reset after CapRover deploys/restarts. Officers also
had to re-open Brand Kit and click **Match public site** / re-publish after login
because chrome did not keep their saved colours.

## Root cause

1. [`src/lib/hub-settings/store.ts`](../../src/lib/hub-settings/store.ts) claimed
   Postgres via `HUB_SETTINGS_DB_BACKEND`, and migration `0095` created
   `local_brand_kits` / `user_brand_overlays`, but the store only used in-process
   `Map`s. Every process restart wiped Local shared + personal overlays and
   re-seeded defaults.
2. Empty Local was **persisted** as a seed, so `hasLocalShared` looked true even
   when nobody had published.
3. Login switched to `ApiAdapter` and ignored `localStorage` (`unionops-brand-kit`).
   Api saves did not mirror back, so FOUC/logout drifted from the Hub kit.

## Fix shipped

- Memory + Drizzle adapters gated by `hubSettingsDbBackend()`; `/api/brand-kit`
  wraps resolve/write in `withRlsContext`.
- Ephemeral union seed on empty Local — **not** written until **Save as Local default**.
- One-time browser → personal overlay when Hub Local + personal are empty and the
  browser kit differs from the seed.
- Api hydrate/save/publish mirrors the effective kit into `unionops-brand-kit`.
- Brand Kit status copy names chrome source (Local Hub / personal / starter seed).

## Ops

Set `HUB_SETTINGS_DB_BACKEND=postgres` on durable hosts (already recommended on the
Host readiness board). Memory remains the demo default.

## Do not

- Auto-run **Match public site** on login (steward kit ownership stays explicit).
- Claim durability while the flag is still `memory`.
