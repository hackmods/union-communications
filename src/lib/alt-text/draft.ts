/**
 * Native alt-text field maxima (not caption / post-body limits).
 * Checked 2026-08-18:
 * - Instagram Graph API `alt_text`: 1000
 * - Facebook: no published hard cap; composer may warn near 100 (ignorable). 1000 is a practical ceiling.
 * - X API alt_text: maxLength 1000
 * - LinkedIn composer: 1000 (Accessible Social, 2026-04-29). Images API allows 4086 and recommends under 120.
 *   Do not use 3000 — that is LinkedIn's post body, not alt text.
 */
export const PLATFORM_ALT_LIMITS = {
  instagram: 1000,
  facebook: 1000,
  x: 1000,
  linkedin: 1000,
} as const;

export type PlatformId = keyof typeof PLATFORM_ALT_LIMITS;

export const PLATFORM_IDS = Object.keys(
  PLATFORM_ALT_LIMITS,
) as PlatformId[];

export type GraphicStarterId =
  | "meetingNotice"
  | "picketRally"
  | "quoteCard"
  | "memberSpotlight"
  | "textHeavyGraphic";

export const GRAPHIC_STARTER_IDS: GraphicStarterId[] = [
  "meetingNotice",
  "picketRally",
  "quoteCard",
  "memberSpotlight",
  "textHeavyGraphic",
];

export type AltTextIssueId =
  | "empty"
  | "startsWithImageOf"
  | "tooShort"
  | "sameAsCaption"
  | "placeholderLeft";

const IMAGE_OF_RE =
  /^(image|photo|picture|graphic)\s+of\b|^(image|photo|photoographie|graphique)\s+d[e']\b/i;
const PLACEHOLDER_RE =
  /\[image description:|describe the visual content here|\[your caption here\]/i;

/** Count characters the way platform fields typically do (UTF-16 length). */
export function countAltChars(text: string): number {
  return text.length;
}

export function exceedsLimit(text: string, limit: number): boolean {
  return countAltChars(text) > limit;
}

export function strictestPlatformLimit(): number {
  return Math.min(...Object.values(PLATFORM_ALT_LIMITS));
}

/**
 * Lightweight draft checks - education aids, not WCAG validators.
 * Callers map issue ids to translated strings.
 */
export function analyzeAltText(
  alt: string,
  options?: { caption?: string },
): { issues: AltTextIssueId[]; ok: boolean } {
  const trimmed = alt.trim();
  const issues: AltTextIssueId[] = [];

  if (!trimmed) {
    issues.push("empty");
    return { issues, ok: false };
  }

  if (IMAGE_OF_RE.test(trimmed)) {
    issues.push("startsWithImageOf");
  }

  if (trimmed.length < 20) {
    issues.push("tooShort");
  }

  if (PLACEHOLDER_RE.test(trimmed)) {
    issues.push("placeholderLeft");
  }

  const caption = options?.caption?.trim();
  if (caption && trimmed.toLowerCase() === caption.toLowerCase()) {
    issues.push("sameAsCaption");
  }

  return { issues, ok: issues.length === 0 };
}
