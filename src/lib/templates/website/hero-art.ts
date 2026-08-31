import type { WebsiteTemplateData } from "@/types/website-template";

/** Decorative pattern ids (plus colour-only). Upload, if present, wins. */
export const WEBSITE_HERO_ART_IDS = ["none", "arc", "mesh", "bloom"] as const;

export type WebsiteHeroArtId = (typeof WEBSITE_HERO_ART_IDS)[number];

export type WebsiteHeroSampleId = Exclude<WebsiteHeroArtId, "none">;

export type WebsiteHeroArtKind = "pattern" | "photo";

export type WebsiteHeroArtSample = {
  id: WebsiteHeroSampleId;
  /** File under `public/assets/website-heroes/`. Swap this to drop in a still. */
  fileName: string;
  /** Always `hero.svg` in the ZIP so locals can replace one file. */
  zipFileName: "hero.svg";
  publicPath: string;
};

export const DEFAULT_WEBSITE_HERO_ART_ID: WebsiteHeroSampleId = "mesh";

/** Legacy ids from retired presets — map on import so saved sites keep working. */
const LEGACY_HERO_ART_IDS: Record<string, WebsiteHeroArtId> = {
  bands: "arc",
  horizon: "bloom",
};

export const WEBSITE_HERO_ART_SAMPLES: readonly WebsiteHeroArtSample[] = [
  {
    id: "arc",
    fileName: "arc.svg",
    zipFileName: "hero.svg",
    publicPath: "/assets/website-heroes/arc.svg",
  },
  {
    id: "mesh",
    fileName: "mesh.svg",
    zipFileName: "hero.svg",
    publicPath: "/assets/website-heroes/mesh.svg",
  },
  {
    id: "bloom",
    fileName: "bloom.svg",
    zipFileName: "hero.svg",
    publicPath: "/assets/website-heroes/bloom.svg",
  },
];

const SAMPLE_BY_ID: Record<WebsiteHeroSampleId, WebsiteHeroArtSample> =
  Object.fromEntries(
    WEBSITE_HERO_ART_SAMPLES.map((sample) => [sample.id, sample]),
  ) as Record<WebsiteHeroSampleId, WebsiteHeroArtSample>;

export function coerceWebsiteHeroArtId(
  value: unknown,
): WebsiteHeroArtId | undefined {
  if (typeof value !== "string") return undefined;
  if (isWebsiteHeroArtId(value)) return value;
  const migrated = LEGACY_HERO_ART_IDS[value];
  return migrated && isWebsiteHeroArtId(migrated) ? migrated : undefined;
}

export function isWebsiteHeroArtId(value: unknown): value is WebsiteHeroArtId {
  return (
    typeof value === "string" &&
    (WEBSITE_HERO_ART_IDS as readonly string[]).includes(value)
  );
}

export function isWebsiteHeroSampleId(
  value: unknown,
): value is WebsiteHeroSampleId {
  return isWebsiteHeroArtId(value) && value !== "none";
}

export type ResolvedWebsiteHeroArt = {
  kind: WebsiteHeroArtKind;
  zipFileName: string;
  zipSrc: string;
  previewSrc: string;
  alt: string;
  catalogId?: WebsiteHeroSampleId;
};

function zipAssetSrc(fileName: string): string {
  return `./assets/${fileName}`;
}

/** Map a data-URL MIME to a safe ZIP filename (`hero.jpg` / `.png` / `.webp` / `.svg`). */
export function websiteHeroUploadFileName(dataUrl: string): string {
  const mime = /^data:([^;,]+)/i.exec(dataUrl)?.[1]?.toLowerCase() ?? "";
  if (mime.includes("svg")) return "hero.svg";
  if (mime.includes("png")) return "hero.png";
  if (mime.includes("webp")) return "hero.webp";
  return "hero.jpg";
}

export function websiteHeroDataUrlToBytes(dataUrl: string): Uint8Array | null {
  const match = /^data:([^;]+);base64,(.+)$/i.exec(dataUrl.trim());
  if (!match) return null;
  try {
    const bin = atob(match[2]!);
    const out = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
    return out;
  } catch {
    return null;
  }
}

/**
 * Upload wins over a catalog pattern. Missing / `none` / unknown ids stay colour-only.
 */
export function resolveWebsiteHeroArt(
  data: Pick<
    WebsiteTemplateData,
    "heroArtId" | "heroImagePreviewSrc" | "heroImageFileName" | "heroImageAlt"
  >,
): ResolvedWebsiteHeroArt | null {
  const uploadSrc = data.heroImagePreviewSrc?.trim() ?? "";
  if (uploadSrc) {
    const fileName =
      data.heroImageFileName?.trim() || websiteHeroUploadFileName(uploadSrc);
    return {
      kind: "photo",
      zipFileName: fileName,
      zipSrc: zipAssetSrc(fileName),
      previewSrc: uploadSrc,
      alt: data.heroImageAlt?.trim() ?? "",
    };
  }

  const id = coerceWebsiteHeroArtId(data.heroArtId);
  if (!isWebsiteHeroSampleId(id)) return null;
  const sample = SAMPLE_BY_ID[id];
  return {
    kind: "pattern",
    zipFileName: sample.zipFileName,
    zipSrc: zipAssetSrc(sample.zipFileName),
    previewSrc: sample.publicPath,
    alt: "",
    catalogId: id,
  };
}

/** Load a bundled pattern (Node fs in tests; browser fetch in the app). */
export async function loadWebsiteHeroArtBytes(
  id: WebsiteHeroSampleId,
): Promise<Uint8Array> {
  const sample = SAMPLE_BY_ID[id];
  if (typeof process !== "undefined" && process.versions?.node) {
    const { readFile } = await import("node:fs/promises");
    const { join } = await import("node:path");
    return new Uint8Array(
      await readFile(
        join(process.cwd(), "public", "assets", "website-heroes", sample.fileName),
      ),
    );
  }
  const res = await fetch(sample.publicPath);
  if (!res.ok) {
    throw new Error(`Hero art not found: ${sample.publicPath}`);
  }
  return new Uint8Array(await res.arrayBuffer());
}
