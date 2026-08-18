# Session knowledge — 2026-08-18 (Short-form video guide)

**Audience:** future agents + Ryan.  
**Companion:** [`../modules/COMMS.md`](../modules/COMMS.md), [`../modules/COMMS_BACKLOG.md`](../modules/COMMS_BACKLOG.md), [`.cursor/rules/comms-public-nav.mdc`](../../.cursor/rules/comms-public-nav.mdc).

## What shipped

`/guide/short-form` is a **channel-practice guide** (Email & outreach analog), not a Video Hub and not a maker. Copy lives in `shortFormGuide` (EN/FR). Editors are a TypeScript registry ([`short-form-editors.ts`](../../src/lib/constants/short-form-editors.ts)) with i18n names — no CapCut/Canva URLs.

## Decisions

- **Native phone editor first; CapCut last.** UnionOps’s claim is on-device sovereignty. Leading with CapCut would contradict that.
- **No Instagram / TikTok / YouTube iframes** (ADR-006). Official help URLs only in [`comms-sources.ts`](../../src/lib/constants/comms-sources.ts).
- **No fifth Tools ▾ column.** Discoverability: Guides → By channel, First week socials tertiary, Resources, Blueprint `channelGuides`.
- **Photo Consent stays the privacy gospel.** Video bullets were added there; the short-form guide links it instead of duplicating.

## Do not

- Rebuild Share Kit / a social orchestrator
- Ship an in-browser NLE, hashtag generator, or filterable SaaS directory
- Document “the current Reels algorithm”
- Add Graphic Maker `portrait` in the same train as copy (optional later; Resizer Story 1080×1920 and Solidarity Poster 9:16 already exist)
