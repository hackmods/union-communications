# Public Comms tools parity audit — 2026-08-25

**Audience:** product + agents.  
**Scope:** All **17** public tool routes under `/tools/*` (Pulse Poll counts when Hub login is on; catalog hides it for anonymous visitors).  
**Framework:** Three-layer parity from [`session-knowledge-2026-08-14-flyer-unified-tools.md`](session-knowledge-2026-08-14-flyer-unified-tools.md):

```
Shell (TEL contract — tool-editor-ux.mdc)
  → Channel packs (print / social / board / wallet — channel-packs.ts)
    → Per-tool layout IDs (never unify)
```

**User feedback under review:** Flyer Maker, Pulse Poll, and Alt Text feel **empty or half-done**; full catalog **shell/space** pass requested.

---

## Executive summary

| Finding | Verdict |
|---------|---------|
| “Half-done” shell on Alt Text | **Confirmed** — layout exception is documented, but `purposeHint`, `whenToUse` copy, and `ToolRelatedFooter` were never wired despite `RELATED_BY_TOOL["alt-text"]` existing. |
| “Empty” Pulse Poll first paint | **Confirmed** — `createEmptyPulsePollDraft()` seeds blank title/questions; 384px `max-w-sm` card shows only tool title + QR until the steward types. |
| Flyer “empty / wrong language” defaults | **Confirmed (EN-only)** — initial state uses hardcoded English strings; FR stewards see English until they hit a preset or example seed. |
| Website Template toolbar gap | **Confirmed** — `BrandSetupPrompt` missing from `toolbar=`; Brand Kit path buried in bundled-links Callout inside the long form. |
| Catalog `/tools` sparse at lg+ | **Partial** — four-column grid is functional but has no secondary band (unlike Home composition rules); acceptable for v1, low priority. |
| Most canvas tools “done” on shell checklist | **Mostly true** — 14/15 TEL tools pass `purposeHint` / `previewActions` / `ToolRelatedFooter`; gaps cluster on the two documented non-TEL exceptions plus Website toolbar. |

**Wave 1 (this train):** shell + preview uplifts only — no new channel features, layout engines, or font pickers.

---

## Tool inventory (17)

| # | Slug | Pack | Layout | Shell |
|---|------|------|--------|-------|
| 1 | `logo-builder` | brand | TEL | ✅ (no BrandSetup — tool *is* setup) |
| 2 | `resizer` | social | TEL | ✅ |
| 3 | `document-generator` | print | PageShell exception | ⚠️ no `whenToUse` line |
| 4 | `board-banner` | board | TEL | ✅ |
| 5 | `board-notice` | board | TEL | ✅ |
| 6 | `solidarity-poster` | board | TEL | ✅ |
| 7 | `qr-board` | board | TEL | ✅ |
| 8 | `org-chart` | boards/job | TEL | ✅ |
| 9 | `flyer-maker` | print | TEL | ⚠️ EN defaults; preview scale |
| 10 | `qr-card` | wallet | TEL | ✅ |
| 11 | `action-card` | wallet | TEL | ✅ |
| 12 | `pulse-poll` | wallet | TEL | ⚠️ blank defaults; narrow preview |
| 13 | `graphic-maker` | social | TEL | ✅ (reference social) |
| 14 | `quote-card` | social | TEL | ✅ |
| 15 | `meeting-background` | social | TEL | ✅ |
| 16 | `website-template` | social/web | TEL | ⚠️ no BrandSetup in toolbar; long form |
| 17 | `alt-text` | social | PageShell exception | ✅ purposeHint + related (Wave 1); densified ref column (Wave 3) |

Share Kit (`/tools/share-kit`) **excluded** — folded into Graphic Maker 2026-08-18.

**As-built note (2026-08-25):** Wave 1–3 closed shell gaps on flagged tools. Matrix below is **historical pre-ship** snapshot; see Wave 1–3 sections for current state.

---

## Shell checklist matrix (historical pre-Wave 1 snapshot)

Legend: ✅ present · ⚠️ partial · ❌ missing · — intentional skip · n/a non-canvas

| Tool | TEL | purposeHint | BrandSetup→toolbar | previewActions | exportSuccess | ToolRelatedFooter |
|------|-----|-------------|-------------------|----------------|---------------|-------------------|
| logo-builder | ✅ | ✅ | — | ✅ | ✅ | ✅ |
| resizer | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| document-generator | n/a | ❌→✅ W1 | in form→header W3 | n/a | ✅ | ✅ |
| board-banner | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| board-notice | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| solidarity-poster | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| qr-board | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| org-chart | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| flyer-maker | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| qr-card | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| action-card | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| pulse-poll | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| graphic-maker | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| quote-card | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| meeting-background | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| website-template | ✅ | ✅* | ❌→✅ W1 | ✅ | ✅ | ✅ |
| alt-text | n/a | ❌→✅ W1 | n/a | n/a | n/a | ❌→✅ W1 |

\*Website hides `purposeHint` in workshop demo mode only (matches Graphic Maker pattern).

### As-built shell status (post Wave 3)

| Tool | Notes |
|------|-------|
| All 15 TEL canvas tools | Shell checklist complete |
| `document-generator` | PageShell; `whenToUse`, header `BrandSetupPrompt`, `ToolFormDetails` IA, related footer |
| `alt-text` | PageShell; `whenToUse`, Graphic Maker link, collapsed reference column, related footer |
| `/tools` catalog | P2 Start here sidebar @ lg+; channel guides footer unchanged |

---

## Deep dives (user-flagged tools)

### Flyer Maker

| Layer | Observation |
|-------|-------------|
| **Shell** | Checklist complete post–2026-08-14 unified pass (presets + BrandSetup in single `toolbar`, InviteEmail in `footer`). |
| **Preview scale** | Preview uses full column width (`shadow-lg` wrapper only). Graphic Maker constrains 9:16 with `max-w-[280px]`; Flyer letter/tabloid at full width reads as a **tall narrow strip** or dominates the column — feels unlike other print tools and unlike Graphic’s intentional “phone/card” framing. |
| **Form IA** | Primary copy fields (message, body, date, time, location) sit in one flat `<section>` above three collapses. Typography/QR/colours collapses are good; **event details block lacks a section label** — stewards scroll past layout/format SegControls before seeing “what the flyer says.” |
| **i18n defaults** | `initial` state hardcodes English (`"PICKET LINE - ALL MEMBERS WELCOME"`, `"Monday, March 15"`, Toronto address). Presets (`FLYER_PRESETS`) are also EN-only strings. **`useOneShotBrandSeed` only syncs colours**, not copy — FR locale loads English demo text until preset click. |
| **Channel** | Font picker / paper sizes / layouts — **intentional** print pack features; do not remove. |

**User “empty” verdict:** Partially fair — preview framing + EN-only seed copy make first paint feel foreign or sparse; tool is feature-complete on channel layer.

### Pulse Poll

| Layer | Observation |
|-------|-------------|
| **Shell** | Full TEL contract; Hub publish auth messaging present (`privacyNotice` Callout). |
| **Blank defaults** | `createEmptyPulsePollDraft()` → `title: ""`, one empty question. Preview falls back to `t("title")` (“Pulse Poll Creator”) — reads like a **placeholder product**, not a demo poll. |
| **384px preview** | `max-w-sm` (384px) + wallet token sizing is intentional for QR card print size, but in the **wide sticky column** the card floats small with empty question list — amplifies “empty” feeling. |
| **Hub publish path** | Publish/Save/Copy live mid-form before Undo/export; no top-level toolbar CTA. Auth failure copy is good (`publishAuthRequired`). **Discoverability:** officers may not scroll past questions to find Publish — not a bug, but workshop friction. Hub-gating is **intentional** (session-knowledge §11). |
| **Channel** | Wallet pack — QR PNG/PDF export correct; do not add social layouts. |

**User “empty” verdict:** **Confirmed** on first paint; shell is otherwise complete.

### Alt Text Assistant

| Layer | Observation |
|-------|-------------|
| **Shell** | Documented PageShell exception (`tool-editor-ux.mdc`) — no fake Edit/Preview tabs. |
| **purposeHint** | **Missing** — no `whenToUse` key in `altTextAssistant` namespace; no quiet line under subtitle (workshop pattern on every other tool). |
| **Related tools** | `RELATED_BY_TOOL["alt-text"]` → Graphic Maker + photo-consent guide — **never rendered** (`ToolRelatedFooter` not imported). |
| **Space / composition** | `xl:grid-cols-[1.15fr_1fr]` is reasonable; right column (how-to + checklist + examples) is dense. **Does not feel empty** once editing — feels **disconnected from the toolkit** (no workshop trail, no related links). |
| **Channel** | Correctly no canvas export; copy/paste workflow. |

**User “half-done” verdict:** **Confirmed** for shell/discoverability gaps, not for core alt drafting UX.

### Website Template

| Layer | Observation |
|-------|-------------|
| **Shell** | TEL with `purposeHint`, `previewActions`, `exportSuccess`, footer Sources + Related. |
| **BrandSetup** | `toolbar={<Callout tone="brand">{referenceNote}</Callout>}` only — **no `BrandSetupPrompt`**. Brand Kit edit link lives inside mid-form bundled-links Callout (`bundledEdit`). Violates shell checklist #4. |
| **Long form** | Single `Card` with ~20 fields (hero, about×2, contact, officers repeater, import/export, WordPress/Squarespace notes). No `ToolFormDetails` collapses — **long scroll** on mobile shop-floor use. |
| **iframe preview** | Fixed `h-[600px]` iframe (`WebsitePreviewFrame`); desktop sticky column does not cap height to ~70vh; iframe does not participate in `MobilePreviewStage` scale (TEL passes preview as opaque node — acceptable for iframe, but preview **does not shrink** on narrow viewports inside column). |
| **Channel** | ZIP / WordPress export — complete; Org Chart roster import — good. |

**User feedback verdict:** **Confirmed** on toolbar BrandSetup + form length; preview iframe is functional, not broken.

---

## Catalog shell pass (`/tools`)

| Check | Status |
|-------|--------|
| H1 + subtitle + Brand Kit hint | ✅ |
| Four job columns (Brand / Boards / Print & cards / Social & web) | ✅ |
| Channel guides footer band | ✅ |
| lg+ empty space / composition | ⚠️ Grid fills width; no secondary visual zone (COPY-001-style). Low priority vs tool editors. |
| Pulse Poll visibility | ✅ Gated via `visibleToolGroups()` |

---

## Ranked recommendations

Priority: **P0** ship in Wave 1 shell/preview · **P1** next polish · **P2** channel/product · **P3** defer

| Rank | ID | Tool / area | Layer | Recommendation | Effort | User impact |
|------|-----|-------------|-------|----------------|--------|-------------|
| 1 | W1-ALT | alt-text | Shell | Add `whenToUse` EN/FR + purpose line under subtitle; wire `ToolRelatedFooter` | S | Fixes “half-done” discoverability |
| 2 | W1-WEB | website-template | Shell | Merge `BrandSetupPrompt` into `toolbar` with reference Callout | S | Brand Kit path visible at top |
| 3 | W1-PULSE | pulse-poll | Shell/preview | Seed localized demo title + 2 sample questions when no saved draft; widen desktop preview wrapper (`max-w-md`) | S | Fixes “empty” first paint |
| 4 | W1-FLYER-DEF | flyer-maker | Shell/i18n | Move default copy to i18n; hydrate via `useOneShotBrandSeed` | M | FR parity; warmer first paint |
| 5 | W1-FLYER-PREV | flyer-maker | Preview | Constrain preview `max-w-md lg:max-w-lg mx-auto` (match print sheet framing) | S | Fixes “preview scale” unease |
| 6 | W1-FLYER-IA | flyer-maker | Form IA | Label primary block “Event details” (`ToolFormDetails` or section legend) | S | Reduces flat-form fatigue |
| 7 | W1-DOCGEN | document-generator | Shell | Add + display `whenToUse` under subtitle | S | Parity with canvas tools |
| 8 | P1-PULSE-PUB | pulse-poll | IA | Move Publish/Save/Copy to `toolbar` or top Callout strip | M | Hub path discoverability (keep auth gate) |
| 9 | P1-WEB-FORM | website-template | Form IA | Collapse officers / import / platform notes via `ToolFormDetails` | M | Mobile shop-floor scroll |
| 10 | P1-WEB-PREV | website-template | Preview | Cap iframe `max-h-[70vh]` + optional scale wrapper | M | Sticky preview balance |
| 11 | P1-FLYER-PRESET-I18N | flyer-maker | i18n | Localize `FLYER_PRESETS` message bodies (or preset apply reads i18n) | M | FR preset parity |
| 12 | P2-CATALOG | /tools index | Marketing | Secondary band at lg+ (guide deep-links or tool stats) | L | Catalog “space” polish |
| 13 | P2-DOCGEN-TEL | document-generator | Shell | Consider TEL with live doc thumbnail preview (large lift) | L | Only if product asks |
| 14 | P3-PULSE-CHOICES | pulse-poll | Channel | Optional single-choice options per question (API supports) | L | Feature, not shell |
| 15 | P3-FLYER-FONTS-OTHER | other print | Channel | Flyer-style font picker on solidarity-poster | L | Optional; Flyer-only font control remains the default |

---

## Wave 1 implementation scope (this train)

**Shipped 2026-08-25** (`bf2358e`) — ranks **1–7**:

1. Alt Text — `whenToUse` + `ToolRelatedFooter`
2. Website Template — `BrandSetupPrompt` in toolbar
3. Pulse Poll — demo defaults + preview width
4. Flyer — i18n defaults, preview max-width, event-details section label
5. Document Generator — `whenToUse` line

## Wave 2 (P1 shell/preview) — shipped 2026-08-25

Ranks **8–11** from the recommendations table:

| Rank | ID | Shipped |
|------|-----|---------|
| 8 | P1-PULSE-PUB | Publish / Save / Copy + share URL moved to `toolbar` |
| 9 | P1-WEB-FORM | Officers, import/export, and platform notes collapsed via `ToolFormDetails` |
| 10 | P1-WEB-PREV | iframe preview capped `max-h-[70vh]` |
| 11 | P1-FLYER-PRESET-I18N | Flyer preset copy moved to `flyerMaker.presets.*` i18n; design-only `FLYER_PRESETS` |

**Still deferred:** P2 doc-gen TEL migration, P3 channel features.

## Wave 3 (P2 catalog + layout exceptions) — shipped 2026-08-25

| Rank | ID | Shipped |
|------|-----|---------|
| 12 | P2-CATALOG | `/tools` Start here sidebar @ lg+ (`FIRST_WEEK_STEP_LINKS`) |
| — | P2-DOCGEN-IA | Header BrandSetup; `ToolFormDetails` on fields + structure |
| — | P2-ALT | Graphic Maker link; reference column collapses |

Session doc: [`session-knowledge-2026-08-25-public-tools-parity.md`](session-knowledge-2026-08-25-public-tools-parity.md)

---

## Verification (Wave 1 + 2 + 3)

```bash
npm run lint
npm run test:unit -- src/lib/comms/public-copy-style.test.ts src/lib/seo/public-page-meta.test.ts
```

Manual spot-check @ 375 / 768 / 1280:

- `/en/tools/alt-text` — purpose line + related footer
- `/en/tools/pulse-poll` — demo poll visible in preview (signed-in Hub)
- `/en/tools/flyer-maker` — preview centered sheet; FR locale defaults
- `/en/tools/website-template` — BrandSetup prompt when Brand Kit empty
- `/fr/tools/flyer-maker` — localized seed copy

---

## References

- [`.cursor/rules/tool-editor-ux.mdc`](../../.cursor/rules/tool-editor-ux.mdc)
- [`session-knowledge-2026-08-14-flyer-unified-tools.md`](session-knowledge-2026-08-14-flyer-unified-tools.md)
- [`session-knowledge-2026-08-18-tools-catalog-ia.md`](session-knowledge-2026-08-18-tools-catalog-ia.md)
- [`channel-packs.ts`](../../src/lib/comms/packs/channel-packs.ts)
