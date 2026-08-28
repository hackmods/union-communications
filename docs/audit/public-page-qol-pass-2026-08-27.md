# Public page QOL pass — 2026-08-27

**Goal:** Every `PUBLIC_PATHS` route gets a layout/composition check and EN/FR copy review against the gold-standard bar (playbook TOC + `GuideToolAside`, consequence+remedy copy, cross-links, shared CTAs).

**Bar:** Steward can finish a job after reading — see [`guides-qol-2026-08.md`](guides-qol-2026-08.md) and [`public-space-composition-audit-2026-08.md`](public-space-composition-audit-2026-08.md).

Legend: **✅** pass · **⚠️** intentional exception · **🔧** fixed this pass

---

## Summary

| Area | Routes | Status |
|------|--------|--------|
| Marketing / focus | 7 | ✅ |
| Legal | 3 | ✅ (narrow tier) |
| Comms catalog | 4 | ✅ |
| Guides (playbook/gold/channel) | 22 | 🔧 `GuideToolAside` on all playbook-tier + hub steward-playbooks |
| Officer Learning | 7 | ⚠️ dark shell — shared `GuideToc`; tool handoff in module body |
| Tools (canvas) | 16 public | ✅ `ToolEditorLayout` parity (UI-017) |

---

## Marketing & focus

| Route | Composition | Copy | Notes |
|-------|-------------|------|-------|
| `/` | ✅ | ✅ | COPY-001 two-zone hero |
| `/manifesto` | ✅ focus | ✅ | ADR-019 pricing honesty |
| `/updates` | ✅ | ✅ | Growth list only |
| `/support` | ✅ focus | ✅ | Consequence + remedy CTAs |
| `/install` | ✅ focus | ✅ | PWA steps |
| `/feedback` | ✅ focus | ✅ | Form + privacy note |
| `/onboarding` | ✅ focus | 🔧 | Added EN/FR `subtitle` under title |

---

## Legal

| Route | Composition | Copy | Notes |
|-------|-------------|------|-------|
| `/privacy` | ✅ narrow | ✅ | GuideLayout legal preset |
| `/security` | ✅ narrow | ✅ | |
| `/accessibility` | ✅ narrow | ✅ | AODA statement |

---

## Comms catalog

| Route | Composition | Copy | Notes |
|-------|-------------|------|-------|
| `/brand-kit` | ✅ workspace | ✅ | DataAdapter; setup prompt |
| `/tools` | ✅ catalog | 🔧 | ComposedPageLayout; start-here + labour strip |
| `/examples` | ✅ wide | 🔧 | Filter rail; captions cross-link |
| `/captions` | ✅ wide | 🔧 | Examples cross-link |
| `/assets` | ✅ wide | 🔧 | Registry dedupe; ZIP footers |

---

## Guides — playbook / gold / channel

All playbook-tier guides: `preset="playbook"` + section TOC + **`GuideToolAside`** @ lg+ (UI-018 extended).

| Route | Aside primary tool | Status |
|-------|-------------------|--------|
| `/guide` | — (hub index) | ✅ sidebar TOC |
| `/guide/resources` | — (hub) | ✅ path grids |
| `/guide/steward-playbooks` | complaint-vs-grievance | 🔧 |
| `/guide/steward-101` | complaint-vs-grievance | 🔧 |
| `/guide/grievance-process` | document-generator intake | ✅ |
| `/guide/dfr` | grievance intake worksheet | 🔧 |
| `/guide/seniority-bumping` | seniority worksheet | ✅ |
| `/guide/right-to-refuse` | QR pocket card | ✅ |
| `/guide/joint-committee` | board-notice | 🔧 |
| `/guide/bargaining` | proposal-tracker | 🔧 |
| `/guide/bylaws` | bylaw-builder | 🔧 |
| `/guide/workplace-mapping` | org-chart | 🔧 |
| `/guide/crisis` | board-notice | 🔧 |
| `/guide/photo-consent` | graphic-maker | 🔧 |
| `/guide/membership-signup` | QR board | ✅ |
| `/guide/union-boards` | board-notice | ✅ |
| `/guide/print` | flyer-maker | ✅ |
| `/guide/website` | website-template | 🔧 |
| `/guide/email-broadcast` | document-generator | ✅ |
| `/guide/short-form` | graphic-maker 9:16 | ✅ |
| `/guide/social-media-plan` | brand-kit + first-week tools | 🔧 |
| `/guide/workshop` | brand-kit + logo-builder | 🔧 |

Copy depth: channel guides (print, email) remain channel-tier by design (COPY-006). Labour playbooks retain 2026-08-24 rewrite depth.

---

## Officer Learning (exception)

| Route | Composition | Copy | Notes |
|-------|-------------|------|-------|
| `/guide/officer-learning` | ⚠️ dark | ✅ | Dashboard + sources footer |
| OL module slugs (×6) | ⚠️ dark | ✅ | In-module tool CTAs + quiz; no light-shell aside |

Documented in [`session-knowledge-2026-08-27-labour-guides-chrome.md`](session-knowledge-2026-08-27-labour-guides-chrome.md).

---

## Tools (public slugs)

Verified via UI-017 regression sweep — all use `ToolEditorLayout` (or documented exceptions: document-generator, alt-text). No new gaps found this pass.

---

## Verification

```bash
npm run lint
npm run test:unit -- src/lib/comms/public-copy-style.test.ts src/lib/constants/updates.test.ts src/lib/seo/public-page-meta.test.ts src/lib/comms/guide-toc-items.test.ts
```

---

## Tickets

- **UI-018** extended — `GuideToolAside` on remaining playbook guides + steward-playbooks hub
- **COPY-006** partial — onboarding subtitle; catalog cross-links from prior commit
