# Session knowledge — 2026-08-11 (Public copy QOL + voice)

**Audience:** future agents + Ryan.
**Companion:** [`public-copy-qol-2026-08.md`](public-copy-qol-2026-08.md) (the audit, with before/after per key), [`current-ground-truth.md`](current-ground-truth.md), [`../PROGRESS.md`](../PROGRESS.md).
**Rules written from this session:** [`.cursor/rules/i18n-public-copy.mdc`](../../.cursor/rules/i18n-public-copy.mdc) (new), [`comms-public-ux.mdc`](../../.cursor/rules/comms-public-ux.mdc) (updated).
**Landed on:** `main` — `2533325` SEO → `e5d95c1` correctness/locked terms → `a67c564` jargon → `628e34d` fragments → `18b61db` EN↔FR drift → `5aeda39` UX states → `5851415` SEO band + FR typography → `707078f` docs.

---

## What happened

A quality-of-life and voice pass over public-facing copy: the EN/FR catalogs, the
three SEO sources, and public sample text. Not a length-cutting pass — the blanket
30-word per-leaf ceiling had been removed earlier the same day precisely because it
produced clipped, telegraphic strings.

The pass started from an assumption that turned out to be wrong: that the catalog
was "largely healthy" and the work would be subtle polish. It was healthy **at the
lead line**, where previous passes had focused. Underneath, French carried real
meaning errors, and locked product terms had drifted back in.

---

## The finding that justifies the whole pass

`photoConsentGuide.toolbox.content` (FR) told stewards to prefer group photos
**"sans consentement individuel"** — *without individual consent*. The English says
to prefer group photos **when people have not consented**. The French inverted a
consent instruction on a privacy guide.

It had shipped for months and passed every check, because every check was
structural: key parity, key presence, string non-emptiness, lead length. Nothing
compared what the two locales actually *claimed*.

**Lesson:** EN/FR key parity is not translation quality. Treat French as a second
source of truth that can be wrong, not as a mirror of English.

Same class, same commit: `flyerMaker.subtitle` said "Tractus" (not a French word),
`websiteGuide.maintain.intro` said "vaut pire" (ungrammatical), `crisisGuide` told
members to wear *Brand Kit* colours where English says *union* colours,
`seniorityGuide` said "ne se bumper pas", `dfrGuide` said "Enquêtez ... **les**
plaintes" (needs `sur`), and `routeUi.notFoundBody` calqued "moved camp" as
"changé de camp" — which in French reads as *switched sides*, an unfortunate thing
for a union tool to say.

---

## Hard lessons (do not re-learn)

### 1. Structural tests pass while semantic bugs ship

Before this session the copy guards checked: shared Brand Kit nudge presence, six
named lead lengths, em-dash stacking. All green throughout the period when the
consent inversion was live. If a class of bug can't be caught by the guard you
have, the guard is not covering the risk — it is covering the easy part.

What now runs mechanically (all in
[`public-copy-style.test.ts`](../../src/lib/comms/public-copy-style.test.ts)):
sentence capitalization in both locales, no bare "the hub" in EN, one French name
per locked term, French space before `:`/`;`, banned jargon list, and no
untranslated FR. Plus SEO description band / duplicates / capitalization in
[`public-page-meta.test.ts`](../../src/lib/seo/public-page-meta.test.ts).

### 2. Verify a new guard by injecting the regression it claims to catch

After writing the checks, thirteen deliberate regressions were injected one at a
time (wrong French locked name, lowercase FR "trousse de marque", "texte alt",
"dépliant", "OHSA", missing space before `;` and `:`, FR value set equal to EN,
"the hub", "CTA", "tenant", "slug", lowercase sentence start) and the suite was
re-run for each.

Three initially reported **MISS**. Two were bad injections. One was a real gap:
`nav` was not in the guard's `PUBLIC_NS` list, so the locked *tool names* — the
most protected strings in the product — were never scanned. Without the negative
test that gap would have shipped inside the fix meant to prevent it.

**A guard you have not tried to break is a guess.**

The harness is throwaway — write it as a temp `.mjs`, run it, delete it. It is
recreatable in a minute, so recreate it rather than trusting a guard you added
without it:

```js
// tmp-probe.mjs — inject one regression per guard, confirm the suite fails, restore.
import fs from "node:fs";
import { execSync } from "node:child_process";

const FR = "messages/fr.json";
const EN = "messages/en.json";
const orig = { [FR]: fs.readFileSync(FR, "utf8"), [EN]: fs.readFileSync(EN, "utf8") };

// [label, file, exact string to find, what to replace it with]
const cases = [
  ["FR locked term", FR, "Hub des dirigeants", "Centre des dirigeants"],
  ["EN bare hub", EN, "Explore the tools", "Explore the hub"],
  ["EN jargon", EN, "One clear call to action", "One clear CTA"],
  // ...one row per check the guard claims to make
];

for (const [label, file, find, replace] of cases) {
  if (!orig[file].includes(find)) { console.log(`SKIP  ${label}`); continue; }
  fs.writeFileSync(file, orig[file].replace(find, replace));
  let bit = false;
  try { execSync("npx vitest run src/lib/comms/public-copy-style.test.ts", { stdio: "pipe" }); }
  catch { bit = true; }
  for (const [p, text] of Object.entries(orig)) fs.writeFileSync(p, text);
  console.log(`${bit ? "BITES" : "MISS "} ${label}`);
}
```

Two things that made injections report a false MISS: anchoring on a string whose
**first** occurrence sits in a namespace the guard does not scan (that is how the
`nav` gap surfaced — investigate a MISS before assuming the injection was wrong),
and, for the untranslated-FR check, writing a French value that is merely
English-*ish* rather than byte-identical to the English value at the same path.

### 3. Mechanical edits leave a readable fingerprint

An earlier pass had replaced semicolons and dashes with periods across the SEO
registries. That left ten English page descriptions and five French tool
descriptions starting a sentence in lowercase (`"…on your device. no ads"`), which
render verbatim in search results and share cards.

The pattern `[.!?] +[a-z]` finds this in seconds and is now guarded. If you run a
bulk replace over copy, run the guards after and read the diff — the second clause
of a joined sentence is where damage hides.

### 4. Grepping one term finds one drift; grepping the *concept* finds the rest

"the hub" turned up seven public strings. But asking "how many French names does
this product have?" turned up three (`Portail` / `Centre` / `Hub des dirigeants`).
The same question about a flyer turned up three (`affiche` / `dépliant` / `tract`),
about alt text two, about the duty of fair representation three (`DRE` / `DJR` /
spelled-out variants), and about statutes the English acronyms `OHSA`/`ESA` sitting
next to their correct French equivalents `LSST`/`LNE`.

Audit by concept, not by string.

### 5. The removed word ceiling left residue that reads as a different bug

Dropping the 30-word cap did not undo the damage it had already caused. Strings
like `"Subject clear. Local number in the body. Link or QR for RSVP."` and every
French `whenToUse` hint (all nine had lost their subject, verb, and usually a
trailing clause) looked like stylistic choices rather than the scar tissue of an
optimization. When you remove a constraint, sweep for what it already did.

### 6. Smoke assertions rot silently against copy changes

`e2e/builders.smoke.spec.ts` was asserting `/Local-first Comms/i`, a string the
earlier `trustBanner` rewrite had deleted from the catalog. Nothing failed, because
smoke was not being run on every copy commit. Before changing a public string,
`rg` the string in `e2e/` — and when a copy pass ends, spot-check that
smoke-asserted text still exists.

Strings the smoke suite currently pins (keep byte-identical unless you also update
the spec): `Feed the board - posters and templates`, `Reference layouts from real
locals`, `Demo this in about 20 minutes`, `Local Logo Builder`, `Why it's free`,
`QR Board Poster Maker`, tool H1s, `Download …` buttons, `Also see`, `Get started`,
`Set up your local brand`, and the home hero region name `toolkit for local unions`.

### 7. PowerShell + JSON is a trap; so is `JSON.stringify` round-tripping

A `node -e "…"` one-liner containing JSON string literals was mangled by
PowerShell quoting and failed to parse. Bulk catalog edits belong in a temp `.mjs`
file (deleted before commit), matching the lesson already recorded on 2026-08-09.

Separately: rewriting `messages/fr.json` via `JSON.parse` → `JSON.stringify(…, 2)`
is **not** byte-safe on these files (a round-trip check showed a 2-character
difference before any edit), so it would have produced a diff full of noise. Raw
text replacement preserved formatting. Semicolons are safe to bulk-replace in JSON
because JSON syntax has none; **colons are not**.

### 8. `StrReplace` intermittently fails with `ftruncate` on Windows

Three edits during this session returned `Error: UNKNOWN: unknown error,
ftruncate` while leaving the file unmodified. Re-issuing the identical edit
succeeded each time. Confirm with a grep before assuming an edit landed, and
re-issue rather than rewriting the approach.

### 9. Thin SEO descriptions are a silent loss, not an error

Sixteen descriptions sat between 52 and 99 characters against a snippet budget
near 155. Nothing was broken; the space was simply unused. Six of them had also
dropped the on-device selling point that differentiates the product. The guard now
enforces a **band** (95–165) rather than a target, because over-padding to hit a
number is the same mistake as the word ceiling in the other direction.

---

## Decision log

| Choice | Locked | Why |
|---|---|---|
| FR name for Officer Hub | **Hub des dirigeants** | Was Portail / Centre / Hub; Hub matches the locked English |
| FR name for a flyer | **tract** | `affiche` = poster (used by Solidarity/QR Board), `dépliant` = leaflet; *tract* is what Ontario locals say |
| FR name for alt text | **texte alternatif** | Matches the platform UI label members see |
| FR name for DFR | **DRE** | Was DRE/DJR in the same guide |
| Statutes in FR | **LSST / LNE** | English acronyms were sitting beside the French ones |
| Brand Kit capitalization in FR | **Trousse de marque** | Product name; 23 lowercase stragglers normalized |
| "your central union" | **your provincial or national union** | "central" reads as Quebec *centrale* to some, as nothing to others; stays multi-union |
| SEO description limit | **band 95–165, not a target** | Padding to a number repeats the word-ceiling mistake |
| `AUTH_SECRET` in `privacyPage.hubSelfHost` | **kept**, exempted by key | Addressed to self-hosters, not stewards |
| routeUi quips | **stay playful**, fragments allowed | Deliberate voice; only the English-leaking "Soft reset" was fixed |
| Home hero CTA duplication | **copy-differentiated only** | Structural de-dup changes accessible names the smoke suite asserts — own change |

---

## File map (agents)

| Concern | Path |
|---|---|
| Copy/i18n contract | `.cursor/rules/i18n-public-copy.mdc` |
| Public Comms UX + product language | `.cursor/rules/comms-public-ux.mdc` |
| Copy guard (sentences, locked terms, FR quality, jargon) | `src/lib/comms/public-copy-style.test.ts` |
| SEO guard (band, duplicates, capitalization) | `src/lib/seo/public-page-meta.test.ts` |
| Page titles/descriptions | `src/lib/seo/public-page-meta.ts` |
| Tool titles/descriptions | `src/lib/seo/tool-meta.ts` |
| Site-wide description / share blurb | `src/lib/seo/site.ts` |
| Catalogs | `messages/en.json`, `messages/fr.json` |
| Audit (before/after per key) | `docs/audit/public-copy-qol-2026-08.md` |
| Next steps | `docs/audit/execution-backlog.md` → `COPY-` section |

---

## Ops / verify

```bash
npm run lint
npm run test:unit -- src/lib/comms/public-copy-style.test.ts src/lib/seo/public-page-meta.test.ts src/lib/pwa/install-copy.test.ts src/lib/comms/first-week-roadmap.test.ts
npm run test:unit            # full suite: 127 files / 718 tests at land
```

Smoke is worth running when a pass touches strings the specs assert:

```bash
npx playwright test e2e/builders.smoke.spec.ts --grep "@smoke" --project=chromium
```

Manual spot-check: `/en/` and `/fr/` home, `/fr/guide/photo-consent` (the inverted
string), `/fr/tools/flyer-maker` (tract naming), `/fr/guide/right-to-refuse`
(LSST), and any tool's export error path.
