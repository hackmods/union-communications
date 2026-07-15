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
  /** MIME-ish extension for consumers */
  extension: "png" | "jpeg" | "webp";
  /** Display size hint in px (letterhead ~2" wide) */
  widthPx: number;
  heightPx: number;
  /** Original URL or data URL (for preview thumbs) */
  src: string;
};

/** Tiny transparent PNG — keeps {%logo} valid when logo is off / missing. */
const TRANSPARENT_PNG_B64 =
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==";

export function transparentPngBytes(): Uint8Array {
  const bin = atob(TRANSPARENT_PNG_B64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

function extensionFromSrc(src: string): "png" | "jpeg" | "webp" | "svg" | null {
  const lower = src.toLowerCase();
  if (lower.startsWith("data:image/png")) return "png";
  if (lower.startsWith("data:image/jpeg") || lower.startsWith("data:image/jpg"))
    return "jpeg";
  if (lower.startsWith("data:image/webp")) return "webp";
  if (lower.startsWith("data:image/svg")) return "svg";
  if (lower.endsWith(".png")) return "png";
  if (lower.endsWith(".jpg") || lower.endsWith(".jpeg")) return "jpeg";
  if (lower.endsWith(".webp")) return "webp";
  if (lower.endsWith(".svg")) return "svg";
  return null;
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
 * Rasterize SVG (or any image URL/data URL) to PNG via canvas for Word embed.
 * Falls back to null if Image/canvas is unavailable (e.g. some Node tests).
 */
async function rasterizeToPng(
  src: string,
  maxWidth = 240,
  maxHeight = 96,
): Promise<{ bytes: Uint8Array; widthPx: number; heightPx: number } | null> {
  if (typeof Image === "undefined" || typeof document === "undefined") {
    return null;
  }
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const ratio = Math.min(
        maxWidth / (img.naturalWidth || maxWidth),
        maxHeight / (img.naturalHeight || maxHeight),
        1,
      );
      const widthPx = Math.max(1, Math.round((img.naturalWidth || maxWidth) * ratio));
      const heightPx = Math.max(
        1,
        Math.round((img.naturalHeight || maxHeight) * ratio),
      );
      const canvas = document.createElement("canvas");
      canvas.width = widthPx;
      canvas.height = heightPx;
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        resolve(null);
        return;
      }
      ctx.drawImage(img, 0, 0, widthPx, heightPx);
      canvas.toBlob(
        async (blob) => {
          if (!blob) {
            resolve(null);
            return;
          }
          const buf = new Uint8Array(await blob.arrayBuffer());
          resolve({ bytes: buf, widthPx, heightPx });
        },
        "image/png",
      );
    };
    img.onerror = () => resolve(null);
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
 * Resolve Brand Kit logo to raster bytes for DOCX/PPTX injection.
 * Mirrors BrandLogo source selection; prefers PNG assets; SVG → canvas PNG.
 */
export async function resolveBrandLogoBytes(
  brandKit: BrandKit,
  opts?: { includeLogo?: boolean },
): Promise<BrandLogoBytes | null> {
  if (opts?.includeLogo === false) return null;

  let src: string | null = null;

  if (brandKit.useOfficialLogo) {
    const variant = isOfficialLogoVariant(brandKit.officialLogoVariant)
      ? brandKit.officialLogoVariant
      : "lockup";
    src = resolveOfficialSrc(variant);
  } else {
    const custom = brandKit.customLogoDataUrl?.trim();
    if (custom && !isUnionOpsLogoSrc(custom)) {
      src = custom;
    } else {
      // Platform default — prefer interlock PNG (embeds without SVG rasterize)
      src = UNIONOPS_LOGOS.markInterlock;
    }
  }

  if (!src) return null;

  const kind = extensionFromSrc(src);

  if (src.startsWith("data:") && kind && kind !== "svg") {
    const bytes = dataUrlToBytes(src);
    if (!bytes) return null;
    return {
      bytes,
      extension: kind,
      widthPx: 180,
      heightPx: 72,
      src,
    };
  }

  if (kind === "svg" || src.endsWith(".svg")) {
    const raster = await rasterizeToPng(src);
    if (raster) {
      return {
        bytes: raster.bytes,
        extension: "png",
        widthPx: raster.widthPx,
        heightPx: raster.heightPx,
        src,
      };
    }
    // Fall through to interlock PNG
    src = UNIONOPS_LOGOS.markInterlock;
  }

  const bytes = await fetchBytes(src);
  if (!bytes) return null;

  const ext = extensionFromSrc(src);
  if (ext === "svg" || ext === null) {
    const raster = await rasterizeToPng(src);
    if (!raster) return null;
    return {
      bytes: raster.bytes,
      extension: "png",
      widthPx: raster.widthPx,
      heightPx: raster.heightPx,
      src,
    };
  }

  return {
    bytes,
    extension: ext,
    widthPx: ext === "png" && src.includes("lockup") ? 200 : 96,
    heightPx: ext === "png" && src.includes("lockup") ? 80 : 96,
    src,
  };
}

/** EMUs-friendly display size for image module (px → CSS-ish). */
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
