# Viewport Lab — Muse & operator guide

Operator device frame for same-origin responsive QA. **Not** a steward Comms catalog tool. **Not** a replacement for Playwright CI viewports.

Live: `https://unionops.org/viewport-lab/`  
Local: `http://localhost:3000/viewport-lab/`  
Linked from `/build`. Locale-prefixed URLs (`/en/viewport-lab/`, `/fr/viewport-lab/`) permanently redirect here.

Shares **QA Labs** navigation with [Load Test Lab](LOAD_TEST_LAB.md).

## What it is / is not

| Is | Is not |
|----|--------|
| Same-origin iframe with its own CSS viewport | DevTools device mode substitute when CDP works |
| Preserves in-frame navigation when resizing | Able to frame Officer Hub or Local Portal |
| Versioned `window.__unionopsViewportLab` API | In the Create/Utilities catalog or sitemap |
| Complements Muse / restricted VMs | The CI viewport matrix (`page.setViewportSize`) |
| Auto overflow badge after navigate/resize | An in-app recipe runner (JSON recipes are docs only) |
| Full axe-core suite workbench (tags, impacts, incomplete) | A WCAG/AODA conformance certificate |

Hub and Portal stay `X-Frame-Options: DENY` by design. Test those in a normal browser or Playwright (`e2e/helpers/axe.ts`). Lab axe scans do **not** prove conformance — they are an automated subset of checks.

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

- **Mobile / Tablet / Desktop** — product presets 375 / 768 / 1280; set size only; do **not** reload the iframe `src`
- **Audit 390 / Audit 1366** — explicit Muse audit widths (`data-viewport-audit`); not aliases of Mobile/Desktop
- **Custom width/height + Apply size** — same resize-without-reload rule (`data-testid="viewport-apply-size"`)
- **Flip orientation** — swaps width and height
- **EN / FR** — rewrites the locale segment of the current path
- **Path + Go** — intentional navigation (reloads frame content); recent paths offer datalist history (session)
- **Compare** — second pane; Pane B has its own preset chips
- **Check overflow** — horizontal overflow px inside Pane A (also auto-runs after navigate/resize)
- **Overflow badge** — dedicated readout (`data-testid="viewport-overflow-badge"`)
- **Run axe** — axe-core on Pane A; dedicated **Axe** toolbar row with suite / impact / incomplete / color-contrast; results panel supports Show filter, Clear, Copy JSON / Download JSON; changing suite/path/viewport marks the report stale until you re-run
- **Scale-to-fit** — when the device is larger than the lab window, the chrome scales down; the iframe’s *logical* size stays `w×h` so media queries stay honest

### Axe suite presets

| Suite (UI) | axe `runOnly` tags |
|------------|--------------------|
| WCAG 2.2 AA (default) | `wcag2a`, `wcag2aa`, `wcag21a`, `wcag21aa`, `wcag22aa` |
| WCAG 2.1 AA | `wcag2a`, `wcag2aa`, `wcag21a`, `wcag21aa` |
| WCAG 2.0 AA | `wcag2a`, `wcag2aa` |
| Best practice | `best-practice` |
| Experimental | `experimental` |
| All enabled rules | omit `runOnly` (axe default; excludes experimental/deprecated unless tagged in elsewhere) |

Impact filter defaults to **All** (minor through critical). Choose **Serious+critical** to match the older lab / Playwright smoke gate. **include incomplete** is on by default — incomplete means needs review, not an automatic fail. **color-contrast** stays opt-in (default off), matching CI public smoke.

Playwright CI continues to use serious/critical + contrast-off via `e2e/helpers/axe.ts`. Expanding the lab does not tighten those gates.

## Agent / Muse prompting

Copy-paste rules for vision or script agents:

1. Start on `/viewport-lab/` or a bootstrapped query URL — do not open the site root first.
2. Vision agents: click `data-viewport-preset="mobile|tablet|desktop"` or `data-viewport-audit="audit-390|audit-1366"`. Prefer buttons over spinbuttons when possible.
3. Script agents: use `window.__unionopsViewportLab` via page `evaluate` (aliases `window.setViewport` / `window.setViewportPreset` also exist). Vision-only agents that cannot run JS should use the buttons + Path/Go — the API is not a separate set of DOM controls.
4. After each resize, interact **inside the iframe** only. Do not reload the lab page. Overflow auto-updates; still call `checkOverflow()` before declaring a pass if your harness ignores the badge.
5. Never navigate the lab to `/app`, `/portal`, `/api`, or `/viewport-lab` itself.
6. Recipe JSON under [`viewport-lab-recipes/`](viewport-lab-recipes/) is documentation — there is **no in-app recipe executor**.

### Muse-side limits (not lab bugs)

These slowed the 2026-09-28 Learn audit; they belong to the automation host, not UnionOps:

- **Document-boundary / batched actions** — combining Apply size with later Path+Go in one automation array can stop after resize. Split resize and navigate into separate turns, or use `evaluate` for `setViewport` + `navigateFrame` in one script.
- **`ref_scope` churn** — accessibility scopes from a prior look observation often go stale. Re-snapshot before clicking.
- **Large batched attribute reads** — batches of ~16 may fail mid-dispatch; prefer batches of ≤10 or the lab JS API.

### Ready-made Muse prompts

**Mobile overflow walk of Create catalog**

> Open `/viewport-lab/?w=375&h=812&path=/en/create/&locale=en`. Click Mobile if needed. Inside the iframe, scroll the Create catalog. Read the Overflow badge (`data-testid="viewport-overflow-badge"`) or call `window.__unionopsViewportLab.checkOverflow()` and report `horizontalPx`. Repeat at Tablet (768) and Desktop (1280) without reloading the lab.

**Audit widths 390 then 1366 on Learn**

> Open `/viewport-lab/?path=/en/learn/&w=390&h=844`. Click Audit 390 if needed. Confirm the Overflow badge. Click Audit 1366. Confirm overflow again without reloading the lab page.

**Flyer Maker at 375 then 768 without losing editor state**

> Open `/viewport-lab/?path=/en/create/flyer-maker/&w=375&h=812`. Type a short headline in the Flyer Maker form inside the iframe. Switch to Tablet via the preset button (do not change the path). Confirm the headline text is still present, then read the Overflow badge.

**EN then FR home at tablet width**

> Open `/viewport-lab/?w=768&h=1024&path=/en/&locale=en`. Screenshot the iframe. Click FR. Confirm the path locale is `/fr/` and the home content is French. Read the Overflow badge.

**Desktop vs mobile Brand Kit pair**

> Open `/viewport-lab/?path=/en/create/brand-kit/&w=1280&h=800`. Enable Compare. Set Pane B to mobile. Screenshot both panes. Call `checkOverflow()` on Pane A via the API (overflow is Pane A only).

**Axe WCAG 2.2 AA full suite on Learn**

> Open `/viewport-lab/?path=/en/learn/&w=1280&h=800`. Confirm Suite is WCAG 2.2 AA, Impact is All, and include incomplete is checked. Click Run axe. Report violation and incomplete counts from the results panel (`data-testid="viewport-lab-axe-results"`), then Copy JSON if you need the full report. Do not treat incomplete as automatic failures. Hub and Portal cannot be framed here — use Playwright for those.

**Axe serious/critical only (legacy gate)**

> Open `/viewport-lab/?path=/en/learn/&w=1280&h=800`. Set Impact to Serious+critical. Click Run axe. Report any serious/critical findings in the results panel.

## API cheat sheet

```js
const lab = window.__unionopsViewportLab;
lab.version;              // 1
lab.capabilities;         // … axe, axe-suite, compare
lab.setViewport(375, 812);
lab.setViewportPreset("mobile");
lab.getViewport();        // { width, height, preset }
lab.navigateFrame("/en/create/");
lab.flipOrientation();
lab.setLocale("fr");
lab.getFramePath();
lab.checkOverflow();      // { horizontalPx } | { error }
await lab.runAxe({
  suite: "wcag22aa",
  impact: "all",
  includeIncomplete: true,
  colorContrast: false,
});
// → { ok, findings, violations, incomplete, suite, impact, axeVersion, … }
lab.setCompareMode(true);
lab.setViewportPane("b", 375, 812);
```

## Limits

- Hub / Portal cannot be framed (security). Use Playwright axe helpers for authenticated surfaces.
- Overflow and axe measure **Pane A** only.
- Canvas/export raster text is not visible to axe.
- Prefer Playwright `setViewportSize` in CI; use this lab when DevTools emulation is blocked (e.g. Muse VMs).

## Recipes

Machine-readable extras: [`viewport-lab-recipes/`](viewport-lab-recipes/). Documentation contract only — not executed by the lab UI.
