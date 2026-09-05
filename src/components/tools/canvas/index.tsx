"use client";

import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from "react";
import { BrandLogo } from "@/components/brand/BrandLogo";
import type { CanvasTokens } from "@/lib/utils/canvas-tokens";
import {
  CANVAS_TYPE_FIT_MAX_ITERS,
  CANVAS_TYPE_FIT_MIN_SCALE,
  fittedFontSizePx,
  nextTypeFitScale,
  typeFitOverflows,
} from "@/lib/utils/canvas-type-fit";
import {
  flexAlignFromBias,
  textAlignFromBias,
  typeScaleFactor,
} from "@/lib/utils/canvas-tokens";
import { grainOverlayStyle } from "@/lib/utils/canvas-surface";
import {
  insetsToInsetStyle,
  isZeroInsets,
  type EdgeInsets,
} from "@/lib/utils/edge-clearance";
import {
  CANVAS_PLACEHOLDER_BG,
  CANVAS_PLACEHOLDER_INK,
} from "@/lib/constants/brand";
import type { BoardLogoMode } from "@/lib/constants/board-banner-ornaments";
import { pickContrastingInk } from "@/lib/utils/ink";
import { resolveLocalNumber } from "@/lib/utils";
import { cn } from "@/lib/utils";
import { hexToRgba } from "@/lib/utils/contrast";
import { composeDuotonePhotoDataUrl } from "@/lib/utils/duotone-photo";
import { formatCanvasDisplayUrl } from "@/lib/utils/canvas-url";

export function CanvasGrainOverlay({
  opacity,
}: {
  opacity: number;
}) {
  const style = grainOverlayStyle(opacity);
  if (!style) return null;
  return <div aria-hidden style={style} />;
}

/**
 * Preview-only dashed crop guide. Must stay outside capture nodes
 * (`canvasRef` / ZIP frames) — html-to-image would bake the yellow border.
 */
export function CanvasSafeZoneOverlay({
  insets,
}: {
  insets: EdgeInsets;
}) {
  if (isZeroInsets(insets)) return null;
  return (
    <div
      className="pointer-events-none absolute border-2 border-dashed"
      style={{
        ...insetsToInsetStyle(insets),
        borderColor: "rgba(250, 204, 21, 0.8)",
      }}
      aria-hidden="true"
    />
  );
}

/**
 * Insets type/chrome inside a full-bleed capture root. Colour and grain stay
 * on the parent; this frame only shrinks the layout so bars lift off the crop.
 */
export function CanvasEdgeClearanceFrame({
  insets,
  children,
  className,
}: {
  insets: EdgeInsets;
  children: ReactNode;
  className?: string;
}) {
  if (isZeroInsets(insets)) {
    return <>{children}</>;
  }
  return (
    <div className={cn("relative h-full min-h-0 w-full", className)}>
      <div
        className="absolute box-border min-h-0 min-w-0 overflow-hidden"
        style={insetsToInsetStyle(insets)}
      >
        {children}
      </div>
    </div>
  );
}

export function CanvasBrandHeader({
  backgroundColor,
  localNumber,
  subText,
  badge,
  logoSize = "md",
  logoMode = "lockup",
  showLocalLabel = true,
  className,
  fontFamily,
}: {
  backgroundColor: string;
  localNumber: string;
  subText?: string;
  badge?: ReactNode;
  logoSize?: "sm" | "md" | "lg";
  /** When `none`, badge + optional local label still render without the logo mark. */
  logoMode?: BoardLogoMode;
  showLocalLabel?: boolean;
  className?: string;
  /** Brand Kit body / meta face */
  fontFamily?: string;
}) {
  const ink = pickContrastingInk(backgroundColor);
  const label = subText
    ? `Local ${resolveLocalNumber(localNumber)} - ${subText}`
    : `Local ${resolveLocalNumber(localNumber)}`;
  const showLogo = logoMode !== "none";
  const logoVariant = logoMode === "mark" ? "mark" : "lockup";

  if (!showLogo && !showLocalLabel && !badge) return null;

  return (
    <div className={cn("relative z-[2]", className)}>
      {showLogo ? (
        <BrandLogo
          size={logoSize}
          backgroundColor={backgroundColor}
          variantOverride={logoVariant}
          className={showLocalLabel || badge ? "mb-3" : undefined}
        />
      ) : null}
      {badge}
      {showLocalLabel ? (
        <p
          className="font-bold uppercase tracking-widest"
          style={{
            color: ink,
            // Inline size — Tailwind text-* can resolve via oklch vars in some builds
            fontSize: "0.875rem",
            lineHeight: 1.25,
            margin: 0,
            fontFamily,
          }}
        >
          {label}
        </p>
      ) : null}
    </div>
  );
}

/**
 * Flex slot for type on fixed-height print canvases. Gives CanvasTypeBlock a
 * bounded height so `fit` can shrink copy instead of painting over meta rows.
 */
export function CanvasStackSlot({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      data-canvas-stack-slot=""
      className={cn(
        // min-h keeps a real type budget when meta/header are tall — never
        // collapse the slot to 0px (which hid headlines under `fit`).
        "relative z-[2] flex min-h-[28%] min-w-0 flex-1 flex-col overflow-hidden",
        className,
      )}
    >
      {children}
    </div>
  );
}

/**
 * Title + optional subtitle for export canvases.
 *
 * When `fit` is true, type scales down into the parent slot (use with
 * CanvasStackSlot / any `min-h-0 flex-1 overflow-hidden` region) so long
 * steward copy cannot overlap Date / Time / Location siblings.
 */
export function CanvasTypeBlock({
  tokens,
  title,
  subtitle,
  ink,
  accentColor,
  className,
  fit = false,
}: {
  tokens: CanvasTokens;
  title: string;
  subtitle?: string;
  ink: string;
  accentColor?: string;
  className?: string;
  /** Shrink title/subtitle to the parent box — required on fixed print stacks. */
  fit?: boolean;
}) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);
  const align = textAlignFromBias(tokens.alignmentBias);
  const items = flexAlignFromBias(tokens.alignmentBias);
  const asymmetric =
    tokens.alignmentBias === "asymmetric"
      ? ({ paddingInlineStart: "8%", maxWidth: "92%" } satisfies CSSProperties)
      : undefined;

  useLayoutEffect(() => {
    if (!fit) return;
    const el = wrapRef.current;
    if (!el) return;

    let raf = 0;
    const measure = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        const parent = el.parentElement;
        // Budget is the stack slot — not self.clientHeight (h-full + empty
        // flex slot reported 0 and hid the headline).
        const budgetW = parent?.clientWidth || el.clientWidth;
        const budgetH = parent?.clientHeight || el.clientHeight;
        if (!(budgetW > 0) || !(budgetH > 0)) return;

        let next = 1;
        // Walk down from Brand Kit size until copy fits the slot budget.
        for (let i = 0; i < CANVAS_TYPE_FIT_MAX_ITERS; i++) {
          el.dataset.canvasTypeFit = String(next);
          const titleEl = el.querySelector<HTMLElement>("[data-canvas-title]");
          const subEl = el.querySelector<HTMLElement>("[data-canvas-subtitle]");
          const ruleEl = el.querySelector<HTMLElement>("[data-canvas-rule]");
          if (titleEl) {
            titleEl.style.fontSize = `${fittedFontSizePx(tokens.titleFontSizePx, next, 12)}px`;
          }
          if (subEl) {
            subEl.style.fontSize = `${fittedFontSizePx(tokens.subtitleFontSizePx, next, 10)}px`;
            subEl.style.marginTop = `${Math.max(4, Math.round(12 * next))}px`;
          }
          if (ruleEl) {
            ruleEl.style.height = `${Math.max(2, Math.round(4 * next))}px`;
            ruleEl.style.marginTop = `${Math.max(4, Math.round(16 * next))}px`;
          }
          const overflowing = typeFitOverflows(
            el.scrollWidth,
            el.scrollHeight,
            budgetW,
            budgetH,
          );
          if (!overflowing || next <= CANVAS_TYPE_FIT_MIN_SCALE) break;
          next = nextTypeFitScale(next, true);
        }
        setScale((prev) => (prev === next ? prev : next));
      });
    };

    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    if (el.parentElement) ro.observe(el.parentElement);
    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
    };
  }, [
    fit,
    title,
    subtitle,
    tokens.titleFontSizePx,
    tokens.subtitleFontSizePx,
    tokens.headlineFontFamily,
    tokens.bodyFontFamily,
    tokens.alignmentBias,
    tokens.titleFontWeight,
    tokens.titleLetterSpacing,
    tokens.titleTextTransform,
    tokens.bodyFontWeight,
    tokens.bodyLineHeight,
    accentColor,
  ]);

  const applied = fit ? scale : 1;
  const titlePx = fittedFontSizePx(tokens.titleFontSizePx, applied, 12);
  const subtitlePx = fittedFontSizePx(tokens.subtitleFontSizePx, applied, 10);
  const ruleGap = Math.max(4, Math.round(16 * applied));
  const subGap = Math.max(4, Math.round(12 * applied));
  const ruleH = Math.max(2, Math.round(4 * applied));

  return (
    <div
      ref={wrapRef}
      data-canvas-type=""
      data-canvas-type-fit={fit ? scale.toFixed(3) : undefined}
      className={cn(
        "relative z-[2] flex w-full flex-col",
        // Intrinsic height at fitted size; max-h clips if still over budget.
        // Avoid h-full — a squeezed flex slot made headlines height:0.
        fit && "max-h-full min-h-0 min-w-0 overflow-hidden",
        className,
      )}
      style={{ alignItems: items, textAlign: align, ...asymmetric }}
    >
      <h2
        data-canvas-title=""
        style={{
          color: ink,
          fontSize: titlePx,
          fontWeight: tokens.titleFontWeight,
          letterSpacing: tokens.titleLetterSpacing,
          textTransform: tokens.titleTextTransform,
          lineHeight: 1.15,
          margin: 0,
          fontFamily: tokens.headlineFontFamily,
        }}
      >
        {title}
      </h2>
      {accentColor ? (
        <div
          data-canvas-rule=""
          className="w-24"
          style={{
            height: ruleH,
            marginTop: ruleGap,
            backgroundColor: accentColor,
            marginLeft: align === "center" ? "auto" : undefined,
            marginRight: align === "center" ? "auto" : undefined,
          }}
          aria-hidden
        />
      ) : null}
      {subtitle ? (
        <p
          data-canvas-subtitle=""
          style={{
            color: ink,
            fontSize: subtitlePx,
            fontWeight: tokens.bodyFontWeight,
            lineHeight: tokens.bodyLineHeight,
            margin: 0,
            marginTop: subGap,
            opacity: 0.9,
            fontFamily: tokens.bodyFontFamily,
          }}
        >
          {subtitle}
        </p>
      ) : null}
    </div>
  );
}

export function CanvasQrPlate({
  tokens,
  qrSrc,
  alt = "",
  widthPercent,
  /** Brand accent for plate chrome only — never tints QR modules. */
  accentColor,
  className,
  /** Override token padding — small board plates need a thinner quiet zone. */
  paddingPx,
}: {
  tokens: CanvasTokens;
  qrSrc: string | null;
  alt?: string;
  /** Width of plate as % of parent */
  widthPercent?: number;
  accentColor?: string;
  className?: string;
  paddingPx?: number;
}) {
  const scale = typeScaleFactor(tokens);
  const pad = Math.max(
    2,
    paddingPx ??
      Math.round(tokens.qrPlatePaddingPx * Math.min(1.15, Math.max(0.85, scale))),
  );
  const tintedBorder =
    accentColor && tokens.qrPlate !== "flush"
      ? `2px solid ${hexToRgba(accentColor, 0.45)}`
      : tokens.qrPlateBorder;
  const plateStyle: CSSProperties = {
    backgroundColor: tokens.qrPlateBg,
    borderRadius: tokens.qrPlateRadiusPx,
    padding: pad,
    border: tintedBorder ?? undefined,
    boxShadow:
      tokens.qrPlate === "white-card"
        ? "0 2px 8px rgba(0,0,0,0.12)"
        : tokens.qrPlate === "inset"
          ? "inset 0 0 0 1px rgba(0,0,0,0.06)"
          : undefined,
    width: widthPercent != null ? `${widthPercent}%` : "100%",
    maxWidth: "100%",
    aspectRatio: "1",
    boxSizing: "border-box",
  };

  return (
    /*
     * Square plate: width % (or 100%) + aspect-ratio 1 — never the same %
     * on height. Do not max-h-full + object-contain on the img unless this
     * box is already square. Do not raise z-index — that used to paint
     * white-card chrome over URL captions in the next flex row.
     */
    <div
      data-qr-plate=""
      className={cn("relative shrink-0", className)}
      style={plateStyle}
    >
      {qrSrc ? (
        // eslint-disable-next-line @next/next/no-img-element -- data URL QR
        <img src={qrSrc} alt={alt} className="block h-auto w-full" />
      ) : (
        <div
          className="flex aspect-square w-full items-center justify-center text-center text-xs"
          style={{
            backgroundColor: CANVAS_PLACEHOLDER_BG,
            color: CANVAS_PLACEHOLDER_INK,
          }}
        >
          QR
        </div>
      )}
    </div>
  );
}

/**
 * Destination caption under a QR plate. Wraps long links (no single-line
 * ellipsis) and stays above plate chrome in the stacking order.
 */
export function CanvasUrlCaption({
  url,
  color,
  fontSizePx,
  fontFamily,
  textAlign = "center",
  maxLines = 2,
  maxChars,
  className,
}: {
  url: string;
  color: string;
  fontSizePx: number;
  fontFamily?: string;
  textAlign?: CanvasTextAlign;
  maxLines?: number;
  maxChars?: number;
  className?: string;
}) {
  const display = formatCanvasDisplayUrl(url, { maxChars });
  if (!display) return null;

  return (
    <p
      data-canvas-url=""
      title={url.trim()}
      className={cn("relative z-[1] min-w-0 shrink-0", className)}
      style={{
        color,
        fontSize: fontSizePx,
        fontFamily,
        textAlign,
        width: "100%",
        margin: 0,
        lineHeight: 1.25,
        overflowWrap: "anywhere",
        wordBreak: "break-word",
        display: "-webkit-box",
        WebkitLineClamp: maxLines,
        WebkitBoxOrient: "vertical",
        overflow: "hidden",
      }}
    >
      {display}
    </p>
  );
}

type CanvasTextAlign = "left" | "center" | "right";

/**
 * Duotone photo layer: grayscale + brand multiply/screen, pre-baked to a single
 * JPEG data URL. Live CSS blend stacks wash out inside html-to-image’s SVG
 * foreignObject path — a plain <img> is what survives PNG/PDF export.
 */
export function CanvasDuotonePhoto({
  photoUrl,
  shadowColor,
  highlightColor,
  highlightOpacity = 0.7,
  photoScale = 1,
  className,
}: {
  photoUrl: string;
  shadowColor: string;
  highlightColor: string;
  highlightOpacity?: number;
  photoScale?: number;
  className?: string;
}) {
  const bakeKey = `${photoUrl}\0${shadowColor}\0${highlightColor}\0${highlightOpacity}`;
  const [baked, setBaked] = useState<{ key: string; url: string } | null>(
    null,
  );

  useEffect(() => {
    let cancelled = false;
    void composeDuotonePhotoDataUrl(
      photoUrl,
      shadowColor,
      highlightColor,
      highlightOpacity,
    )
      .then((url) => {
        if (!cancelled) setBaked({ key: bakeKey, url });
      })
      .catch(() => {
        if (!cancelled) setBaked({ key: bakeKey, url: photoUrl });
      });
    return () => {
      cancelled = true;
    };
  }, [bakeKey, photoUrl, shadowColor, highlightColor, highlightOpacity]);

  const ready = baked?.key === bakeKey;
  const src = ready && baked ? baked.url : photoUrl;

  return (
    <div
      className={cn("absolute inset-0 overflow-hidden", className)}
      aria-hidden
      data-canvas-duotone={ready ? "ready" : "pending"}
    >
      {/* eslint-disable-next-line @next/next/no-img-element -- blob/data URL */}
      <img
        src={src}
        alt=""
        className="absolute inset-0 h-full w-full object-cover"
        style={{
          transform: `scale(${photoScale})`,
          // CSS fallback only while baking — remove once the capture-safe raster is ready
          ...(ready
            ? undefined
            : { filter: "grayscale(1) contrast(1.05)" }),
        }}
      />
      {!ready ? (
        <>
          <div
            style={{
              position: "absolute",
              inset: 0,
              backgroundColor: shadowColor,
              mixBlendMode: "multiply",
            }}
          />
          <div
            style={{
              position: "absolute",
              inset: 0,
              backgroundColor: highlightColor,
              mixBlendMode: "screen",
              opacity: highlightOpacity,
            }}
          />
        </>
      ) : null}
    </div>
  );
}
