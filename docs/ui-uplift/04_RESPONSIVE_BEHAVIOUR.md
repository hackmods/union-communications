# Responsive behavior and review

Status: implemented responsive pass reviewed at 320, 375, 768, 1280 and 1536 CSS pixels. Home and Platform pass the five-width matrix in English and French. Home and Platform also pass a 2× text-size check at 320px with no horizontal overflow. Actual browser zoom and human screen-reader review remain follow-up review items; see [implementation status](05_IMPLEMENTATION_STATUS.md).

The Home hero places the premise and useful-work action first, followed by a substantial selectable example. Labels wrap without clipping; the task list, learning example, worksheet preview, Brand Kit relationship, hosted excerpts and trust story follow in open sections rather than stacked miniature cards. At 320×812 in French, the primary action remains visible and the page does not overflow. Desktop site links remain on one row from 1280px. On phones, the global navigation menu and authenticated Hub tools menu have distinct visible labels.

Hosted Home excerpts use phone-specific captures below 640px and desktop captures at larger widths. Full-size links open the same composition as the currently displayed source. These are static, synthetic examples; authenticated Hub or Portal stores are never mounted on Home.

| Surface | Phone | Tablet | Desktop |
|---|---|---|---|
| Home | Clear premise and action, readable product example, concise outcome choices | Preserve narrative order; use paired content only when it remains readable | Balanced message/product hero and open editorial rhythm |
| Catalogs | Search first; wrapping filters and clear active-state removal | Denser results without truncating French labels | Efficient scanning inside the shared wide frame |
| Brand Kit | Identity controls and useful preview with clear save status | Keep settings grouped by consequence and actions close | Editor/preview workspace, not a narrow setup form |
| Builders | Existing Edit/Preview behavior; output actions stay reachable | Controls and preview follow the space available | Working split with readable fields and stable capture geometry |
| Worksheet | Prompts and result in meaningful reading order | Group related inputs without forcing canvas treatment | Use available space without making prose unbounded |
| Hub/Portal | Scope, current work and allowed actions stay visible | Keep relationships and comparisons understandable | Quiet, information-dense operations; no marketing hero |

Browser coverage includes keyboard focus and Escape behavior for menus/dialogs, both localized Home example selectors, bilingual catalog search/no-results/clear/browser-Back behavior, Brand Kit save/error states, forced-colors and reduced-motion states, and axe scans. Contrast-enabled axe scans passed on Home and Platform in both locales and the synthetic member Portal. Automated checks do not establish 200% browser zoom or screen-reader acceptance.

Continue to test real states, not only populated screenshots: catalog no matches, Brand Kit new/configured/error, editor output failure, worksheet retention, Hub role/module/MFA gating, and Portal membership/permission states. Reuse existing domain suites for unchanged behavior. Wide data tables may scroll within a named region; the page should not depend on horizontal scrolling.
