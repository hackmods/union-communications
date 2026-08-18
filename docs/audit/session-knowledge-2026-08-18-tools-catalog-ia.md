# Session knowledge — 2026-08-18 (Tools catalog regrouping)

**Audience:** future agents + Ryan.  
**Companion:** [`current-ground-truth.md`](current-ground-truth.md), [`../modules/COMMS.md`](../modules/COMMS.md), [`.cursor/rules/comms-public-nav.mdc`](../../.cursor/rules/comms-public-nav.mdc), [`channel-packs.ts`](../../src/lib/comms/packs/channel-packs.ts).  
**Source of truth for columns:** [`nav-config.ts`](../../src/components/layout/nav/nav-config.ts) `toolGroups` (Tools mega-menu **and** `/tools` index).

---

## What happened

`/tools` and Tools ▾ used four columns that mirrored the First week slogan (Brand / Union boards / Print / Social & web). After Share Kit, Pulse Poll, QR Card, and Action Card shipped, the catalog was unbalanced:

| Group (before) | Count | Problem |
|---|---|---|
| Brand | 3 | Fine as setup |
| Union boards | 6 | Absorbed wallet/handout tools (QR Card, Action Card) |
| Print | **1** | Flyer Maker alone — a leftover slogan column |
| Social & web | 6–7 | Honest dump of leftover digital makers |

Print looking empty was the symptom. The cause was treating **channel slogans** as **tool jobs**.

Channel packs already had a better split (`board` vs `print` vs `wallet` vs `social`). Nav never caught up.

---

## Decision

**Keep four columns.** Do not invent a fifth “Website” or “Cards” group (singleton problem again). Do not collapse to three (that buries board vs handout).

**Group Tools by job, not by First week channel.**

| Group | Job | Tools |
|---|---|---|
| **Brand** | Set the look | Logo Builder, Resizer, Document Generator |
| **Union boards** | Dress the cork board | Board Banner, Board Notice, Solidarity Poster, QR Board |
| **Print & cards** | Paper people can take | Flyer Maker, QR Card, Action Card, Pulse Poll (when Hub login is on) |
| **Social & web** | Post and publish | Graphic Maker, Quote Card, Meeting Background, Website Template, Alt Text |

Counts land about **3 / 4 / 3–4 / 6** instead of **3 / 6 / 1 / 6–7**. Social stays the longest column because most makers are digital.

Pulse Poll sits with Print & cards because the public artifact is a printable QR card. It still hides unless Officer Hub login is on **and** the visitor is signed in (`visibleToolGroups`). Print & cards never goes empty when Pulse Poll is hidden.

### Labels

- EN `nav.toolsGroupPrint`: **Print & cards** (key kept; display string changed)
- FR: **Impression et cartes** (same claim; `et` not `&`, matching `Social et web`)

---

## Two IAs — do not collapse them

| Surface | Model | Do |
|---|---|---|
| Home, First week, Guides → By channel | Four **channels** members encounter: boards → print → social → website | Leave this order |
| Tools ▾ and `/tools` | Four **jobs** a steward is making | Use the table above |

Related-tool footers (`RELATED_BY_TOOL`) **should** keep crossing groups. A board notice still points at Flyer Maker.

`COMMS_CHANNEL_PACKS` stays a feature-pack map (`wallet` ≠ a nav column). Nav folds wallet into **Print & cards**. Do not add a fifth mega-menu column named Wallet.

---

## What not to do

- Leave Flyer Maker as the only Print item “because First week has a Print step”
- Split Website Template into its own group
- Move **both** Resizer and Document Generator out of Brand in the same pass — Brand would collapse to Logo Builder, and Brand Kit is already a top-level link
- Re-flatten Tools into one ungrouped list
- Add extra top-level tool links beside Tools ▾

Optional later (not this train): Document Generator → Print & cards, matching `COMMS_CHANNEL_PACKS.print`. Skip unless Brand should be Logo + Resizer only.

---

## Files that must stay in sync

Any regroup touches **all** of:

1. `src/components/layout/nav/nav-config.ts` `toolGroups`
2. `src/components/layout/nav/nav-config.test.ts` membership asserts
3. `messages/en.json` + `messages/fr.json` `nav.toolsGroupPrint`
4. `.cursor/rules/comms-public-nav.mdc` Tools menu list
5. `docs/modules/COMMS.md` Tools ▾ row

`/tools` and the mega-menu both call `visibleToolGroups()` — do not fork a second catalog.

---

## Same day: Share Kit folded (2026-08-18)

Share Kit v0 was a workshop orchestrator (preset picker + links to Graphic Maker / Captions / Resizer). Graphic Maker already has the same four `TOOL_PRESETS` buttons and related-tool links. The catalog item was removed; `/:locale/tools/share-kit/` permanently redirects to Graphic Maker (`?preset=` preserved). Do not rebuild a third social canvas.

---

## Verify

```bash
npm run test:unit -- src/components/layout/nav/nav-config.test.ts src/lib/comms/public-copy-style.test.ts
```
