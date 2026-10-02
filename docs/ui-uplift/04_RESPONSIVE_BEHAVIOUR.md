# Responsive behavior and review

Status: rendered review completed for the first uplift checkpoint; manual 200% zoom and assistive-technology review remain open. Home stacks the two-zone hero, wraps CTAs, offers a three-choice communications preview and responsive outcome list, then shows real learning and steward-work examples in open, ruled sections. The worksheet preview uses localized prompts/options and wraps them without case data. At 320×812 in French, the primary CTA is visible above the fold; Home has no horizontal overflow. Desktop global-nav links stay on one row from 1280px. The mobile global menu and authenticated Hub tool menu have distinct visible labels. E2E checks cover the catalog width matrix at 320, 375, 768, 1280 and 1536px (English), dedicated French routes, 320px Home reflow, keyboard focus containment/Escape, and axe checks. Color-contrast-enabled axe scans also passed on Home EN/FR, Platform EN/FR and synthetic member Portal. These checks do not establish 200% zoom or screen-reader acceptance. Initial observations are recorded in [implementation status](05_IMPLEMENTATION_STATUS.md).

| Surface | Phone | Tablet | Desktop |
|---|---|---|---|
| Home | Clear premise and action, readable product example, concise outcome choices | Intentional split where content fits; avoid crowded side-by-side miniatures | Balanced message/product hero; narrative rhythm, not a repeated card grid |
| Catalogs | Search first, wrapping filters and clear active-state removal | Denser results without truncated French labels | Efficient scanning within the shared wide frame |
| Brand Kit | Identity controls and useful preview with clear save status | Preserve grouping and action proximity | Editor/preview workspace, not a narrow setup form |
| Builders | Existing Edit/Preview behavior; all output actions reachable | Controls and preview based on actual room | Working split with readable fields and stable capture geometry |
| Worksheet | Prompts and result in meaningful reading order | Group related inputs without forced canvas | Use available space without making prose unbounded |
| Hub/Portal | Scope, current work and allowed actions stay visible | Keep comparisons and relationships | Quiet, information-dense operations; no marketing hero |

The completion-audit regression now tests Home and Platform in **both locales** at 320, 375, 768, 1280 and 1536px, plus doubled text at 320px. All four surface/locale cases pass. Text-resize failures drove explicit long-word wrapping and flexible preview labels/choices; the French first-screen CTA check also passes. This supersedes the earlier partial Home/Platform matrix, while the older catalog matrix remains English-only at 375–1536px.

Review widths near 375, 768, 1280 and 1536 pixels, plus 320-pixel reflow. Test English and French expansion, keyboard focus, enlarged text/zoom, reduced motion and contrast preferences. Wide data tables may scroll within a named region; the page should not depend on horizontal scrolling.

Check real states, not only populated screenshots: catalog no matches, Brand Kit new/configured, editor output failure, worksheet retention, Hub role/module/MFA gating, and Portal member visibility. Reuse existing behavior suites and add targeted coverage only for changed behavior. Automated accessibility checks do not replace keyboard or human comprehension review.
