import type { BrandKit } from "@/types/entities";
import {
  resolveBrandLogoPresentation,
  type LogoSafePlate,
} from "@/lib/brand/resolve-logo-presentation";

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

function bytesToPngDataUrl(bytes: Uint8Array): string {
  let binary = "";
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]!);
  }
  return `data:image/png;base64,${btoa(binary)}`;
}

async function fetchBytes(url: string): Promise<Uint8Array | null> {
  // Root-relative public assets: prefer disk (API routes + Vitest/jsdom).
  // Do not gate on `typeof window` — jsdom defines window but has no HTTP for /assets.
  if (url.startsWith("/")) {
    try {
      const { readFile } = await import("node:fs/promises");
      const { join } = await import("node:path");
      const filePath = join(process.cwd(), "public", url.replace(/^\//, ""));
      return new Uint8Array(await readFile(filePath));
    } catch {
      // Browser bundles cannot import node:fs — fall through to fetch.
    }
  }
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    return new Uint8Array(await res.arrayBuffer());
  } catch {
    return null;
  }
}

export type RasterizeLogoOpts = {
  cssFilter?: string;
  plate?: LogoSafePlate;
};

/**
 * Rasterize any image src to PNG via canvas (required for Word/PPT embeds).
 * Returns null when Image/canvas is unavailable or load times out.
 */
export async function rasterizeSrcToPng(
  src: string,
  maxWidth = 240,
  maxHeight = 96,
  cssFilterOrOpts?: string | RasterizeLogoOpts,
): Promise<{ bytes: Uint8Array; widthPx: number; heightPx: number } | null> {
  if (typeof Image === "undefined" || typeof document === "undefined") {
    return null;
  }
  const opts: RasterizeLogoOpts =
    typeof cssFilterOrOpts === "string"
      ? { cssFilter: cssFilterOrOpts }
      : (cssFilterOrOpts ?? {});
  const { cssFilter, plate } = opts;

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
      const pad = plate ? Math.max(0, plate.paddingPx) : 0;
      const innerMaxW = Math.max(1, maxWidth - pad * 2);
      const innerMaxH = Math.max(1, maxHeight - pad * 2);
      const ratio = Math.min(
        innerMaxW / (img.naturalWidth || innerMaxW),
        innerMaxH / (img.naturalHeight || innerMaxH),
        1,
      );
      const drawW = Math.max(
        1,
        Math.round((img.naturalWidth || innerMaxW) * ratio),
      );
      const drawH = Math.max(
        1,
        Math.round((img.naturalHeight || innerMaxH) * ratio),
      );
      const widthPx = drawW + pad * 2;
      const heightPx = drawH + pad * 2;
      const canvas = document.createElement("canvas");
      canvas.width = widthPx;
      canvas.height = heightPx;
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        finish(null);
        return;
      }
      if (plate) {
        ctx.fillStyle = plate.backgroundColor;
        ctx.fillRect(0, 0, widthPx, heightPx);
      }
      if (cssFilter) ctx.filter = cssFilter;
      ctx.drawImage(img, pad, pad, drawW, drawH);
      ctx.filter = "none";
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

/**
 * Sync Brand Kit logo URL for preview / HTML embeds (path or data URL).
 * Pass `backgroundColor` (e.g. letterhead primary) to swap/invert on dark fields.
 */
export function resolveBrandLogoSrc(
  brandKit: BrandKit,
  backgroundColor?: string,
): string {
  return resolveBrandLogoPresentation(brandKit, backgroundColor).src;
}

export type ResolveBrandLogoBytesOpts = {
  includeLogo?: boolean;
  /** Header / slide fill — drives white mark, plate, or inverted lockup for Office embeds. */
  backgroundColor?: string;
};

/**
 * Resolve Brand Kit logo to PNG bytes for DOCX/PPTX.
 * JPEG/WebP/SVG are re-encoded to PNG when canvas is available.
 */
export async function resolveBrandLogoBytes(
  brandKit: BrandKit,
  opts?: ResolveBrandLogoBytesOpts,
): Promise<BrandLogoBytes | null> {
  if (opts?.includeLogo === false) return null;

  const { src, cssFilter, plate } = resolveBrandLogoPresentation(
    brandKit,
    opts?.backgroundColor,
  );
  if (!src) return null;

  // Filtered or plated logos must rasterize so Office headers match canvas.
  if (cssFilter || plate) {
    const raster = await rasterizeSrcToPng(src, 240, 96, { cssFilter, plate });
    if (!raster) return null;
    return {
      bytes: raster.bytes,
      extension: "png",
      widthPx: raster.widthPx,
      heightPx: raster.heightPx,
      src: bytesToPngDataUrl(raster.bytes),
    };
  }

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

  // Public PNGs: read disk (API/Vitest) or fetch (browser) before canvas.
  // jsdom's Image often times out on /assets paths; Office embeds need bytes.
  if (!src.startsWith("data:") && src.toLowerCase().endsWith(".png")) {
    const bytes = await fetchBytes(src);
    if (bytes) {
      return {
        bytes,
        extension: "png",
        widthPx: src.includes("lockup") || src.includes("primary") ? 200 : 96,
        heightPx: src.includes("lockup") || src.includes("primary") ? 80 : 96,
        src,
      };
    }
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

/** Stable error code for failed Brand Kit logo rasterization when a logo was required. */
export const BRAND_LOGO_RESOLVE_FAILED = "BRAND_LOGO_RESOLVE_FAILED";

export class BrandLogoResolveError extends Error {
  readonly code = BRAND_LOGO_RESOLVE_FAILED;
  constructor() {
    super(BRAND_LOGO_RESOLVE_FAILED);
    this.name = "BrandLogoResolveError";
  }
}

/**
 * Like {@link resolveBrandLogoBytes}, but throws {@link BrandLogoResolveError}
 * when a logo was requested and could not be resolved to PNG bytes.
 */
export async function requireBrandLogoBytes(
  brandKit: BrandKit,
  opts?: ResolveBrandLogoBytesOpts,
): Promise<BrandLogoBytes> {
  if (opts?.includeLogo === false) {
    throw new BrandLogoResolveError();
  }
  const logo = await resolveBrandLogoBytes(brandKit, {
    ...opts,
    includeLogo: true,
  });
  if (!logo) throw new BrandLogoResolveError();
  return logo;
}

/**
 * Soft when Brand Kit presentation has no `src`; fail-closed when a logo is
 * present but cannot be rasterized to PNG (Office / certificate embeds).
 */
export async function resolveConfiguredBrandLogoBytes(
  brandKit: BrandKit,
  opts?: ResolveBrandLogoBytesOpts,
): Promise<BrandLogoBytes | null> {
  if (opts?.includeLogo === false) return null;
  const { src } = resolveBrandLogoPresentation(
    brandKit,
    opts?.backgroundColor,
  );
  if (!src) return null;
  return requireBrandLogoBytes(brandKit, opts);
}
