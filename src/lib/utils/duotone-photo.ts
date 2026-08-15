/**
 * Pre-composite grayscale + brand multiply/screen into a single raster.
 * html-to-image’s SVG foreignObject path drops CSS filter + mix-blend stacks
 * over live <img> nodes; a plain data-URL image survives export.
 */

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Could not decode photo for duotone"));
    img.src = src;
  });
}

function clamp01(n: number): number {
  if (Number.isNaN(n)) return 0;
  return Math.min(1, Math.max(0, n));
}

/**
 * Bake a capture-safe duotone JPEG data URL from a photo + brand colours.
 * Falls back to the original `photoUrl` when canvas is unavailable.
 */
export async function composeDuotonePhotoDataUrl(
  photoUrl: string,
  shadowColor: string,
  highlightColor: string,
  highlightOpacity = 0.7,
): Promise<string> {
  if (typeof document === "undefined") return photoUrl;
  if (!photoUrl.trim()) return photoUrl;

  const img = await loadImage(photoUrl);
  const width = Math.max(1, img.naturalWidth || img.width);
  const height = Math.max(1, img.naturalHeight || img.height);

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) return photoUrl;

  // Match CanvasDuotonePhoto preview treatment without leaving blend modes in the DOM
  ctx.filter = "grayscale(1) contrast(1.05)";
  ctx.drawImage(img, 0, 0, width, height);
  ctx.filter = "none";

  ctx.globalCompositeOperation = "multiply";
  ctx.fillStyle = shadowColor;
  ctx.fillRect(0, 0, width, height);

  ctx.globalCompositeOperation = "screen";
  ctx.globalAlpha = clamp01(highlightOpacity);
  ctx.fillStyle = highlightColor;
  ctx.fillRect(0, 0, width, height);

  ctx.globalAlpha = 1;
  ctx.globalCompositeOperation = "source-over";

  try {
    return canvas.toDataURL("image/jpeg", 0.92);
  } catch {
    return photoUrl;
  }
}
