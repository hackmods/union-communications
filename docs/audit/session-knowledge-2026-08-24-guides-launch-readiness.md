# Session knowledge — Public guides launch readiness (2026-08-24)

**Audience:** future agents + Ryan.  
**Companions:** [`guides-qol-2026-08.md`](guides-qol-2026-08.md), [`session-knowledge-2026-07-30.md`](session-knowledge-2026-07-30.md) (LINK-001), [`.cursor/rules/external-links.mdc`](../../.cursor/rules/external-links.mdc), [`prod-readiness-sweep-2026-07-29.md`](prod-readiness-sweep-2026-07-29.md).

---

## Launch verdict (Comms public)

**Ship.** All 16 `/guide` routes are steward-usable for a Comms launch. The P0–P3 rewrite queue closed 2026-08-24. Officer Hub advertising and Postgres durability are separate from Comms-only launch.

---

## Guide tiers (defaults — do not re-audit as fluff)

| Tier | Meaning | Guides |
|---|---|---|
| **Gold** | Facilitator-ready depth; TOC or rich components; tool handoffs | First week, workshop, union-boards, website, short-form, membership signup, **union-history** |
| **Playbook** | Gate → steps → worked example → Hub/tool CTA → on-topic sources | DFR, joint committee, right-to-refuse, seniority, crisis, photo consent, Blueprint |
| **Channel (usable)** | TOC + checklists + channel practice; **not** full playbook depth | **Print**, **email-broadcast** — launch-ready; deepen only if stewards ask |

Print and email are **intentionally channel-tier**, not labour-playbook tier. Do not block launch on rewriting them to joint-committee depth.

---

## Discoverability defaults (no Guides nav for labour)

Labour playbooks are **not** in `nav-config.ts` Guides menu — intentional per prod-readiness sweep.

**Where stewards find them instead:**

1. **Comms Resources** — dedicated **Labour rights playbooks** section (below the Comms path list).
2. **The Blueprint** — labour strip at bottom of `/guide`.
3. **Sitemap** — all routes indexed.
4. **Cross-links** — each labour guide links related playbooks.

Adding a Guides nav group is a **product fork**, not a launch blocker. Prefer the Resources section + Blueprint strip until Hub is advertised broadly.

---

## Workshop guide

Gold facilitator run sheet; **`SourcesBlock` added 2026-08-24** with workshop `PAGE_SOURCE_IDS` (brand, reference local site, GitHub Pages, Facebook groups, WCAG). Facilitators should still browser-check OPSEU links before live rooms.

No minute-by-minute run sheet on the public page — dated run sheets stay in `docs/guides/WORKSHOP_SOCIAL_COMMS.md`.

---

## OPSEU national URLs (LINK-001)

- Registry: [`comms-sources.ts`](../../src/lib/constants/comms-sources.ts) — paths fixed 2026-08-24 (`find-your-collective-agreement`, `opseu243.org`, AODA hub, FT CEC minutes).
- **Browser verification is authoritative** for `opseu.org` — Cloudflare returns **403** to scripts and many crawlers.
- **`node scripts/verify-comms-sources.mjs`** — optional; treats 403 as WARN, not FAIL.
- **`sources.intro`** (EN/FR) and OPSEU source `note` fields remind stewards to open links in a browser before workshops.
- Re-run verify + spot-check in browser after national site reorganizations.

---

## Pre-launch checklist (30–60 min)

1. `npm run test:smoke` on production-like `AUTH_URL`
2. EN + FR click-through: First week → Blueprint → one labour playbook → print or email
3. Browser-open Sources on DFR, joint committee, right-to-refuse (OPSEU rows)
4. Confirm `AUTH_URL` = public HTTPS host (SEO/canonicals)

---

## Next work (post-Comms launch)

1. **Ops Postgres flip** — `docker-compose.durable.yml`, `npm run ops:verify-durable`
2. **Optional:** labour guides in Guides nav when launch audience is CAAT stewards
3. **Optional:** print/email playbook depth if channel guides get feedback
4. **Hub copy** — `COPY-003` closed; sequel pass 2026-08-24 (Time/QOL error remedies + operator wording)
