/**
 * Capture-safe options for html-to-image.
 * Hardens against Tailwind v4 oklch washout, ancestor scale transforms
 * (MobilePreviewStage), and collapsed layout boxes.
 */

export type CaptureBackground = string | null | undefined;

export interface CaptureOptions {
  pixelRatio?: number;
  /**
   * Canvas fill behind the node. Omit → try computed / white.
   * Pass `null` for transparent PNG (logos).
   */
  backgroundColor?: CaptureBackground;
}

const CAPTURE_STYLE_PROPS = [
  "color",
  "backgroundColor",
  "backgroundImage",
  "borderTopColor",
  "borderRightColor",
  "borderBottomColor",
  "borderLeftColor",
  "fontFamily",
  "fontSize",
  "fontWeight",
  "fontStyle",
  "letterSpacing",
  "lineHeight",
  "textAlign",
  "textTransform",
  "opacity",
  "display",
  "flexDirection",
  "flexWrap",
  "justifyContent",
  "alignItems",
  "alignSelf",
  "gap",
  "rowGap",
  "columnGap",
  "paddingTop",
  "paddingRight",
  "paddingBottom",
  "paddingLeft",
  "marginTop",
  "marginRight",
  "marginBottom",
  "marginLeft",
  "width",
  "height",
  "minWidth",
  "minHeight",
  "maxWidth",
  "maxHeight",
  "position",
  "top",
  "right",
  "bottom",
  "left",
  "inset",
  "zIndex",
  "overflow",
  "overflowX",
  "overflowY",
  "borderRadius",
  "boxSizing",
  "objectFit",
  "objectPosition",
  "mixBlendMode",
  "filter",
  "transform",
] as const;

function isTransparentColor(value: string): boolean {
  const v = value.trim().toLowerCase();
  return (
    !v ||
    v === "transparent" ||
    v === "rgba(0, 0, 0, 0)" ||
    v === "rgba(0,0,0,0)"
  );
}

/** Resolve a solid fill for html-to-image when the caller did not pin one. */
export function resolveCaptureBackground(
  node: HTMLElement,
  backgroundColor?: CaptureBackground,
): string | undefined {
  if (backgroundColor === null) return undefined;
  if (typeof backgroundColor === "string" && backgroundColor.trim()) {
    return backgroundColor;
  }
  try {
    const computed = getComputedStyle(node).backgroundColor;
    if (!isTransparentColor(computed)) return computed;
  } catch {
    // Unit tests pass plain object stubs that are not DOM Elements
  }
  return "#ffffff";
}

/** Walk ancestors for an inline CSS scale() used by MobilePreviewStage. */
export function findScaledTransformAncestor(
  node: HTMLElement,
): HTMLElement | null {
  let cur: HTMLElement | null =
    typeof node.parentElement !== "undefined" ? node.parentElement : null;
  while (cur) {
    const inline = cur.style?.transform;
    if (inline && /scale\s*\(/i.test(inline)) return cur;
    cur = cur.parentElement;
  }
  return null;
}

/**
 * Temporarily clear ancestor scale transforms so html-to-image measures and
 * paints the natural layout box (preview scale must not bake into exports).
 */
export async function withUnscaledAncestors<T>(
  node: HTMLElement,
  run: () => Promise<T>,
): Promise<T> {
  const scaled = findScaledTransformAncestor(node);
  const previous = scaled?.style.transform;

  if (scaled) {
    scaled.style.transform = "none";
  }
  try {
    await new Promise<void>((resolve) => {
      if (typeof requestAnimationFrame === "function") {
        requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
      } else {
        setTimeout(resolve, 0);
      }
    });
    // Duotone photos bake async; data-URL <img>s are skipped by html-to-image embed
    await awaitDuotonePhotosReady(node);
    await awaitCaptureImages(node);
    await awaitDocumentFontsReady();
    return await run();
  } finally {
    if (scaled && previous !== undefined) {
      scaled.style.transform = previous;
    }
  }
}

/** Wait for self-hosted canvas webfonts before rasterizing exports. */
export async function awaitDocumentFontsReady(
  timeoutMs = 5_000,
): Promise<void> {
  if (typeof document === "undefined" || !document.fonts?.ready) return;
  try {
    await Promise.race([
      document.fonts.ready,
      new Promise<void>((resolve) => {
        setTimeout(resolve, timeoutMs);
      }),
    ]);
  } catch {
    // Ignore FontFaceSet errors — capture still proceeds with fallbacks.
  }
}

/** Wait until CanvasDuotonePhoto has swapped CSS blends for a baked raster. */
export async function awaitDuotonePhotosReady(
  root: HTMLElement,
  timeoutMs = 8_000,
): Promise<void> {
  if (typeof root.querySelectorAll !== "function") return;
  const started = Date.now();
  while (Date.now() - started < timeoutMs) {
    const pending = root.querySelectorAll('[data-canvas-duotone="pending"]');
    if (pending.length === 0) return;
    await new Promise<void>((resolve) => setTimeout(resolve, 40));
  }
}

/**
 * Ensure every <img> under the capture root has decoded pixels.
 * html-to-image skips load waits for existing data: URLs.
 */
export async function awaitCaptureImages(root: HTMLElement): Promise<void> {
  if (typeof root.querySelectorAll !== "function") return;
  const imgs = Array.from(root.querySelectorAll("img"));
  await Promise.all(
    imgs.map(async (img) => {
      if (!img.getAttribute("src") && !img.src) return;
      try {
        if (!img.complete || img.naturalWidth === 0) {
          await new Promise<void>((resolve) => {
            const done = () => resolve();
            img.addEventListener("load", done, { once: true });
            img.addEventListener("error", done, { once: true });
            // Already failed/complete edge cases
            if (img.complete) resolve();
          });
        }
        if (typeof img.decode === "function") {
          await img.decode();
        }
      } catch {
        // Missing/broken images should not block the rest of the export
      }
    }),
  );
}

function camelToKebab(prop: string): string {
  return prop.replace(/[A-Z]/g, (c) => `-${c.toLowerCase()}`);
}

/**
 * Inline computed paint/layout styles onto the clone so oklch / utility classes
 * that html-to-image cannot parse still rasterize as rgb()/px values.
 */
export function inlineComputedStylesForCapture(
  liveRoot: HTMLElement,
  clonedRoot: HTMLElement,
): void {
  const liveNodes = [
    liveRoot,
    ...Array.from(liveRoot.querySelectorAll<HTMLElement>("*")),
  ];
  const clonedNodes = [
    clonedRoot,
    ...Array.from(clonedRoot.querySelectorAll<HTMLElement>("*")),
  ];
  const count = Math.min(liveNodes.length, clonedNodes.length);

  for (let i = 0; i < count; i++) {
    const live = liveNodes[i];
    const cloned = clonedNodes[i];
    if (!live || !cloned) continue;
    if (!(live instanceof HTMLElement) || !(cloned instanceof HTMLElement)) {
      continue;
    }

    const cs = getComputedStyle(live);
    for (const prop of CAPTURE_STYLE_PROPS) {
      const value = cs[prop as keyof CSSStyleDeclaration];
      if (typeof value !== "string" || !value) continue;
      // Skip wide "auto" margins that fight flex clones
      if (prop.startsWith("margin") && value === "0px") continue;
      try {
        cloned.style.setProperty(camelToKebab(prop), value);
      } catch {
        // Ignore unsupported properties on SVG-backed clones
      }
    }

    // Ensure type inherits a concrete family on every text-bearing node
    if (cs.fontFamily) {
      cloned.style.fontFamily = cs.fontFamily;
    }
  }

  // Capture root must not carry a leftover scale from a cloned ancestor style
  clonedRoot.style.transform = "none";
  clonedRoot.style.width = `${Math.max(1, Math.round(liveRoot.offsetWidth))}px`;
  clonedRoot.style.height = `${Math.max(1, Math.round(liveRoot.offsetHeight))}px`;
}

export function buildHtmlToImageOptions(
  node: HTMLElement,
  options: CaptureOptions = {},
): Record<string, unknown> {
  const width = Math.max(1, Math.round(node.offsetWidth));
  const height = Math.max(1, Math.round(node.offsetHeight));
  const backgroundColor = resolveCaptureBackground(
    node,
    options.backgroundColor,
  );

  const opts: Record<string, unknown> = {
    pixelRatio: options.pixelRatio ?? 2,
    cacheBust: true,
    width,
    height,
    style: {
      transform: "none",
      width: `${width}px`,
      height: `${height}px`,
    },
    onclone: (clonedDoc: Document, clonedNode: HTMLElement) => {
      void clonedDoc;
      inlineComputedStylesForCapture(node, clonedNode);
    },
  };

  if (backgroundColor !== undefined) {
    opts.backgroundColor = backgroundColor;
  }

  return opts;
}

/** PNG data URL → JPEG data URL for smaller, viewer-friendly PDFs. */
export async function pngDataUrlToJpegDataUrl(
  pngDataUrl: string,
  quality = 0.92,
): Promise<string> {
  if (typeof document === "undefined") return pngDataUrl;
  if (!pngDataUrl.startsWith("data:image/")) return pngDataUrl;
  // Unit fixtures use tiny/invalid data URLs — skip re-encode
  if (pngDataUrl.length < 128) return pngDataUrl;

  const img = new Image();
  try {
    await new Promise<void>((resolve, reject) => {
      const timer = window.setTimeout(
        () => reject(new Error("Timed out decoding capture for PDF")),
        8_000,
      );
      img.onload = () => {
        window.clearTimeout(timer);
        resolve();
      };
      img.onerror = () => {
        window.clearTimeout(timer);
        reject(new Error("Failed to decode capture for PDF"));
      };
      img.src = pngDataUrl;
    });
  } catch {
    return pngDataUrl;
  }

  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, img.naturalWidth || img.width);
  canvas.height = Math.max(1, img.naturalHeight || img.height);
  const ctx = canvas.getContext("2d");
  if (!ctx) return pngDataUrl;
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(img, 0, 0);
  return canvas.toDataURL("image/jpeg", quality);
}
