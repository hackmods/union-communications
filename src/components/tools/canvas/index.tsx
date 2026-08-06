"use client";

import type { CSSProperties, ReactNode } from "react";
import { BrandLogo } from "@/components/brand/BrandLogo";
import type { CanvasTokens } from "@/lib/utils/canvas-tokens";
import {
  flexAlignFromBias,
  textAlignFromBias,
} from "@/lib/utils/canvas-tokens";
import { grainOverlayStyle } from "@/lib/utils/canvas-surface";
import {
  CANVAS_PLACEHOLDER_BG,
  CANVAS_PLACEHOLDER_INK,
} from "@/lib/constants/brand";
import { pickContrastingInk } from "@/lib/utils/ink";
import { resolveLocalNumber } from "@/lib/utils";
import { cn } from "@/lib/utils";

export function CanvasGrainOverlay({
  opacity,
}: {
  opacity: number;
}) {
  const style = grainOverlayStyle(opacity);
  if (!style) return null;
  return <div aria-hidden style={style} />;
}

export function CanvasBrandHeader({
  backgroundColor,
  localNumber,
  subText,
  badge,
  logoSize = "md",
  className,
}: {
  backgroundColor: string;
  localNumber: string;
  subText?: string;
  badge?: ReactNode;
  logoSize?: "sm" | "md" | "lg";
  className?: string;
}) {
  const ink = pickContrastingInk(backgroundColor);
  const label = subText
    ? `Local ${resolveLocalNumber(localNumber)} - ${subText}`
    : `Local ${resolveLocalNumber(localNumber)}`;

  return (
    <div className={cn("relative z-[2]", className)}>
      <BrandLogo
        size={logoSize}
        backgroundColor={backgroundColor}
        className="mb-3"
      />
      {badge}
      <p
        className="text-sm font-bold uppercase tracking-widest"
        style={{ color: ink }}
      >
        {label}
      </p>
    </div>
  );
}

export function CanvasTypeBlock({
  tokens,
  title,
  subtitle,
  ink,
  accentColor,
  className,
}: {
  tokens: CanvasTokens;
  title: string;
  subtitle?: string;
  ink: string;
  accentColor?: string;
  className?: string;
}) {
  const align = textAlignFromBias(tokens.alignmentBias);
  const items = flexAlignFromBias(tokens.alignmentBias);
  const asymmetric =
    tokens.alignmentBias === "asymmetric"
      ? ({ paddingInlineStart: "8%", maxWidth: "92%" } satisfies CSSProperties)
      : undefined;

  return (
    <div
      className={cn("relative z-[2] flex w-full flex-col", className)}
      style={{ alignItems: items, textAlign: align, ...asymmetric }}
    >
      <h2
        style={{
          color: ink,
          fontSize: tokens.titleFontSizePx,
          fontWeight: tokens.titleFontWeight,
          letterSpacing: tokens.titleLetterSpacing,
          textTransform: tokens.titleTextTransform,
          lineHeight: 1.15,
          margin: 0,
        }}
      >
        {title}
      </h2>
      {accentColor ? (
        <div
          className="mt-4 h-1 w-24"
          style={{
            backgroundColor: accentColor,
            marginLeft: align === "center" ? "auto" : undefined,
            marginRight: align === "center" ? "auto" : undefined,
          }}
          aria-hidden
        />
      ) : null}
      {subtitle ? (
        <p
          className="mt-3"
          style={{
            color: ink,
            fontSize: tokens.subtitleFontSizePx,
            margin: 0,
            opacity: 0.9,
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
  className,
}: {
  tokens: CanvasTokens;
  qrSrc: string | null;
  alt?: string;
  /** Width of plate as % of parent */
  widthPercent?: number;
  className?: string;
}) {
  const plateStyle: CSSProperties = {
    backgroundColor: tokens.qrPlateBg,
    borderRadius: tokens.qrPlateRadiusPx,
    padding: tokens.qrPlatePaddingPx,
    border: tokens.qrPlateBorder ?? undefined,
    width: widthPercent != null ? `${widthPercent}%` : undefined,
    maxWidth: "100%",
  };

  return (
    <div
      className={cn("relative z-[2] shrink-0", className)}
      style={plateStyle}
    >
      {qrSrc ? (
        // eslint-disable-next-line @next/next/no-img-element -- data URL QR
        <img src={qrSrc} alt={alt} className="h-auto w-full" />
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
 * Duotone photo layer: grayscale base + brand multiply/screen.
 * Prefer over SVG filters — mix-blend layers survive html-to-image more reliably.
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
  return (
    <div
      className={cn("absolute inset-0 overflow-hidden", className)}
      aria-hidden
    >
      {/* eslint-disable-next-line @next/next/no-img-element -- blob/data URL */}
      <img
        src={photoUrl}
        alt=""
        className="absolute inset-0 h-full w-full object-cover"
        style={{
          transform: `scale(${photoScale})`,
          filter: "grayscale(1) contrast(1.05)",
        }}
      />
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
    </div>
  );
}
