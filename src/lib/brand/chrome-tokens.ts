/**
 * Site chrome colours derived from Brand Kit.
 * Canvas / export keep raw primary+accent; `--opseu-blue` / `--opseu-dark`
 * must stay readable for nav, buttons, and headings on white UI.
 */

import { BRAND_COLORS } from "@/lib/constants/brand";
import {
  contrastRatio,
  hexToRgb,
  meetsWcagAA,
} from "@/lib/utils/contrast";

const PAPER = BRAND_COLORS.white;
const FALLBACK_DARK = BRAND_COLORS.black;

export type BrandChromeTokens = {
  /** Interactive fill (buttons, rings) — may be darkened so white label AA passes */
  interactive: string;
  /** Heading / emphasis text on white UI */
  heading: string;
};

function darkenHex(hex: string, factor: number): string {
  const rgb = hexToRgb(hex);
  if (!rgb) return hex;
  const f = Math.min(1, Math.max(0, factor));
  const r = Math.max(0, Math.round(rgb.r * f));
  const g = Math.max(0, Math.round(rgb.g * f));
  const b = Math.max(0, Math.round(rgb.b * f));
  return `#${[r, g, b].map((v) => v.toString(16).padStart(2, "0")).join("")}`.toUpperCase();
}

/** Darken until white text meets WCAG AA on the fill (button / selected chrome). */
export function ensureWhiteLabelFill(primary: string): string {
  let current = primary.trim().toUpperCase();
  if (!/^#[0-9A-F]{6}$/.test(current)) return BRAND_COLORS.primary;
  for (let i = 0; i < 14; i++) {
    if (meetsWcagAA(PAPER, current)) return current;
    current = darkenHex(current, 0.88);
  }
  return current;
}

/**
 * Colour for `text-opseu-dark` on white pages.
 * Prefer Brand Kit accent when it is a real dark (OPSEU `#002868`);
 * never use a light gold/yellow as heading ink.
 */
export function ensureHeadingOnPaper(
  accent: string,
  primary: string,
): string {
  const acc = accent.trim().toUpperCase();
  if (/^#[0-9A-F]{6}$/.test(acc) && meetsWcagAA(acc, PAPER)) {
    return acc;
  }
  const fromPrimary = ensureWhiteLabelFill(primary);
  // Heading ink is the fill used as text — need dark-on-paper, not white-on-fill
  let candidate = darkenHex(fromPrimary, 0.55);
  for (let i = 0; i < 10; i++) {
    if (meetsWcagAA(candidate, PAPER)) return candidate;
    candidate = darkenHex(candidate, 0.85);
  }
  return FALLBACK_DARK;
}

export function resolveBrandChromeTokens(
  primaryColor: string,
  accentColor: string,
): BrandChromeTokens {
  const primary = primaryColor.trim().toUpperCase();
  const accent = accentColor.trim().toUpperCase();
  const safePrimary = /^#[0-9A-F]{6}$/.test(primary)
    ? primary
    : BRAND_COLORS.primary;
  const safeAccent = /^#[0-9A-F]{6}$/.test(accent)
    ? accent
    : BRAND_COLORS.accent;

  return {
    interactive: ensureWhiteLabelFill(safePrimary),
    heading: ensureHeadingOnPaper(safeAccent, safePrimary),
  };
}

/**
 * Inline FOUC script fragment — keep behaviour aligned with
 * `resolveBrandChromeTokens` (parity test in chrome-tokens.test.ts).
 */
export const BRAND_CHROME_RUNTIME_JS = `
function uoHexOk(v){return typeof v==="string"&&/^#[0-9A-Fa-f]{6}$/.test(v.trim());}
function uoRgb(hex){hex=hex.replace("#","");return{r:parseInt(hex.slice(0,2),16),g:parseInt(hex.slice(2,4),16),b:parseInt(hex.slice(4,6),16)};}
function uoLum(c){var s=c/255;return s<=0.03928?s/12.92:Math.pow((s+0.055)/1.055,2.4);}
function uoRatio(a,b){var A=uoRgb(a),B=uoRgb(b);var L1=0.2126*uoLum(A.r)+0.7152*uoLum(A.g)+0.0722*uoLum(A.b);var L2=0.2126*uoLum(B.r)+0.7152*uoLum(B.g)+0.0722*uoLum(B.b);var hi=Math.max(L1,L2),lo=Math.min(L1,L2);return(hi+0.05)/(lo+0.05);}
function uoAA(fg,bg){return uoRatio(fg,bg)>=4.5;}
function uoDarken(hex,f){var c=uoRgb(hex);function ch(n){return Math.max(0,Math.round(n*f)).toString(16).padStart(2,"0");}return("#"+ch(c.r)+ch(c.g)+ch(c.b)).toUpperCase();}
function uoWhiteFill(primary){var c=primary.toUpperCase();for(var i=0;i<14;i++){if(uoAA("#FFFFFF",c))return c;c=uoDarken(c,0.88);}return c;}
function uoHeading(accent,primary){var a=accent.toUpperCase();if(uoAA(a,"#FFFFFF"))return a;var fill=uoWhiteFill(primary);var c=uoDarken(fill,0.55);for(var i=0;i<10;i++){if(uoAA(c,"#FFFFFF"))return c;c=uoDarken(c,0.85);}return "#1A1A1A";}
function uoChrome(primary,accent){return{interactive:uoWhiteFill(primary),heading:uoHeading(accent,primary)};}
`;

/** Whether white ink meets large-text AA (≥3:1) — used by canvas ink preference. */
export function whiteInkMeetsLargeText(background: string): boolean {
  const ratio = contrastRatio(PAPER, background);
  return ratio !== null && ratio >= 3;
}
