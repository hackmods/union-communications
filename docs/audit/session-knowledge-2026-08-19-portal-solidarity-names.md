# Session knowledge — Local Portal solidarity names (2026-08-19)

**Audience:** future agents + Ryan.  
**Companions:** [ADR-017](../DECISIONS.md), [`docs/modules/LOCAL_PORTAL.md`](../modules/LOCAL_PORTAL.md), [`.cursor/rules/local-portal.mdc`](../../.cursor/rules/local-portal.mdc).

## Decision

Portal chrome should sound like **solidarity memes**, not a shop-floor glossary and not a Basecamp parody.

Similar jobs (discussions, to-dos, files) are fine. Matching Basecamp’s naming system is not. Hiring-hall / bargaining-table puns (Locker, On the table, Shop board, The push) lost to movement language.

**Test:** would a member who has never used Basecamp feel the slogan, not need a decoder ring for “dispatch hall”?

Keep the names that already live in the movement: Circle, Hall, Floor, Bulletin, Binder, Sidebars, Roll Call, Dispatch, Roster.

## Shipped labels (2026-08-19)

| Job | Rejected analog | Rejected shop pun | **Solidarity name** | French |
|---|---|---|---|---|
| Home (`/portal`) | Station | Locker | **Together** | Ensemble |
| Live Circles (`/portal/fronts`) | Fronts | On the table | **Hold the line** | Tenir la ligne |
| Work-package progress (`?tab=momentum`) | Momentum (hills) | The push | **One fight** (stuck / moving) | Un seul combat |
| Kanban (`?tab=pipeline`) | Pipeline | Shop board | **Many hands** | Plusieurs mains |

Routes and TypeScript ids stay (`station`, `fronts`, `momentum`, `pipeline`, `StationPayload`) so bookmarks and `?tab=` do not break. **Labels** are what members see.

The Basecamp CSV importer may still say Basecamp — that is a migration tool, not product chrome.

## What counts as a solidarity name

**Yes:** we / us / ours energy, chants and memes members already say (*together*, *hold the line*, *one fight*, *many hands*), Circle/Hall/Floor.

**No:** Basecamp analog brands (Station, Fronts, Momentum, Pipeline as titles). Shop and bargaining puns (Locker, Casier, On the table, Shop board). Strike/scab gore. Time-module clock/punch. Meeting *motions* for to-dos. English-only jokes that French cannot carry as the same job.

French must carry the same **job**, not the same joke. Key parity is not meaning parity.

## Do not

- Restore Station / Fronts / Momentum / Pipeline **or** Locker / On the table / The push / Shop board as UI titles
- Add more analog brands that exist only as Basecamp mirrors
- Rename Circle / Hall / Bulletin / Floor / Binder / Dispatch / Sidebars / Roll Call “for consistency”
- Put uphill/downhill Hill Chart copy back on One fight
- Treat ADR-017 as a parody brief or a trades-glossary brief — it is solidarity collaboration
- Hide Roll Call / Many hands / One fight on committee Circles until they already have data — officers must be able to start them empty. Hall still hides those extras until they exist.

## Fit gap closed (same day)

Blank committee Circles now show Roll Call, Many hands, and One fight. Officers get **Start Many hands**, which calls `ensurePipelineBoard`. Hall still hides empty extras. Empty-state copy names the next action. Live dates on a Circle are labeled Live from / Live until, not “on the line.”
