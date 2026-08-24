# Hub copy QOL audit — 2026-08

**Status: implemented 2026-08-11.** Closes `COPY-003`. Sequel to
[`public-copy-qol-2026-08.md`](public-copy-qol-2026-08.md). Lessons from that pass
still apply — especially “EN/FR key parity is not translation quality” and “verify
a new guard by injecting the regression.”

Scope: authenticated Officer Hub namespaces in `messages/{en,fr}.json` that are
**not** in `PUBLIC_NS`, plus two public-but-unguarded token surfaces:

| In scope | Notes |
|---|---|
| `hub`, `tenantOnboarding`, `invites`, `inviteAccept`, `passwordReset` | Sign-in, MFA, onboarding |
| `ledger`, `travel`, `expenses` | Money — mistranslation costs someone |
| `hubPolls`, `meetings`, `meetingsRsvp`, `officers`, `committees`, `elections`, `informalLog`, `minutes` | Org |
| `discussions`, `hubSocial`, `checkins`, `tasks` | Collaboration |
| `hybrid`, `documents`, `qol`, `grievance`, `bumping`, `time`, `portal` | Casework |
| `rsvpPublic`, `meetingPublic` | **HIGH** — members hit `/r/[token]` and `/m/[token]` without login |
| `localLinks`, `membershipUrls` | **Public Brand Kit editors** — classify into `PUBLIC_NS` |

Out of scope: `common.*`, `routeUi.*` (done in the public pass), SEO registries,
hardcoded strings outside `messages/` unless awkward in `src/app/[locale]/app/**`
(spot-check found none worth a separate pass).

Method: ran the existing public-copy guard functions against Hub leaves (1,643 EN /
1,643 FR), then read every money / consent / deadline / MFA / hybrid / onboarding
string for claim-level EN↔FR match. Mechanical guards caught jargon and
`locataire`; they cannot catch a French string that quietly drops a remedy clause.

## Classification: `localLinks` + `membershipUrls`

Both are edited on the **public** Brand Kit page (`LocalLinksEditor`,
`MembershipUrlsEditor` under `/[locale]/brand-kit`). They are not Hub-only.
**Move both into `PUBLIC_NS`** (with `rsvpPublic` / `meetingPublic`) so public
locked-term / jargon / FR-typography rules cover them. `affiche` in their FR
descriptions is correct — those strings mean posters, not Flyer Maker tracts.

## 1. Correctness bugs (fix first)

These are wrong, not just awkward.

| Key | Before | Proposed |
|---|---|---|
| `tenantOnboarding.title` / `hub.tenantOnboardingLink` (FR) | "**Configuration du locataire**" — rental *tenant*, not union | "**Configuration du syndicat**" / EN "**Union setup**" (not "Tenant setup") |
| `tenantOnboarding.loadError` (FR) | "paramètres du **locataire**" | "paramètres du **syndicat**" |
| `tenantOnboarding.unionNotesPlaceholder` | "host brand config, not the **OPSEU reference tenant**" | "this instance’s own Brand Kit setup, not another union’s starter data" |
| `tenantOnboarding.subtitle` / `noOpseuTitle` / `noOpseuBody` | Hardcodes **OPSEU/CAAT** as named defaults in volunteer-facing UI | Plain multi-union wording: new unions never inherit another union’s name, colours, or starter data |
| `tenantOnboarding.memoryNoteBody` | "process **overlay** merged with **seed** data" | "kept on this running server only and merge with the starter data; disappear on restart" |
| `tenantOnboarding.unionCreated` / `unionCreatedDetail` | "runtime **overlay**" / "**slug**" / "auth context" | "saved on this server for now" / "short link name" / "sign in as that union when ready" |
| `hub.mfaError` / `mfaDevHint` / `mfaDisabledDesc` / `mfaSetupError` | Leak `AUTH_*` env var names into the sign-in UI | Name the action (authenticator / demo `000000` / ask whoever runs this Officer Hub) |
| `hubPolls.privacy` | `POLLS_DB_BACKEND=postgres` | Anonymous + no raw IPs; durable storage for real collection; demo responses reset on restart |
| `meetingsRsvp.memoryBanner` | `MEETINGS_RSVP_DB_BACKEND=postgres` | Same idea without the env flag |
| `hybrid.*` FR `magasin du hub` / `magasin central` | Warehouse jargon; EN "hub store" / "central store" | Officer Hub / données du Hub des dirigeants |
| `qol.mobile.readOnlyBanner` (FR) | Drops EN’s remedy ("turn off mobile steward mode to edit") | Restore the turn-off clause |
| `qol.handoff.subtitle` (FR) | Drops "for the incoming steward" | Restore destinataire |
| `qol.handoff.selectSteward` / `qol.mobile.toggle` (FR) | Untranslated English "**steward**" | **délégué** |
| `rsvpPublic.consent` (FR) | "**ce local**" reads as *this room* | "**cette section locale**" |
| `discussions.mentionedCount` (FR) | Byte-identical to EN ICU string | French wording (`personnes citées`) |
| `grievance.outcome.appealHint` (FR) | "**vérifier** la convention" (infinitive) | "**Vérifiez** … dans votre convention" |

Demo credentials (`hub.demoAccounts`) use the reserved `unionops.test` domain so
demo mailboxes cannot collide with a real union or local address. Emails live in
code (`DEMO_LOGIN_ACCOUNTS`), not the message catalog.

## 2. Locked-term / bare-"hub" drift

| Key | Before | Proposed |
|---|---|---|
| `hub.sessionLoading` | "Loading your **hub**…" | "Loading your **Officer Hub**…" |
| `hybrid.importDesc`, `syncSuccess`, `liveLocalBanner`, `dataModeHonest`, errors | bare "the hub" / "hub store" | **Officer Hub** where the casework store is meant |
| `hybrid.modeCentral` (FR) | "Hub central" | "Hub des dirigeants (par défaut)" |
| `time.punchPhotoHint` | "stored on the hub" | "stored in the Officer Hub" |
| FR Brand Kit in onboarding | "couleurs **Brand Kit**" | "couleurs de la **Trousse de marque**" |

No Portail/Centre des dirigeants, lowercase trousse, texte alt, dépliant, OHSA/ESA,
or DJR hits in Hub FR (mechanical scan clean). Flyer/`affiche` in `localLinks` /
`membershipUrls` stays — posters, not tracts.

## 3. Jargon on officer-facing screens

| Key | Before | Proposed |
|---|---|---|
| `hub.auditSubtitle` | "memory store until Postgres" | Demo list resets when the server restarts |
| `hub.memoryBannerBody` | "until Postgres is enabled" | "until lasting storage is turned on" |
| `hub.qolCardTitle` | "Officer **QOL** tools" | "Officer tools" |
| `hub.hybridCardDesc` | "plaintext over **TLS**" / "slice" | Plain: export is protected in transit; browser encrypts; passphrase stays here |
| `hubPolls.fields.slug` | "Share **slug**" | "Share link name" |
| `tenantOnboarding.unionSlug` | "**Slug** (optional)" | "Short link name (optional)" |
| `tenantOnboarding.memoryNoteTitle` | "Memory-backed until Postgres" | "Temporary until lasting storage is on" |
| `tenantOnboarding.newUnionTitle` | "**Provision** a new union" | "**Add** a new union" |
| Hybrid "slice" family | "local data slice", "encrypted slice", … | "local encrypted **copy**" (matches FR *copie*) |
| `hybrid.dataModeHonest` | "**QOL** tools" | "officer tools (snippets, marketplace, handoff)" |

**Deliberate keeps:** union words (grievance, bumping, seniority, bargaining unit /
collection, DFR). `hub.demoAccounts` role labels (no emails in the catalog). Hybrid still says "live-local"
as the product name for that mode (shown on the Hybrid settings page itself).

## 4. Weak error / empty / success states

Highest-density defect area. Pattern: name the failure, the consequence, and the
next action. Samples (full list applied in the UX commit):

| Key | Before | Proposed |
|---|---|---|
| `invites.createError` | "Could not create invite." | "Could not create this invite. Check the email and role, then try again." |
| `expenses.uploadError` | "Receipt upload failed." | "Could not upload that receipt. Use a PDF or image under the size limit and try again." |
| `travel.actionError` / `expenses.actionError` | "That action could not be completed." | "Could not complete that approval step. Refresh and try again, or ask a treasurer." |
| `hybrid.errors.invalidFile` | "Not a valid hybrid encrypted file." | "That file is not a Hybrid backup. Pick the encrypted file you downloaded from Hybrid settings and try again." |
| `hybrid.errors.exportFailed` / `importFailed` / `syncFailed` | Name only | Add passphrase / network remedy |
| `rsvpPublic.error` | "Could not submit. Please try again." | "Could not send your RSVP. Check your connection and try again, or ask your steward for a new link." |
| `documents.empty` | "No documents yet." | "No documents in the vault yet. Upload a file to get started." |
| `grievance.loadError` (and peers missing period/remedy) | "Could not load grievances" | Complete sentence + try again |
| `passwordReset` / `inviteAccept` notFound | invalid/unknown only | Ask for a fresh link |

## 5. EN↔FR semantic drift (non-inversion)

- `qol.mobile.readOnlyBanner` — FR omitted the turn-off remedy (section 1).
- `qol.handoff.subtitle` — FR omitted the incoming steward.
- `grievance.outcome.appealHint` — FR infinitive vs EN imperative; "j" abbreviation vs "jours".
- `meetingsRsvp.empty` FR "ce **local**" → "cette **section**" (room vs local union).
- `discussions.mentionedCount` untranslated ICU.
- FR `provisionner` anglicism → "créer" / "ajouter".

No consent inversions found in Hub GPS or RSVP consent strings (claim-checked against EN).

## 6. Style / voice (after correctness)

- Telegraphic Hub subtitles that lost verbs under earlier brevity pressure
  (`grievance.subtitle`, `bumping.decisionHint`) → complete sentences.
- `hub.qolCardTitle` / card blurbs: prefer "you / your local".
- No blanket word ceiling reintroduced.

## 7. Guard plan

Prefer a sibling **`HUB_NS`** sweep in `public-copy-style.test.ts` (or a thin
`hub-copy-style.test.ts` reusing helpers) so public-only rules stay public-only.

| Check | Hub notes |
|---|---|
| Sentence capitalization | Same helper |
| French `:`/`;` spacing | Same |
| Locked FR names | Same |
| Untranslated FR | Same; ICU plurals must differ or stay ≤4 words |
| Bare "the hub" | **Yes** on Hub too — say Officer Hub |
| Jargon | Hub list: `tenant`, `slug`, `payload`, `adapter`, `overlay`, `RLS`, `memory store`, `*_DB_BACKEND`, `CTA`, `utilize`, `leverage` — **not** grievance/CA/bumping |
| OPSEU/CAAT hardcode | Hub-specific: no national union names in Hub copy |

Then move `rsvpPublic`, `meetingPublic`, `localLinks`, `membershipUrls` into
`PUBLIC_NS`.

Verify every new check with the throwaway injection harness from
[`session-knowledge-2026-08-11-public-copy-qol.md`](session-knowledge-2026-08-11-public-copy-qol.md).

## Smoke pins to update

- `e2e/hub.org.spec.ts` asserts `/Tenant setup|Configuration du locataire/i` →
  update to `/Union setup|Configuration du syndicat/i`
- `e2e/hybrid.smoke.spec.ts` heading `/Hybrid data mode|Mode de donn/i` — keep
  unless title changes
- `e2e/rsvp.smoke.spec.ts` `/Submit RSVP|Envoyer le RSVP/i` — keep

## Deliberately left

- `hub.demoAccounts` sample-account labels (emails live in `DEMO_LOGIN_ACCOUNTS`)
- Hybrid product term "live-local" on the Hybrid page itself
- Playful `routeUi` quips (out of Hub NS scope; already public-pass owned)
- Structural home-hero CTA de-dup (`COPY-001`)
