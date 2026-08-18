# Comms Module — Sources & References

External resources cited across guides, tools, and exported materials. Canonical registry: [`src/lib/constants/comms-sources.ts`](../src/lib/constants/comms-sources.ts).

**Link audit:** [`LINK-001`](audit/execution-backlog.md) (URL rot) and [`LINK-002`](audit/execution-backlog.md) (multi-union gating) — playbook [`docs/audit/external-links-audit-plan.md`](audit/external-links-audit-plan.md). When updating any URL here, change `comms-sources.ts` first, then this table. Do not add page-level hardcoded duplicates.

**Union scope:** Rows tagged OPSEU in the registry use `unionIds: ["opseu"]` and are hidden when Brand Kit preset is another union. Unset preset = reference demo (OPSEU still shown). Universal rows (WCAG, Ontario posters, GitHub Pages, …) always show. Stance on bundling logos: [`session-knowledge-2026-07-30-multi-union-sources.md`](audit/session-knowledge-2026-07-30-multi-union-sources.md).

## Branding

| Source | URL | Used in |
|--------|-----|---------|
| OPSEU/SEFPO graphics, logos & letterhead | https://opseu.org/about/ | Asset pack, Brand Kit defaults, all graphic tools (About → Download graphics) |

**Notes:** OPSEU blue `#003DA5` (Pantone 285). White `#FFFFFF` is the graphics accent on blue/dark backgrounds. See `.cursor/rules/opseu-branding.mdc`.

## Website template

| Source | URL | Used in |
|--------|-----|---------|
| Local 243 website (reference) | https://local243.org | Website Template tool, website guide |
| GitHub Pages | https://docs.github.com/en/pages | Website guide, exported README |
| GitHub Pages custom domains | https://docs.github.com/en/pages/configuring-a-custom-domain-for-your-github-pages-site | Website guide |

**Notes:** The exported template is a simplified, parameterised version of the volunteer-built Local 243 GitHub Pages site. Header uses OPSEU banner SVG instead of local logo in nav. EmailJS removed — contact via `mailto:`.

## Union resources

| Source | URL | Used in |
|--------|-----|---------|
| OPSEU Member Portal | https://members.opseu.org/ | Crisis guide, exported site footer |
| Collective agreements | https://opseu.org/bargaining/collective-agreements-and-arbitration-awards/ | Union boards guide, crisis guide |
| Forms and documents | https://opseu.org/about-opseu-sefpo/forms-documents/ | Crisis guide, exported site footer |
| Ontario Federation of Labour | https://ofl.ca/ | Exported site footer (optional) |
| Posters required in the workplace | https://www.ontario.ca/page/posters-required-workplace | Union boards guide — feed empty boards |
| ESA mandatory information | https://www.ontario.ca/document/your-guide-employment-standards-act-0/mandatory-information-employees | Union boards guide + printable PDF mirror |
| OHSA (e-Laws) | https://www.ontario.ca/laws/statute/90o01 | Union boards guide — QR to live statute |

**Printable mirrors:** `public/assets/ontario-board-posters/` (ESA posters, Form 82). Anonymized local demos: `public/demo/union-boards/`.

## Accessibility

| Source | URL | Used in |
|--------|-----|---------|
| WCAG 2.1 | https://www.w3.org/TR/WCAG21/ | Contrast checker, alt-text tool, accessibility statement |
| AODA | https://www.ontario.ca/page/accessibility-laws | Accessibility statement |

## Platforms

| Source | URL | Used in |
|--------|-----|---------|
| Facebook Groups | https://www.facebook.com/help/groups | Blueprint (platform choice) |
| Record a Reel on Instagram | https://help.instagram.com/2720958398006062/ | Short-form video guide |
| Get started creating YouTube Shorts | https://support.google.com/youtube/answer/10059070 | Short-form video guide |

## Internal / volunteer-authored

| Content | Origin |
|---------|--------|
| The Blueprint chapters | Volunteer comms best practices for CAAT Support Staff locals |
| Crisis comms guide | High-level guidance aligned with OPSEU local protocols — not legal advice |
| Caption library | Reusable templates for common local post types |
| Demo Brand Kit | `public/demo/brand-kit-local-243.json` — Local 243 reference tenant |

## User-facing pages

- **Comms Resources:** `/[locale]/guide/resources` — orientation, practice checklist, full bibliography (legacy `/guide/materials` redirects here)
- **Per-page sources:** `SourcesBlock` component at bottom of guides and tools

## Facilitator docs

- Presentation (remote lunch-and-learn): [`docs/workshop/from-scratch-to-solidarity.md`](../workshop/from-scratch-to-solidarity.md)
- Hands-on 60-minute workshop: [`docs/workshop/aug-18-comms-toolbox.md`](../workshop/aug-18-comms-toolbox.md)
