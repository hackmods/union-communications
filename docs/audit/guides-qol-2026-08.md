# Public guide QOL audit — 2026-08-24

**Scope:** All 16 public `/guide` routes.  
**Question:** Which guides are flushed-out and steward-usable vs pamphlet fluff? Do cited sources exist, resolve, and match the topic?

## Method

| Check | Evidence |
|---|---|
| Copy depth | EN word count from `messages/en.json` namespaces (2026-08-24) |
| Page structure | `src/app/[locale]/guide/**/page.tsx` — TOC, `SourcesBlock`, tool CTAs, diagrams |
| Source registry | `src/lib/constants/comms-sources.ts` → `PAGE_SOURCE_IDS` |
| Link health | GET fetch of 22 unique registry URLs cited on guide pages (User-Agent: `UnionOps-guide-audit/1.0`) |
| Discoverability | `nav-config.ts`, `/guide/resources` path links, sitemap |

**Bar for “flushed out”:** A steward can finish a job after reading — ordered steps, checklist or worked example, tool handoff where relevant, and on-topic sources that resolve (or are documented as bot-walled with a browser-verify note).

Channel guides **print**, **union-boards**, **website**, **membership-signup**, **workshop**, **first week**, and **short-form** set the internal bar (~660–1,669 EN words, TOC or rich components).

---

## Verdict summary

| Route | Verdict | Rewrite | EN words | Why |
|---|---|---|---:|---|
| `/guide/dfr` | **Fluff** | **P0** | 359 | Generic 4-section pamphlet; sources are OPSEU CA/forms/portal, not DFR law |
| `/guide/joint-committee` | **Thin playbook** | **P1** | 530 | Real campus → caucus → table → post-minutes path; needs depth + CA cites |
| `/guide/right-to-refuse` | **Thin playbook** | **P1** | 418 | OHSA s.43 scoped; missing stage 1 vs 2, MOL guide |
| `/guide/seniority-bumping` | **Thin playbook** | **P1** | 411 | Worksheet CTA saves it; one comparison, one source |
| `/guide/crisis` | **Thin playbook** | **P2** | 519 | Useful scenario bullets; no TOC or worked day |
| `/guide/photo-consent` | **Usable** | **P2** | 439 | Strong checklist; sources are WCAG/AODA, not photo law |
| `/guide/resources` | **Usable hub** | **P2** | 697 | Good index; **labour guides omitted** from path links |
| `/guide` (Blueprint) | **Usable index** | **P3** | 287 | Five orientation chapters, not a handbook |
| `/guide/print` | **Usable** | **P3** | 1,022 | TOC + five jobs; branding-only sources |
| `/guide/email-broadcast` | **Usable** | **P3** | 660 | TOC + BCC checklist; branding-only sources |
| `/guide/membership-signup` | **Usable** | **P3** | 1,188 | Eight-section TOC; federation homepages only |
| `/guide/social-media-plan` | **Gold** | Hold | 417 | Ordered first-week roadmap + demo path |
| `/guide/workshop` | **Gold** | Hold | 818 | Facilitator hour; no `SourcesBlock` (acceptable) |
| `/guide/union-boards` | **Gold** | Hold | 1,032 | Diagrams, materials, ministry posters |
| `/guide/website` | **Gold** | Hold | 1,669 | ZIP → GitHub Pages → custom domain |
| `/guide/short-form` | **Gold** | Hold | 721 | Film, consent, one ask, platform help |

**Labour guides** are sitemap-indexed and linked from The Blueprint labour strip (`/guide/page.tsx`) but **not** in Guides nav (`nav-config.ts`) — intentional product choice per `prod-readiness-sweep-2026-07-29.md`.

---

## Named examples

### `/guide/dfr` — fluff (P0 rewrite)

**Shipped (FUTURE-002 closed 2026-07-23):** `GuideLayout` + disclaimer + four `sectionKeys` blocks + `SourcesBlock`. Matches crisis/right-to-refuse pamphlet scaffold.

**What it covers:** arbitrary / discriminatory / bad-faith test, failure modes, practice checklist — all generic bullets.

**What a steward still cannot do after reading:**

- Name the statute (LRA 1995 s.74; CCBA 2008 for CAAT; CLC s.37 if federal).
- Open authoritative DFR material (OLRB Information Bulletin 12 “What does it mean?”, IB 11 “Applications”).
- Walk a worked file: same-day intake, investigation notes, written decline, extension in writing.
- Deep-link into Hub grievance tools (callout mentions Hub but no `/app/grievances` link).

**Sources cited (`PAGE_SOURCE_IDS.dfr`):** `opseu-collective-agreements`, `opseu-forms`, `opseu-member-portal` — adjacent union hubs, **not DFR law**. A 200 OK on the wrong document would still fail the steward.

**Rewrite should add to `comms-sources.ts`:** e-Laws LRA s.74; OLRB IB 11/12 PDFs; optional CIRB Circular 11 + CLC s.37 for federal units (multi-union). Keep “not legal advice”; teach how **not** to generate complaints, not how to sue the union.

### `/guide/joint-committee` — thin, not fluff (P1 flesh-out)

**Shipped 2026-08-23** per `session-knowledge-2026-08-23-eerc-committees.md`.

**Usable today:** Local UCC first → private caucus → joint table (refuse live grievances) → member explainer only after signed minutes. Letterhead + email-broadcast CTAs. OPSEU / SEFPO EERC correctly one example, not a product name. Hub `/app/committees` links here.

**Still missing:** TOC; worked member explainer; CA article numbers (PT 5.4 / Appendix 4, FT 4.7 / Appendix J) on the public page; inclusion on `/guide/resources` path links.

**Sources:** CA finder + `opseu-eerc-minutes` + `cec-pteerc-minutes` + `cec-fteerc-minutes`. CEC archives **200** in fetch; OPSEU EERC URL **403** to scripts (bot wall — confirm in browser; sector page still links this slug).

---

## Source health (live fetch — 2026-08-24)

Automated GET of registry URLs cited across guide pages. **Browser verification remains authoritative for `opseu.org`** (Cloudflare often returns 403 to scripts).

| Status | IDs |
|---|---|
| **200** | `wcag-21`, `facebook-groups`, `ofl`, `nupge`, `clc`, `local243-website` (`https://opseu243.org/`), `github-pages`, `github-pages-custom-domain`, `ontario-required-posters`, `ontario-esa-poster`, `ontario-ohsa`, `instagram-reels`, `youtube-shorts`, `aoda`, `opseu-member-portal`, `cec-pteerc-minutes`, `cec-fteerc-minutes` |
| **403** (bot wall — confirm in browser) | `opseu-branding`, `opseu-collective-agreements`, `opseu-forms`, `opseu-eerc-minutes`, `opseu-home`, `opseu-contact` |

### Registry fixes applied 2026-08-24 (LINK-001 follow-up)

| ID | Was (legacy / wrong) | Now (indexed live path) |
|---|---|---|
| `opseu-collective-agreements` | `…/information/general/find-your-collective-agreement/12967/` | `…/information/find-your-collective-agreement/12967/` — matches Members tools hub |
| `local243-website` | `https://local243.org` | `https://opseu243.org/` — old domain redirects |
| `aoda` | `…/accessibility-laws` | `…/accessibility-in-ontario` — redirect target |
| `jointCommittee` sources | PT CEC only | Added `cec-fteerc-minutes` (FT archive beside PT) |

**Guard:** `comms-sources.test.ts` now forbids retired patterns (`12263`, `/contact/`, `/information/general/`, `bargaining/collective-agreements…`, etc.).

**Optional script:** `node scripts/verify-comms-sources.mjs` — re-run after national site changes.

`comms-sources.test.ts` asserts `https://` shape and page mapping — not live fetch.

**Off-topic source mappings (rewrite bibliography, not just copy):**

| Page | Problem |
|---|---|
| `dfr` | CA / forms / portal — not DFR |
| `photoConsent` | WCAG / AODA / CA — not photo consent law |
| `print`, `emailBroadcast` | Branding only — weak for channel practice |
| `membershipSignup` | Federation homepages only |

---

## Rewrite queue

**Status: closed 2026-08-24** — P0–P3 rewrites landed (TOC, worked examples, on-topic `comms-sources`, resources labour path links, EN/FR parity).

1. ~~**P0 — `/guide/dfr`**~~ — LRA s.74 + OLRB IB 11/12, worked intake file, Hub grievance link.
2. ~~**P1 — `/guide/joint-committee`**~~ — CA article refs, worked member explainer, TOC.
3. ~~**P1 — `/guide/right-to-refuse`**~~ — Stage 1 vs 2, reprisal, ministry Part V guide source.
4. ~~**P1 — `/guide/seniority-bumping`**~~ — Second cascade example; CCBA source.
5. ~~**P2 — `/guide/crisis`**~~ — TOC + worked high-stakes day.
6. ~~**P2 — `/guide/photo-consent`**~~ — Privacy sources (IPC, PIPEDA); checklist retained.
7. ~~**P2 — `/guide/resources`**~~ — Four labour guides in path links.
8. ~~**P3 — print, email, membership, Blueprint**~~ — Deepened bibliography and Blueprint chapters.

---

## Files touched by a rewrite pass

- `messages/en.json` + `messages/fr.json` — guide namespaces
- `src/lib/constants/comms-sources.ts` — new DFR / OHSA / joint-committee sources
- `src/app/[locale]/guide/**/page.tsx` — TOC, CTAs, optional worked examples
- `src/app/[locale]/guide/resources/page.tsx` — labour path links
- Optional: `nav-config.ts` if product decides to surface labour guides in Guides menu

**Do not** close labour tickets on the four-section pamphlet scaffold alone.
