/**
 * Curated canvas typeface catalog for Brand Kit + Flyer (ADR-014).
 * Self-hosted OFL faces via CSS variables from `src/app/canvas-fonts.ts`;
 * system residual stacks need no webfont files.
 */

export type CanvasFontId =
  | "montserrat"
  | "sourceSans"
  | "barlowCondensed"
  | "oswald"
  | "sourceSerif"
  | "robotoSlab"
  | "systemSans"
  | "systemSerif";

/** Flyer picker: inherit Brand Kit headline, or a concrete catalog id. */
export type FlyerFontChoice = "inherit" | CanvasFontId;

export const CANVAS_FONT_ORDER: readonly CanvasFontId[] = [
  "montserrat",
  "sourceSans",
  "barlowCondensed",
  "oswald",
  "sourceSerif",
  "robotoSlab",
  "systemSans",
  "systemSerif",
] as const;

export const DEFAULT_HEADLINE_FONT: CanvasFontId = "montserrat";
export const DEFAULT_BODY_FONT: CanvasFontId = "sourceSans";
export const DEFAULT_FLYER_FONT: FlyerFontChoice = "inherit";

/** CSS variable names registered by `next/font/local` in `src/app/canvas-fonts.ts`. */
const WEBFONT_FAMILY: Record<
  Exclude<CanvasFontId, "systemSans" | "systemSerif">,
  string
> = {
  montserrat: "var(--font-montserrat), sans-serif",
  sourceSans: "var(--font-source-sans), sans-serif",
  barlowCondensed: "var(--font-barlow-condensed), sans-serif",
  oswald: "var(--font-oswald), sans-serif",
  sourceSerif: "var(--font-source-serif), serif",
  robotoSlab: "var(--font-roboto-slab), serif",
};

const SYSTEM_FAMILY: Record<"systemSans" | "systemSerif", string> = {
  systemSans:
    'system-ui, -apple-system, "Segoe UI", Arial, sans-serif',
  systemSerif: 'Georgia, "Times New Roman", Times, serif',
};

export const CANVAS_FONT_META: Record<
  CanvasFontId,
  { isSystem: boolean; role: "display" | "body" | "condensed" | "serif" | "slab" }
> = {
  montserrat: { isSystem: false, role: "display" },
  sourceSans: { isSystem: false, role: "body" },
  barlowCondensed: { isSystem: false, role: "condensed" },
  oswald: { isSystem: false, role: "display" },
  sourceSerif: { isSystem: false, role: "serif" },
  robotoSlab: { isSystem: false, role: "slab" },
  systemSans: { isSystem: true, role: "body" },
  systemSerif: { isSystem: true, role: "serif" },
};

/** Legacy Flyer Maker stack ids → new catalog (or inherit Brand Kit). */
const LEGACY_FLYER_FONT_MAP: Record<string, FlyerFontChoice> = {
  impact: "oswald",
  condensed: "barlowCondensed",
  clean: "inherit",
  slab: "robotoSlab",
  serif: "sourceSerif",
};

export function isCanvasFontId(value: unknown): value is CanvasFontId {
  return (
    value === "montserrat" ||
    value === "sourceSans" ||
    value === "barlowCondensed" ||
    value === "oswald" ||
    value === "sourceSerif" ||
    value === "robotoSlab" ||
    value === "systemSans" ||
    value === "systemSerif"
  );
}

export function isFlyerFontChoice(value: unknown): value is FlyerFontChoice {
  return value === "inherit" || isCanvasFontId(value);
}

/** Migrate persisted Flyer / Brand Kit font ids (including retired Flyer stacks). */
export function migrateCanvasFontId(value: unknown): CanvasFontId | undefined {
  if (isCanvasFontId(value)) return value;
  if (typeof value !== "string") return undefined;
  const mapped = LEGACY_FLYER_FONT_MAP[value];
  if (mapped && mapped !== "inherit") return mapped;
  return undefined;
}

export function migrateFlyerFontChoice(value: unknown): FlyerFontChoice {
  if (isFlyerFontChoice(value)) return value;
  if (typeof value === "string" && value in LEGACY_FLYER_FONT_MAP) {
    return LEGACY_FLYER_FONT_MAP[value]!;
  }
  return DEFAULT_FLYER_FONT;
}

export function canvasFontFamily(id: CanvasFontId): string {
  if (id === "systemSans" || id === "systemSerif") {
    return SYSTEM_FAMILY[id];
  }
  return WEBFONT_FAMILY[id];
}

/**
 * Resolve Flyer capture-root family: inherit Brand Kit headline, else catalog id.
 */
export function resolveFlyerFontFamily(
  choice: FlyerFontChoice,
  brandHeadlineFamily: string,
): string {
  if (choice === "inherit") return brandHeadlineFamily;
  return canvasFontFamily(choice);
}

/** @deprecated Use CanvasFontId / migrateFlyerFontChoice */
export type FlyerFontStackId = FlyerFontChoice;

/** @deprecated Use canvasFontFamily / resolveFlyerFontFamily */
export function flyerFontFamily(id: FlyerFontChoice): string {
  if (id === "inherit") return canvasFontFamily(DEFAULT_HEADLINE_FONT);
  return canvasFontFamily(id);
}

/** @deprecated */
export const FLYER_FONT_ORDER: readonly FlyerFontChoice[] = [
  "inherit",
  ...CANVAS_FONT_ORDER,
] as const;

/** @deprecated */
export function isFlyerFontStackId(value: unknown): value is FlyerFontChoice {
  return isFlyerFontChoice(value);
}
