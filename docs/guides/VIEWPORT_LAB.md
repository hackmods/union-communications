# Viewport Lab — Muse & operator guide

Operator device frame for same-origin responsive QA. **Not** a steward Comms catalog tool. **Not** a replacement for Playwright CI viewports.

Live: `https://unionops.org/viewport-lab/`  
Local: `http://localhost:3000/viewport-lab/`  
Linked from `/build`. Locale-prefixed URLs (`/en/viewport-lab/`, `/fr/viewport-lab/`) permanently redirect here.

## What it is / is not

| Is | Is not |
|----|--------|
| Same-origin iframe with its own CSS viewport | DevTools device mode substitute when CDP works |
| Preserves in-frame navigation when resizing | Able to frame Officer Hub or Local Portal |
| Versioned `window.__unionopsViewportLab` API | In the Create/Utilities catalog or sitemap |
| Complements Muse / restricted VMs | The CI viewport matrix (`page.setViewportSize`) |

Hub and Portal stay `X-Frame-Options: DENY` by design. Test those in a normal browser or Playwright.

## Open it

Bootstrap query (all optional):

```
/viewport-lab/?w=375&h=812&path=/en/create/flyer-maker/&locale=en
```

| Param | Meaning |
|-------|---------|
| `w` / `h` | Logical iframe CSS size (200–4000) |
| `path` | Same-origin public path only |
| `locale` | `en` or `fr` (rewrites locale prefix on path) |
| `compare` | `1` enables side-by-side panes |

## Human controls

- **Mobile / Tablet / Desktop** — set size only; do **not** reload the iframe `src`
- **Custom width/height + Apply size** — same rule
- **Flip orientation** — swaps width and height
- **EN / FR** — rewrites the locale segment of the current path
- **Path + Go** — intentional navigation (reloads frame content)
- **Compare** — second pane; Pane B has its own preset chips
- **Check overflow** — horizontal overflow px inside the frame
- **Run axe** — serious/critical findings from the framed document; optional color-contrast checkbox
- **Scale-to-fit** — when the device is larger than the lab window, the chrome scales down; the iframe’s *logical* size stays `w×h` so media queries stay honest

## Agent / Muse prompting

Copy-paste rules for vision or script agents:

1. Start on `/viewport-lab/` or a bootstrapped query URL — do not open the site root first.
2. Vision agents: click buttons with `data-viewport-preset="mobile|tablet|desktop"`.
3. Script agents: use `window.__unionopsViewportLab` (aliases `window.setViewport` / `window.setViewportPreset` also exist).
4. After each resize, interact **inside the iframe** only. Do not reload the lab page.
5. Before declaring a viewport pass, call `checkOverflow()` (and optionally `runAxe()`).
6. Never navigate the lab to `/app`, `/portal`, `/api`, or `/viewport-lab` itself.

### Ready-made Muse prompts

**Mobile overflow walk of Create catalog**

> Open `/viewport-lab/?w=375&h=812&path=/en/create/&locale=en`. Click Mobile if needed. Inside the iframe, scroll the Create catalog. Call `window.__unionopsViewportLab.checkOverflow()` and report `horizontalPx`. Repeat at Tablet (768) and Desktop (1280) without reloading the lab.

**Flyer Maker at 375 then 768 without losing editor state**

> Open `/viewport-lab/?path=/en/create/flyer-maker/&w=375&h=812`. Type a short headline in the Flyer Maker form inside the iframe. Switch to Tablet via the preset button (do not change the path). Confirm the headline text is still present, then call `checkOverflow()`.

**EN then FR home at tablet width**

> Open `/viewport-lab/?w=768&h=1024&path=/en/&locale=en`. Screenshot the iframe. Click FR. Confirm the path locale is `/fr/` and the home content is French. Call `checkOverflow()`.

**Desktop vs mobile Brand Kit pair**

> Open `/viewport-lab/?path=/en/create/brand-kit/&w=1280&h=800`. Enable Compare. Set Pane B to mobile. Screenshot both panes. Call `checkOverflow()` on Pane A via the API.

**Axe on Learn shell**

> Open `/viewport-lab/?path=/en/learn/&w=1280&h=800`. Click Run axe. Report any serious/critical findings listed in the results panel (`data-testid="viewport-lab-axe-results"`).

## API cheat sheet

```js
const lab = window.__unionopsViewportLab;
lab.version;              // 1
lab.capabilities;         // viewport, preset, navigate, orientation, locale, overflow, axe, compare
lab.setViewport(375, 812);
lab.setViewportPreset("mobile");
lab.getViewport();        // { width, height, preset }
lab.navigateFrame("/en/create/");
lab.flipOrientation();
lab.setLocale("fr");
lab.getFramePath();
lab.checkOverflow();      // { horizontalPx } | { error }
await lab.runAxe({ colorContrast: false });
lab.setCompareMode(true);
lab.setViewportPane("b", 375, 812);
```

## Limits

- Hub / Portal cannot be framed (security).
- Canvas/export raster text is not visible to axe.
- Prefer Playwright `setViewportSize` in CI; use this lab when DevTools emulation is blocked (e.g. Muse VMs).

## Recipes

Machine-readable extras: [`viewport-lab-recipes/`](viewport-lab-recipes/).
