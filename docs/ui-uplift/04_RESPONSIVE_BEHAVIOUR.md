# Responsive behavior and review

Status: source composition is in place, rendered acceptance pending. Home stacks the two-zone hero, wraps CTAs, offers a three-choice communications preview and responsive outcome list, then shows a real localized learning-module example in one column on phones and a split section at `lg`. The smoke spec now encodes no-overflow checks at 320, 375, 768, 1280 and 1536px in both locales, with axe at 320px; it has not run. The longer French hero still needs phone and 200% zoom review. Initial observations are recorded in [implementation status](05_IMPLEMENTATION_STATUS.md); viewport and accessibility acceptance remains pending.

| Surface | Phone | Tablet | Desktop |
|---|---|---|---|
| Home | Clear premise and action, readable product example, concise outcome choices | Intentional split where content fits; avoid crowded side-by-side miniatures | Balanced message/product hero; narrative rhythm, not a repeated card grid |
| Catalogs | Search first, wrapping filters and clear active-state removal | Denser results without truncated French labels | Efficient scanning within the shared wide frame |
| Brand Kit | Identity controls and useful preview with clear save status | Preserve grouping and action proximity | Editor/preview workspace, not a narrow setup form |
| Builders | Existing Edit/Preview behavior; all output actions reachable | Controls and preview based on actual room | Working split with readable fields and stable capture geometry |
| Worksheet | Prompts and result in meaningful reading order | Group related inputs without forced canvas | Use available space without making prose unbounded |
| Hub/Portal | Scope, current work and allowed actions stay visible | Keep comparisons and relationships | Quiet, information-dense operations; no marketing hero |

Review widths near 375, 768, 1280 and 1536 pixels, plus 320-pixel reflow. Test English and French expansion, keyboard focus, enlarged text/zoom, reduced motion and contrast preferences. Wide data tables may scroll within a named region; the page should not depend on horizontal scrolling.

Check real states, not only populated screenshots: catalog no matches, Brand Kit new/configured, editor output failure, worksheet retention, Hub role/module/MFA gating, and Portal member visibility. Reuse existing behavior suites and add targeted coverage only for changed behavior. Automated accessibility checks do not replace keyboard or human comprehension review.
