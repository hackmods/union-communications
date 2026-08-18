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

/** Reading faces for body copy — condensed/display webfonts ship no regular weight. */
export const CANVAS_BODY_FONT_ORDER: readonly CanvasFontId[] = [
  "sourceSans",
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

/** Body picker list, keeping a saved condensed/display id visible if already chosen. */
export function canvasBodyFontChoices(current: CanvasFontId): CanvasFontId[] {
  if ((CANVAS_BODY_FONT_ORDER as readonly string[]).includes(current)) {
    return [...CANVAS_BODY_FONT_ORDER];
  }
  return [current, ...CANVAS_BODY_FONT_ORDER];
}

/**
 * Regular (400) is missing from Montserrat / Oswald / Barlow files.
 * Using 400 would faux-thin those faces into unreadable body copy.
 */
export function canvasBodyFontWeight(id: CanvasFontId): number {
  const role = CANVAS_FONT_META[id].role;
  if (role === "condensed" || role === "display") return 600;
  return 400;
}

/** Condensed/display glyphs read smaller at the same px — bump optical size. */
export function canvasBodySizeFactor(id: CanvasFontId): number {
  const role = CANVAS_FONT_META[id].role;
  if (role === "condensed") return 1.22;
  if (role === "display") return 1.12;
  return 1;
}

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

/** Real family name for static CSS / Office (not `var(--font-*)`). */
const CSS_FAMILY_NAME: Record<
  Exclude<CanvasFontId, "systemSans" | "systemSerif">,
  string
> = {
  montserrat: "Montserrat",
  sourceSans: "Source Sans 3",
  barlowCondensed: "Barlow Condensed",
  oswald: "Oswald",
  sourceSerif: "Source Serif 4",
  robotoSlab: "Roboto Slab",
};

const FONT_PUBLIC_DIR: Record<
  Exclude<CanvasFontId, "systemSans" | "systemSerif">,
  string
> = {
  montserrat: "montserrat",
  sourceSans: "source-sans-3",
  barlowCondensed: "barlow-condensed",
  oswald: "oswald",
  sourceSerif: "source-serif-4",
  robotoSlab: "roboto-slab",
};

/** Subset weights for Website ZIP (headline = bold display; body = reading). */
const ZIP_WEIGHTS: Record<
  Exclude<CanvasFontId, "systemSans" | "systemSerif">,
  { headline: number[]; body: number[] }
> = {
  montserrat: { headline: [700, 800], body: [700] },
  sourceSans: { headline: [700], body: [400, 600, 700] },
  barlowCondensed: { headline: [700, 800], body: [600, 700] },
  oswald: { headline: [600, 700], body: [600, 700] },
  sourceSerif: { headline: [700], body: [400, 600, 700] },
  robotoSlab: { headline: [700], body: [400, 700] },
};

export type CanvasFontZipFile = {
  /** Path under `public/fonts/` (e.g. `montserrat/latin-700-normal.woff2`). */
  relativePath: string;
  /** Filename only, for ZIP `assets/fonts/`. */
  fileName: string;
  family: string;
  weight: number;
};

/**
 * CSS `font-family` stack using the real face name (Website ZIP / preview).
 * App canvases keep using `canvasFontFamily` (CSS variables).
 */
export function canvasFontCssFamily(id: CanvasFontId): string {
  if (id === "systemSans" || id === "systemSerif") {
    return SYSTEM_FAMILY[id];
  }
  const generic =
    CANVAS_FONT_META[id].role === "serif" || CANVAS_FONT_META[id].role === "slab"
      ? "serif"
      : "sans-serif";
  return `"${CSS_FAMILY_NAME[id]}", ${generic}`;
}

/**
 * Office `font` / `fontFace` string. Name-only — files are not embedded in DOCX/PPTX.
 * System residual maps to widely installed Arial / Georgia.
 */
export function canvasFontOfficeName(id: CanvasFontId): string {
  if (id === "systemSans") return "Arial";
  if (id === "systemSerif") return "Georgia";
  return CSS_FAMILY_NAME[id];
}

function zipFilesForRole(
  id: Exclude<CanvasFontId, "systemSans" | "systemSerif">,
  role: "headline" | "body",
): CanvasFontZipFile[] {
  const dir = FONT_PUBLIC_DIR[id];
  const family = CSS_FAMILY_NAME[id];
  return ZIP_WEIGHTS[id][role].map((weight) => {
    const fileName = `latin-${weight}-normal.woff2`;
    return {
      relativePath: `${dir}/${fileName}`,
      fileName: `${dir}-${fileName}`,
      family,
      weight,
    };
  });
}

/** Deduped woff2 subset for Website ZIP given Brand Kit headline + body ids. */
export function collectWebsiteZipFontFiles(
  headlineId: CanvasFontId,
  bodyId: CanvasFontId,
): CanvasFontZipFile[] {
  const byPath = new Map<string, CanvasFontZipFile>();
  if (!CANVAS_FONT_META[headlineId].isSystem) {
    for (const f of zipFilesForRole(
      headlineId as Exclude<CanvasFontId, "systemSans" | "systemSerif">,
      "headline",
    )) {
      byPath.set(f.relativePath, f);
    }
  }
  if (!CANVAS_FONT_META[bodyId].isSystem) {
    for (const f of zipFilesForRole(
      bodyId as Exclude<CanvasFontId, "systemSans" | "systemSerif">,
      "body",
    )) {
      byPath.set(f.relativePath, f);
    }
  }
  return [...byPath.values()];
}

/** `@font-face` rules; `urlBase` is e.g. `../assets/fonts` (ZIP) or `/fonts` (preview). */
export function buildWebsiteFontFaceCss(
  files: CanvasFontZipFile[],
  urlBase: string,
  /** When true, URLs use flat `urlBase/fileName`; else `urlBase/relativePath`. */
  flatFileNames = false,
): string {
  if (files.length === 0) return "";
  const base = urlBase.replace(/\/$/, "");
  return files
    .map((f) => {
      const src = flatFileNames
        ? `${base}/${f.fileName}`
        : `${base}/${f.relativePath}`;
      return `@font-face {
  font-family: "${f.family}";
  font-style: normal;
  font-weight: ${f.weight};
  font-display: swap;
  src: url("${src}") format("woff2");
}`;
    })
    .join("\n\n");
}

/** Short OFL notice dropped into Website ZIP `assets/fonts/NOTICE.txt`. */
export const WEBSITE_FONT_NOTICE = `Canvas brand fonts (SIL Open Font License 1.1).
Bundled Latin subset woff2 files for offline Website ZIP fidelity.
See https://scripts.sil.org/OFL — do not sell the fonts alone.
`;

/** Load a `public/fonts/` file (Node fs in tests; browser fetch in the app). */
export async function loadCanvasFontBytes(
  relativePath: string,
): Promise<Uint8Array> {
  // Prefer filesystem when available (Vitest/jsdom still defines `window` + `fetch`).
  if (typeof process !== "undefined" && process.versions?.node) {
    const { readFile } = await import("node:fs/promises");
    const { join } = await import("node:path");
    return new Uint8Array(
      await readFile(join(process.cwd(), "public", "fonts", relativePath)),
    );
  }
  const res = await fetch(`/fonts/${relativePath}`);
  if (!res.ok) throw new Error(`Font not found: /fonts/${relativePath}`);
  return new Uint8Array(await res.arrayBuffer());
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
