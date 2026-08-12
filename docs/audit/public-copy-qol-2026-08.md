# Public copy QOL audit — 2026-08-11

Scope: public namespaces in `messages/{en,fr}.json` (home, tools, guides, libraries,
about/legal pages, `common.*`, `routeUi.*`, `nav.*`, `metadata.*`) plus the three SEO
sources (`src/lib/seo/site.ts`, `tool-meta.ts`, `public-page-meta.ts`).
Out of scope: authenticated Officer Hub `/app` module copy (grievance, time, portal,
ledger, travel, expenses, polls, meetings, officers, committees) unless the string is a
shared `common.*` / `routeUi.*`.

This is the follow-up pass to the 2026-08-11 voice rewrite. That pass fixed the
loudest leads; the catalog is now largely healthy at the lead line. What remains is
**below** the lead: French drift, mistranslations, jargon leaking onto volunteer
pages, ambiguous "hub", and SEO descriptions still carrying scars from the earlier
mechanical semicolon→period edit (sentences that start lowercase).

Method: flattened both catalogs (1,844 public leaves each, EN/FR key parity clean) and
screened for lowercase sentence starts, verbless fragments, jargon, stacked em dashes,
untranslated FR, and EN↔FR semantic drift. Findings below are the ones worth acting on.

## 1. Correctness bugs (fix first)

These are wrong, not just awkward.

| Key | Before | Proposed |
|---|---|---|
| `photoConsentGuide.toolbox.content` (FR) | "…privilégiez les photos de groupe **sans consentement individuel**." | "…privilégiez les photos de groupe **lorsque des personnes n'ont pas donné leur consentement**." |
| `flyerMaker.subtitle` (FR) | "**Tractus** à fort contraste…" | "**Tracts** à fort contraste pour réunions, rassemblements et actions." |
| `unionBoardsGuide.subtitle` (FR) | "…puis **ajoutes** avis et affiches." | "…puis **ajoutez** avis et affiches." |
| `seniorityGuide.sections.pitfalls.items[1]` (FR) | "les collections FT/PT … **ne se bumper pas** librement" | "…**ne permettent pas toujours de se déplacer** librement" |
| `websiteGuide.maintain.intro` (FR) | "**vaut pire** que pas de site" | "**est pire** que pas de site du tout" |
| `crisisGuide.scenarios.bargaining.items[2]` (FR) | "porter **les couleurs de votre trousse de marque**" (EN: "wear union colours") | "porter **les couleurs du syndicat**" |
| `membershipSignupGuide.steps.printMaterials.qrBoard` (FR) | "Tableau QR — TP + TPa" (EN is a CTA: "Open QR Board Poster") | "Ouvrir l'affiche QR pour tableau" |
| `routeUi.notFoundBody` (FR) | "…ou elle a **changé de camp**." (calque of "moved camp"; in French this reads as *switched sides*) | "Elle a peut-être été déplacée, ou le lien n'est plus à jour." |
| `routeUi.quips.error[2]` (FR) | "Erreur de poinçon. **Soft reset** recommandé." | "La pointeuse a bloqué. Un rafraîchissement suffit d'habitude." |
| `routeUi.quips.hub[0]` (FR) | "a **pointé trop tôt**" (means *punched too early*, not *punched out*) | "a déjà **pointé sa sortie**" |
| `dfrGuide.sections.whatItMeans.items[0]` (FR) | "**Enquêtez** rapidement **les** plaintes" | "Enquêtez rapidement **sur** les plaintes" |
| `footer.madeBy` (FR) | untranslated English | "UnionOps. Bâti en solidarité pour les sections locales, par des bénévoles syndicaux." |
| `onboarding.localNumberPlaceholder` (FR) | "e.g. 243" | "p. ex. 243" |
| `e2e/builders.smoke.spec.ts:55` | asserts `/Local-first Comms/i` — that string no longer exists anywhere in the catalog (the 2026-08-11 `trustBanner` rewrite removed it) | assert the current banner text (`/stays in your browser/i`) |

## 2. Locked-term drift: ambiguous "hub"

`comms-public-ux.mdc` locks **Officer Hub** for `/app` and forbids bare "the hub" on
public Comms. These leaked back in:

- `resources.explore.title` — "Explore **the hub**" → "Explore the tools" / FR "Explorer les outils"
- `resources.builtFrom.items[4]` — "in **the hub** accessibility statement" → "in the UnionOps accessibility statement"
- `accessibility.feedback.body` — "while using **this hub**" → "while using UnionOps" (FR "ce **centre**" → "UnionOps")
- `supportPage.p2` — "If **this hub** saved you time" → "If **these tools** saved you time"
- `unionBoardsGuide.bareMinimum.items.socials.content` — "your site, group, or **this hub**" → "…or this site"
- `footer.privacy` — "you control your **hub**" → "your Officer Hub"
- `installPage.limitsNetwork` — "other **hub** modules" → "other Officer Hub modules"
- `metadata.title` / `metadata.description` (FR) — "un **hub**" → "Hub des dirigeants"
- FR variants of the locked name: `emailBroadcastGuide.sections.hub.title` says "**Portail** des dirigeants", `seniorityGuide.hub.title` and `.sections.worksheet.items[2]` say "**Centre** des dirigeants", `dfrGuide.hub.body` says just "du Hub". Normalize all to **Hub des dirigeants**.

## 3. Jargon on volunteer pages

| Key | Before | Proposed |
|---|---|---|
| `resources.builtFrom.items[1]` | "reference **tenant defaults** from official union graphics guidelines" | "starter values from published union graphics guidelines (change them in Brand Kit)" |
| `brandKit.contrastAdvisory.resetDefaults` | "Reset to **tenant** defaults" | "Reset to preset colours" |
| `brandKit.canvas.description` | "Optional canvas **chrome**: QR plate, **type scale**, alignment, and surface style." | "Optional finishing touches for exports: QR plate, text scale, alignment, and background surface." |
| `brandKit.canvas.title` (FR) | "Style de **toile**" (painter's canvas; the rest of the block says *canevas*) | "Style de canevas" |
| `brandKit.profileHint` | "Switch **FT / PT Support Staff (or other) identity** without **wiping** colours or logo." | "Switch between your full-time and part-time identities without losing your colours or logo." |
| `installPage.limitsBrand` | "**Install chrome** follows your Brand Kit **primary**." | "The installed window uses your Brand Kit's main colour." |
| `installPage.limitsNoStore` | "install is the browser's own **progressive web app flow**" | "installing uses your browser's own app-install feature" |
| `emailBroadcastGuide.sections.lists.content` | "no member marketing lists, auto-broadcasts, dues, or **PCI workflows**" | "does not keep member marketing lists, send automatic broadcasts, or handle dues or card payments" |
| `unionBoardsGuide.bareMinimum.items.socials.content` | "One clear **CTA**" | "One clear call to action" |
| `toolsIndex.blurbs.meetingBackground` | "Zoom/Teams virtual backgrounds with **brand chrome**." | "Zoom and Teams backgrounds in your local's colours." |
| `dfrGuide.sections.practice.items[1]` | "**Diary** every CA deadline forward from the triggering event" | "Put every CA deadline in your calendar, counted forward from the triggering event" |
| `routeUi.quips.meeting[0]`, `.meeting[2]` | "that local **slug**" / "That **slug** never made it onto the calendar." | "that local link" / "That link never made it onto the calendar." |
| `routeUi.quips.rsvp[2]` | "No meeting **headcount behind that token**." | "There's no meeting count behind that link." |
| `websiteGuide.build.steps.fill.content` | "before you **ship**" (FR: "**placeholder**") | "before you publish" (FR: "espace réservé") |

`privacyPage.hubSelfHost` keeps `AUTH_SECRET` and `privacyPage.installBody` keeps
"offline shell": that paragraph is addressed to whoever self-hosts, not to stewards, so
the env var stays. Noted as a deliberate exception to the "no env vars in public copy"
rule.

## 4. Fragments and telegraphic body copy

The old word ceiling clipped subjects and verbs out of body copy. Card blurbs and
routeUi quips are allowed to stay as noun phrases; these are not:

| Key | Before | Proposed |
|---|---|---|
| `emailBroadcastGuide.sections.checklist.content` | "Subject clear. Local number in the body. Link or QR for RSVP. No sensitive case details in open broadcasts." | "Make the subject line clear, put your local number in the body, and add a link or QR code for RSVPs. Keep sensitive case details out of any open broadcast." |
| `home.channelsIntro` | "Four channels, equal weight. Open a tool or guide below." | "All four channels carry equal weight. Open a tool or guide below." |
| `resources.purpose.body` | "Locals need clear Comms **now**: social, print, boards, and a simple website." | "Every local needs clear communications on four channels: social, print, workplace boards, and a simple website." |
| `resources.checklist.intro` | "Complete these once - self-paced or in a workshop - so your local can **ship** real materials." | "Work through these once, on your own or in a workshop, and your local will have real materials to post." |
| `installPage.whereBody` | "Best on desktop Chrome/Edge and iOS Safari. Android Chrome when Install app is offered." | "It works best in Chrome or Edge on a computer and in Safari on iPhone or iPad. On Android, use Chrome when it offers Install app." |
| `printGuide.sections.when.content` (FR) | "quand le social peut manquer des gens : quarts, sans téléphone, et lieux passants" | full sentence: "…les quarts de travail, les membres sans téléphone intelligent et les lieux très passants" |
| `guide.chapters.trolls.content` (FR) | "Face à la direction : faits, convention, escalade." | "Face à la direction, tenez-vous aux faits, citez la convention et faites remonter le dossier." |
| `seniorityGuide.sections.compare.content` (FR) | "Deux membres, un poste cible." | "Commencez avec deux membres et un poste cible. Notez la date d'ancienneté, la classification et le statut sur une seule feuille avant de débattre." |
| `resources.intro` (FR) | "En solo, lunch-and-learn ou atelier." | "Utilisez-la en solo, en dîner-causerie ou en atelier." |
| all FR `whenToUse` (9 tools) | subjectless: "Pour recadrer logo ou photo…", "Pour remplisseurs de tableau…" | "À utiliser pour…" complete sentences, restoring the clauses FR dropped (e.g. logoBuilder FR lost "so every tool matches") |

`guide.intro` also puts two cross-links in the lead ("Need the map or sources? Open
Comms Resources") when `guide.path.resources` already links there from a chip. Cut the
third sentence per the copy rule (cross-links belong in chips, not the lead).

## 5. EN↔FR semantic drift

- **"Flyer" has three French names.** `nav.flyerMaker` and `printGuide.sections.flyers.title` say *affiche* (poster), `crisisGuide.tools.items[2]` says *dépliant* (leaflet), while `tool-meta`, `examples.cta.flyer`, and `printGuide.sections.flyers.content` say *tract*. **Tract** is right for Ontario locals; normalize FR to *tract* (the EN locked name `Flyer Maker` does not change).
- **"Alt text" has two French names.** `nav.altText` / `altTextAssistant.*` / `accessibility.features.altTextTool` say *texte alt*; `tool-meta` FR says *texte alternatif*. Normalize to *texte alternatif*.
- **DFR acronym is inconsistent in FR**: *DRE* (`sections.whatItMeans.title`), *DJR* (`whatItMeans.content`, `failureModes.content`), and the intro spells it "devoir de **juste** représentation" while the page title says "devoir de **représentation équitable**". Normalize to **DRE / devoir de représentation équitable**.
- **English statute acronyms in French**: `rightToRefuseGuide.subtitle` / `.intro` / `.disclaimer.body` say *OHSA* while the body correctly says *LSST*; `unionBoardsGuide.materials.items.boardL33Desc` says *ESA* while the rest says *LNE*.
- **"against" calqued as "contre"**: `seniorityGuide.intro` / `.disclaimer.body`, `rightToRefuseGuide.intro` — "Vérifiez **contre** votre convention" → "Vérifiez … **dans** votre convention".
- **Clauses dropped in FR**: `unionBoardsGuide.bareMinimum.tip` (lost "so the board never looks abandoned"), `websiteGuide.maintain.items.who.content` (lost "so updates do not die when someone leaves"), `websiteGuide.deploy.steps.account.content` (lost "over one personal login"), `logoBuilder.whenToUse`, `quoteCard.whenToUse`, `flyerMaker.whenToUse`.
- **Anglicisms**: `manifesto.noSubsBody` FR "paywalls" → "murs payants"; `photoConsentGuide.workshop.content` FR "pausez" → "arrêtez-vous"; `websiteGuide.maintain.items.who.content` FR "un steward du site" → "un responsable du site"; `supportPage.contactBody` FR "Écrivez au steward" → délégué/GitHub wording; `dfrGuide.sections.practice.content` FR "votre rep de service" → "votre représentant de service"; `crisisGuide.tools.items[3]` FR "flux de consentement" → "l'étape de consentement".
- **Mistranslation of "locals"**: `unionBoardsGuide.layouts.title` FR "(locaux réels)" reads as *real rooms* → "(vraies sections)".
- **Wrong example domain**: `websiteGuide.domain.steps.cname.content` FR invents `section243.org`; EN and every other reference use `local243.org`.
- **French typography**: `accessibility.limitations.body` FR "embarqué**:**" is missing the space French requires before a colon.
- `manifesto.p2` FR "juste pour **organiser le travail de base**" inverts EN "just to do basic organizing".
- `manifesto.noDataBodyCommsOnly` FR drops the "no venture landlords" punch entirely.
- `crisisGuide.backToGuide` FR lowercases the locked name ("Retour au **plan directeur**") where every other page capitalizes *Plan directeur*.

## 6. UX issues

- **Duplicate CTA pair in the first two viewports of home.** When the Officer Hub is public, `HomeContent` renders the same Brand Kit + "Open the first-week roadmap" button pair in the hero *and* in the Comms path card — the smoke test even documents it ("Hero + Comms path share the same label"). `home.pathCommsCta` ("Get started") exists but is unused. Copy-level mitigation now: make `pathCommsDesc` / `pathCommsHint` clearly say something the hero does not. Structural de-duplication (use `pathCommsCta` on the card, or drop the second roadmap button) is a follow-up because it changes the asserted accessible names.
- **`common.exportPartial` reads as a count but is passed a list.** `board-banner` passes joined sheet labels into `{failed}`, so the string renders "3 of 5 sheets exported. Top strip, Side rails failed." Reword so a label list reads naturally: "Exported {exported} of {total} sheets. These did not export: {failed}. Try again."
- **Unhelpful Brand Kit import states.** `brandKit.importSuccess` "Brand kit imported successfully" (lowercases the locked term, says nothing about what changed) and `brandKit.importError` "Invalid brand kit file" (no next step). Give both a consequence and a remedy.
- **`pulsePoll.saveError`** ("Could not save draft on this device.") has no remedy even though the usual cause is blocked browser storage — the same condition `brandKit.storageBlocked` already explains well.
- **Support page CTA/body mismatch.** `supportPage.contactBody` says "Email the steward" but the only button is "Open GitHub issues". Align the body with the button.
- **`installPage.relatedMid`** reads ". Optional tips live on [Support the builder]" — "tips" as gratuity is unclear next to a page full of install tips (FR resolves it as *pourboires*). Use "If you want to chip in, visit …".
- **Ellipsis inconsistency** between `common.loading` ("Loading...") and `routeUi.loading` ("Loading…"). Same widget family, two glyphs.
- **`resources.facilitators.note` is character-for-character identical to `resources.presentation.note`** and both render on `/guide/resources`. Vary the second one.
- `photoConsentGuide.subtitle` is the only guide subtitle with no terminal period, and `photoConsentGuide.checklist.items.minors` ends "before publish".
- `crisisGuide.intro` says "your **central** union", which reads as Quebec *centrale* to some and as nothing to others. "your provincial or national union" is unambiguous and stays multi-union.
- Deliberately left playful: all `routeUi.quips.*`, `routeUi.errorTitle` ("Needs a steward"), `routeUi.local243Footnote`, and the JUST BE LOVED easter egg copy.

## 7. SEO issues

The dominant problem is **sentences that start lowercase** — the fingerprint of an
earlier pass that replaced semicolons and dashes with periods. These render verbatim in
search results and share cards.

`src/lib/seo/site.ts`
- `SITE_DESCRIPTION` (Comms-only): "…on your device. **no** ads, no subscriptions, no data harvesting." → "…on your device: no ads, no subscriptions, and nobody harvesting your data."
- `SHARE_BLURB` (both variants): "…for union locals. **stewarded** by Ryan Morris." → "…for union locals, stewarded by Ryan Morris." and "no data harvesting **business**" → "no data-harvesting business".

`src/lib/seo/public-page-meta.ts` — lowercase second sentences on ten EN paths
(`/assets`, `/tools`, `/guide`, `/guide/social-media-plan`, `/guide/union-boards`,
`/guide/website`, `/guide/email-broadcast`, `/guide/membership-signup`,
`/guide/seniority-bumping`, `/guide/right-to-refuse`) and the matching FR paths. Fix by
promoting the fragment to a real clause (colon or joined sentence), not by deleting it.
Also align the leads that changed on the page: `/guide/crisis` and
`/guide/membership-signup` descriptions should match the new subtitles.

`src/lib/seo/tool-meta.ts`
- Same lowercase bug in five FR descriptions: `board-banner` ("pointillés. **gratuit**"), `meeting-background` ("Teams. **mises**"), `action-card` ("campagnes. **lien**"), `qr-board` ("babillards. **deux**"), `document-generator` ("ZIP. **sur**").
- Thin descriptions well under the ~140–160 character target, all of which lose the on-device selling point: `alt-text` (52), `quote-card` (70), `board-notice` (79), `logo-builder` (82), `qr-card` (82), `website-template` (78). Expand with one concrete clause each; do not keyword-stuff.
- Title/H1 relationships are fine: `TOOL_SEO` titles are deliberately search-shaped ("Free Union Flyer Maker") while H1s stay product-shaped ("Picket / Rally Flyer Maker"), and both share the nav vocabulary.

No EN/FR key mismatches, no duplicate descriptions, and no keyword stuffing found in
either SEO registry.

## Intentionally left long

- `privacyPage.*` — every clause carries legal meaning (PIPEDA/FIPPA, data controller, self-host duties). Only the locked-term casing (`Brand kit` → `Brand Kit`) and the FR calque "pratiques de violation" change.
- `pollPublic.consent` — consent text; wording is the record of what the member agreed to.
- `dfrGuide.disclaimer.*`, `seniorityGuide.disclaimer.*`, `rightToRefuseGuide.disclaimer.*`, `photoConsentGuide.intro` — "Not legal advice / Aid only" language stays intact.
- `assets.referenceNote`, `websiteTemplate.referenceNote` — licensing and attribution statements.
- `accessibility.commitment.body`, `accessibility.limitations.body` — AODA/WCAG commitments; the limitations paragraph must keep naming the canvas/export gap.

## Not doing

- No blanket word ceiling comes back. The guard keeps only the named lead limits and the ≤1 em-dash-on-leads cap.
- No renames of locked product terms (UnionOps Comms, Officer Hub, Brand Kit, First week, Graphic Maker, Image Resizer, Board Notice, nav tool names).
- No new tools, routes, hardcoded national union names, or hashtags in generic copy.
- Smoke-asserted headings and labels stay byte-identical (`Feed the board - posters and templates`, `Reference layouts from real locals`, `Demo this in about 20 minutes`, `Local Logo Builder`, `Why it's free`, tool H1s, `Download …` buttons, `Also see`, `Get started`, `Set up your local brand`).
