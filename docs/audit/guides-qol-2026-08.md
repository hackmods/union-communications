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

## Verdict summary (post-rewrite — 2026-08-24)

| Route | Tier | Launch | Notes |
|---|---|---|---|
| `/guide/dfr` | Playbook | ✅ | LRA s.74, OLRB IB 11/12, worked intake, Hub link |
| `/guide/joint-committee` | Playbook | ✅ | Gate → table → member note; CA refs; on-topic sources |
| `/guide/right-to-refuse` | Playbook | ✅ | OHSA s.43 stage 1/2; ministry Part V guide |
| `/guide/seniority-bumping` | Playbook | ✅ | Two cascades; worksheet CTA |
| `/guide/crisis` | Playbook | ✅ | TOC + worked high-stakes day |
| `/guide/photo-consent` | Playbook | ✅ | IPC / PIPEDA sources; checklist retained |
| `/guide` (Blueprint) | Playbook | ✅ | Four channels + worked comms week |
| `/guide/resources` | Hub | ✅ | Comms path + **Labour rights** section |
| `/guide/print` | **Channel** | ✅ | TOC + five jobs; channel-tier (not playbook depth) |
| `/guide/email-broadcast` | **Channel** | ✅ | TOC + BCC checklist; channel-tier |
| `/guide/membership-signup` | Gold | ✅ | Eight-section TOC |
| `/guide/social-media-plan` | Gold | ✅ | First-week roadmap + demo path |
| `/guide/workshop` | Gold | ✅ | Facilitator hour; `SourcesBlock` added 2026-08-24 |
| `/guide/union-boards` | Gold | ✅ | Diagrams, materials, ministry posters |
| `/guide/website` | Gold | ✅ | ZIP → GitHub Pages → custom domain |
| `/guide/short-form` | Gold | ✅ | Film, consent, one ask, platform help |

**Labour guides** are sitemap-indexed, on Comms Resources (labour section), and linked from The Blueprint labour strip — **not** in Guides nav (`nav-config.ts`) unless product opts in. See [`session-knowledge-2026-08-24-guides-launch-readiness.md`](session-knowledge-2026-08-24-guides-launch-readiness.md).

### Launch defaults (channel + OPSEU)

| Topic | Default |
|---|---|
| Print & email | **Channel-tier** — launch-ready; optional future playbook depth |
| Workshop | Gold + `SourcesBlock`; dated run sheets stay in `docs/guides/` |
| OPSEU URLs | Registry paths fixed; **browser verify** before workshops (`verify-comms-sources.mjs` → 403 = WARN) |

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

| Page | Status (2026-08-24) |
|---|---|
| `dfr`, `photoConsent`, labour playbooks | Fixed — on-topic sources |
| `print`, `emailBroadcast` | **Channel-tier** — branding + ministry posters / member portal + WCAG; sufficient for launch |
| `membershipSignup` | Federation homepages + member portal — sufficient for launch |

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
