import type { BrandKit } from "@/types/entities";
import {
  OFFICIAL_LOGOS,
  isOfficialLogoVariant,
  isSelectableOfficialLogoVariant,
  type OfficialLogoVariant,
} from "@/lib/constants/brand";
import {
  UNIONOPS_LOGOS,
  isUnionOpsLogoSrc,
} from "@/lib/constants/unionPresets";

export type BrandLogoBytes = {
  bytes: Uint8Array;
  /** Always PNG for Office embeds */
  extension: "png";
  widthPx: number;
  heightPx: number;
  src: string;
};

const TRANSPARENT_PNG_B64 =
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==";

export function transparentPngBytes(): Uint8Array {
  const bin = atob(TRANSPARENT_PNG_B64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

function dataUrlToBytes(dataUrl: string): Uint8Array | null {
  const match = /^data:([^;]+);base64,(.+)$/i.exec(dataUrl);
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

async function fetchBytes(url: string): Promise<Uint8Array | null> {
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    return new Uint8Array(await res.arrayBuffer());
  } catch {
    return null;
  }
}

/**
 * Rasterize any image src to PNG via canvas (required for Word/PPT embeds).
 * Returns null when Image/canvas is unavailable or load times out.
 */
export async function rasterizeSrcToPng(
  src: string,
  maxWidth = 240,
  maxHeight = 96,
): Promise<{ bytes: Uint8Array; widthPx: number; heightPx: number } | null> {
  if (typeof Image === "undefined" || typeof document === "undefined") {
    return null;
  }
  return new Promise((resolve) => {
    const img = new Image();
    let settled = false;
    const finish = (
      value: { bytes: Uint8Array; widthPx: number; heightPx: number } | null,
    ) => {
      if (settled) return;
      settled = true;
      resolve(value);
    };
    const timer = setTimeout(() => finish(null), 2000);
    img.crossOrigin = "anonymous";
    img.onload = () => {
      clearTimeout(timer);
      const ratio = Math.min(
        maxWidth / (img.naturalWidth || maxWidth),
        maxHeight / (img.naturalHeight || maxHeight),
        1,
      );
      const widthPx = Math.max(
        1,
        Math.round((img.naturalWidth || maxWidth) * ratio),
      );
      const heightPx = Math.max(
        1,
        Math.round((img.naturalHeight || maxHeight) * ratio),
      );
      const canvas = document.createElement("canvas");
      canvas.width = widthPx;
      canvas.height = heightPx;
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        finish(null);
        return;
      }
      ctx.drawImage(img, 0, 0, widthPx, heightPx);
      canvas.toBlob(
        async (blob) => {
          if (!blob) {
            finish(null);
            return;
          }
          finish({
            bytes: new Uint8Array(await blob.arrayBuffer()),
            widthPx,
            heightPx,
          });
        },
        "image/png",
      );
    };
    img.onerror = () => {
      clearTimeout(timer);
      finish(null);
    };
    img.src = src;
  });
}

function resolveOfficialSrc(variant: OfficialLogoVariant): string {
  const effective: OfficialLogoVariant = isSelectableOfficialLogoVariant(
    variant,
  )
    ? variant
    : "mark";
  if (effective === "lockup") return OFFICIAL_LOGOS.lockup.src;
  if (effective === "slitBlue") return OFFICIAL_LOGOS.slitBlue.src;
  if (effective === "slitWhite") return OFFICIAL_LOGOS.slitWhite.src;
  return OFFICIAL_LOGOS.mark.src;
}

/**
 * Sync Brand Kit logo URL for preview / HTML embeds (path or data URL).
 */
export function resolveBrandLogoSrc(brandKit: BrandKit): string {
  if (brandKit.useOfficialLogo) {
    const variant = isOfficialLogoVariant(brandKit.officialLogoVariant)
      ? brandKit.officialLogoVariant
      : "lockup";
    return resolveOfficialSrc(variant);
  }
  const custom = brandKit.customLogoDataUrl?.trim();
  if (custom && !isUnionOpsLogoSrc(custom)) {
    return custom;
  }
  return UNIONOPS_LOGOS.markInterlock;
}

/**
 * Resolve Brand Kit logo to PNG bytes for DOCX/PPTX.
 * JPEG/WebP/SVG are re-encoded to PNG when canvas is available.
 */
export async function resolveBrandLogoBytes(
  brandKit: BrandKit,
  opts?: { includeLogo?: boolean },
): Promise<BrandLogoBytes | null> {
  if (opts?.includeLogo === false) return null;

  const src = resolveBrandLogoSrc(brandKit);
  if (!src) return null;

  // Fast path: PNG data URLs need no canvas (and avoid jsdom Image hangs)
  if (src.startsWith("data:image/png")) {
    const bytes = dataUrlToBytes(src);
    if (!bytes) return null;
    return {
      bytes,
      extension: "png",
      widthPx: 180,
      heightPx: 72,
      src,
    };
  }

  // Prefer canvas re-encode so JPEG/WebP/SVG become real PNG
  const raster = await rasterizeSrcToPng(src);
  if (raster) {
    return {
      bytes: raster.bytes,
      extension: "png",
      widthPx: raster.widthPx,
      heightPx: raster.heightPx,
      src,
    };
  }

  // Node / no-canvas path: fetched PNG files only
  if (src.startsWith("data:")) {
    return null;
  }

  if (src.toLowerCase().endsWith(".png")) {
    const bytes = await fetchBytes(src);
    if (!bytes) return null;
    return {
      bytes,
      extension: "png",
      widthPx: src.includes("lockup") || src.includes("primary") ? 200 : 96,
      heightPx: src.includes("lockup") || src.includes("primary") ? 80 : 96,
      src,
    };
  }

  return null;
}

export function logoDisplaySizePx(
  logo: BrandLogoBytes,
  maxW = 180,
  maxH = 72,
): [number, number] {
  const ratio = Math.min(maxW / logo.widthPx, maxH / logo.heightPx, 1);
  return [
    Math.max(1, Math.round(logo.widthPx * ratio)),
    Math.max(1, Math.round(logo.heightPx * ratio)),
  ];
}
