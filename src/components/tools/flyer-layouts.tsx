"use client";

import type { CSSProperties, Ref } from "react";
import {
  CanvasBrandHeader,
  CanvasDuotonePhoto,
  CanvasGrainOverlay,
  CanvasQrPlate,
  CanvasTypeBlock,
} from "@/components/tools/canvas";
import type { FlyerLayoutId } from "@/lib/comms/flyer-layouts";
import type { BoardLogoMode } from "@/lib/constants/board-banner-ornaments";
import { pickContrastingInk } from "@/lib/utils/ink";
import { meetsWcagAA } from "@/lib/utils/contrast";
import type { CanvasTokens } from "@/lib/utils/canvas-tokens";
import { printPageScaledTokens } from "@/lib/utils/canvas-tokens";
import { canvasSurfaceStyle } from "@/lib/utils/canvas-surface";
import { cn } from "@/lib/utils";

export interface FlyerLayoutCopy {
  message: string;
  body: string;
  date: string;
  time: string;
  location: string;
  contact: string;
  dateLabel: string;
  timeLabel: string;
  locationLabel: string;
}

export interface FlyerLayoutColors {
  primary: string;
  accent: string;
  secondary: string;
}

export interface FlyerLayoutCanvasProps {
  layout: FlyerLayoutId;
  tokens: CanvasTokens;
  colours: FlyerLayoutColors;
  copy: FlyerLayoutCopy;
  localNumber: string;
  subText: string;
  /** Fixed design width in CSS px (preview scales via MobilePreviewStage). */
  designWidthPx: number;
  /** Fixed design height in CSS px — must match format aspect. */
  designHeightPx: number;
  /** Reference width for typography scaling (letter preview width). */
  referenceWidthPx: number;
  aspectClass: string;
  /** Inline aspect-ratio for capture-safe clones (e.g. `"8.5 / 11"`). */
  aspectRatio: string;
  photoUrl?: string;
  photoScale?: number;
  qrSrc?: string | null;
  showQr?: boolean;
  className?: string;
  style?: CSSProperties;
  /** Forwarded to the capture root (canvasRef target). */
  canvasRef?: Ref<HTMLDivElement>;
  logoMode?: BoardLogoMode;
  showLocalLabel?: boolean;
}

function accentRuleColor(
  primary: string,
  accent: string,
  secondary: string,
): string | undefined {
  if (secondary !== primary) return secondary;
  return meetsWcagAA(accent, primary, true) ? accent : undefined;
}

function MetaBlock({
  copy,
  ink,
  fontSize,
  gap,
  className,
}: {
  copy: FlyerLayoutCopy;
  ink: string;
  fontSize: number;
  gap: number;
  className?: string;
}) {
  const rows: { label: string; value: string }[] = [];
  if (copy.date.trim()) rows.push({ label: copy.dateLabel, value: copy.date });
  if (copy.time.trim()) rows.push({ label: copy.timeLabel, value: copy.time });
  if (copy.location.trim())
    rows.push({ label: copy.locationLabel, value: copy.location });

  const body = copy.body.trim();
  const contact = copy.contact.trim();

  if (rows.length === 0 && !body && !contact) return null;

  return (
    <div
      className={cn("relative z-[2]", className)}
      style={{
        color: ink,
        fontSize,
        lineHeight: 1.45,
        display: "flex",
        flexDirection: "column",
        gap,
      }}
    >
      {body ? <p style={{ margin: 0 }}>{body}</p> : null}
      {rows.map((row) => (
        <p key={row.label} style={{ margin: 0 }}>
          <strong>{row.label}:</strong> {row.value}
        </p>
      ))}
      {contact ? <p style={{ margin: 0 }}>{contact}</p> : null}
    </div>
  );
}

function QrFooter({
  tokens,
  qrSrc,
  accentColor,
  widthPercent = 28,
}: {
  tokens: CanvasTokens;
  qrSrc: string;
  accentColor?: string;
  widthPercent?: number;
}) {
  return (
    <div
      className="relative z-[2] shrink-0 self-center"
      style={{ width: `${widthPercent}%`, maxWidth: 140 }}
    >
      <CanvasQrPlate
        tokens={tokens}
        qrSrc={qrSrc}
        alt=""
        accentColor={accentColor}
        widthPercent={100}
      />
    </div>
  );
}

/**
 * Capture-safe flyer canvas. Shadows must stay on a parent outside canvasRef.
 */
export function FlyerLayoutCanvas({
  layout,
  tokens,
  colours,
  copy,
  localNumber,
  subText,
  designWidthPx,
  designHeightPx,
  referenceWidthPx,
  aspectClass,
  aspectRatio,
  photoUrl,
  photoScale = 1,
  qrSrc,
  showQr = false,
  className,
  style,
  canvasRef,
  logoMode = "lockup",
  showLocalLabel = true,
}: FlyerLayoutCanvasProps) {
  const scaledTokens = printPageScaledTokens(
    tokens,
    designWidthPx,
    referenceWidthPx,
  );
  const ink = pickContrastingInk(colours.primary);
  const surfaceStyle = canvasSurfaceStyle(scaledTokens, {
    primary: colours.primary,
    secondary: colours.secondary,
    accent: colours.accent,
  });
  const accent = accentRuleColor(
    colours.primary,
    colours.accent,
    colours.secondary,
  );
  const metaSize = scaledTokens.subtitleFontSizePx + 4;
  const qrVisible = Boolean(showQr && qrSrc);

  const canvasBoxStyle: CSSProperties = {
    width: designWidthPx,
    height: designHeightPx,
    maxWidth: "100%",
    flexShrink: 0,
  };

  const rootStyle: CSSProperties = {
    ...surfaceStyle,
    ...canvasBoxStyle,
    color: ink,
    fontFamily: scaledTokens.bodyFontFamily,
    aspectRatio,
    display: "flex",
    flexDirection: "column",
    overflow: "hidden",
    boxSizing: "border-box",
    padding: scaledTokens.paddingPx,
    gap: scaledTokens.gapPx,
    ...style,
  };

  if (layout === "band") {
    const bandInk = pickContrastingInk(colours.secondary);
    const panelBg = colours.primary;
    const panelInk = ink;
    return (
      <div
        ref={canvasRef}
        data-export-root=""
        className={cn(
          "relative flex shrink-0 flex-col overflow-hidden",
          aspectClass,
          className,
        )}
        style={{
          ...canvasBoxStyle,
          backgroundColor: panelBg,
          color: panelInk,
          fontFamily: scaledTokens.bodyFontFamily,
          aspectRatio,
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
          boxSizing: "border-box",
          ...style,
        }}
      >
        <CanvasGrainOverlay opacity={scaledTokens.grainOpacity} />
        <div
          className="relative z-[2] flex shrink-0 flex-col"
          style={{
            backgroundColor: colours.secondary,
            color: bandInk,
            fontFamily: scaledTokens.bodyFontFamily,
            padding: scaledTokens.paddingPx,
            gap: scaledTokens.gapPx,
          }}
        >
          <CanvasBrandHeader
            backgroundColor={colours.secondary}
            localNumber={localNumber}
            subText={subText}
            fontFamily={scaledTokens.bodyFontFamily}
            logoMode={logoMode}
            showLocalLabel={showLocalLabel}
          />
          <CanvasTypeBlock
            tokens={{
              ...scaledTokens,
              alignmentBias: "center",
            }}
            title={copy.message}
            ink={bandInk}
            accentColor={
              meetsWcagAA(colours.accent, colours.secondary, true)
                ? colours.accent
                : undefined
            }
          />
        </div>
        <div
          className="relative z-[2] flex min-h-0 flex-1 flex-col justify-between"
          style={{
            padding: scaledTokens.paddingPx,
            gap: scaledTokens.gapPx,
            backgroundColor: panelBg,
            color: panelInk,
          }}
        >
          <MetaBlock
            copy={copy}
            ink={panelInk}
            fontSize={metaSize}
            gap={scaledTokens.gapPx}
          />
          {qrVisible && qrSrc ? (
            <QrFooter
              tokens={scaledTokens}
              qrSrc={qrSrc}
              accentColor={colours.accent}
            />
          ) : null}
        </div>
      </div>
    );
  }

  if (layout === "photoHero") {
    return (
      <div
        ref={canvasRef}
        data-export-root=""
        className={cn(
          "relative flex shrink-0 flex-col overflow-hidden",
          aspectClass,
          className,
        )}
        style={rootStyle}
      >
        <CanvasGrainOverlay opacity={scaledTokens.grainOpacity} />
        <div
          className="relative z-[1] w-full shrink-0 overflow-hidden"
          style={{ flex: "0 0 38%", minHeight: 80 }}
        >
          {photoUrl ? (
            <CanvasDuotonePhoto
              photoUrl={photoUrl}
              shadowColor={colours.primary}
              highlightColor={colours.accent}
              highlightOpacity={scaledTokens.duotoneHighlightOpacity}
              photoScale={photoScale}
            />
          ) : (
            <div
              aria-hidden
              className="absolute inset-0"
              style={{
                backgroundColor: colours.secondary,
                opacity: 0.85,
              }}
            />
          )}
        </div>
        <div
          className="relative z-[2] flex min-h-0 flex-1 flex-col justify-between"
          style={{ gap: scaledTokens.gapPx }}
        >
          <CanvasBrandHeader
            backgroundColor={colours.primary}
            localNumber={localNumber}
            subText={subText}
            fontFamily={scaledTokens.bodyFontFamily}
            logoMode={logoMode}
            showLocalLabel={showLocalLabel}
          />
          <CanvasTypeBlock
            tokens={scaledTokens}
            title={copy.message}
            ink={ink}
            accentColor={accent}
          />
          <MetaBlock
            copy={copy}
            ink={ink}
            fontSize={metaSize}
            gap={scaledTokens.gapPx}
          />
          {qrVisible && qrSrc ? (
            <QrFooter
              tokens={scaledTokens}
              qrSrc={qrSrc}
              accentColor={colours.accent}
            />
          ) : null}
        </div>
      </div>
    );
  }

  if (layout === "split") {
    return (
      <div
        ref={canvasRef}
        data-export-root=""
        className={cn(
          "relative flex shrink-0 flex-col overflow-hidden",
          aspectClass,
          className,
        )}
        style={rootStyle}
      >
        <CanvasGrainOverlay opacity={scaledTokens.grainOpacity} />
        <div
          className="relative z-[2] flex min-h-0 flex-[1.2] flex-col"
          style={{ gap: scaledTokens.gapPx }}
        >
          <CanvasBrandHeader
            backgroundColor={colours.primary}
            localNumber={localNumber}
            subText={subText}
            fontFamily={scaledTokens.bodyFontFamily}
            logoMode={logoMode}
            showLocalLabel={showLocalLabel}
          />
          <CanvasTypeBlock
            tokens={scaledTokens}
            title={copy.message}
            ink={ink}
            accentColor={accent}
          />
        </div>
        <div
          className="relative z-[2] flex min-h-0 flex-1 flex-col justify-end"
          style={{ gap: scaledTokens.gapPx }}
        >
          {photoUrl ? (
            <div
              className="relative w-full overflow-hidden"
              style={{ flex: "0 0 28%", minHeight: 64 }}
            >
              <CanvasDuotonePhoto
                photoUrl={photoUrl}
                shadowColor={colours.primary}
                highlightColor={colours.accent}
                highlightOpacity={scaledTokens.duotoneHighlightOpacity}
                photoScale={photoScale}
              />
            </div>
          ) : null}
          <div
            className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between"
            style={{ gap: scaledTokens.gapPx }}
          >
            <MetaBlock
              copy={copy}
              ink={ink}
              fontSize={metaSize}
              gap={Math.max(6, scaledTokens.gapPx - 4)}
              className="min-w-0 flex-1"
            />
            {qrVisible && qrSrc ? (
              <QrFooter
                tokens={scaledTokens}
                qrSrc={qrSrc}
                accentColor={colours.accent}
                widthPercent={100}
              />
            ) : null}
          </div>
        </div>
      </div>
    );
  }

  /* stack — legacy default */
  return (
    <div
      ref={canvasRef}
        data-export-root=""
      className={cn(
        "relative flex shrink-0 flex-col justify-between overflow-hidden",
        aspectClass,
        className,
      )}
      style={rootStyle}
    >
      <CanvasGrainOverlay opacity={scaledTokens.grainOpacity} />
      <CanvasBrandHeader
        backgroundColor={colours.primary}
        localNumber={localNumber}
        subText={subText}
        fontFamily={scaledTokens.bodyFontFamily}
        logoMode={logoMode}
        showLocalLabel={showLocalLabel}
      />
      <CanvasTypeBlock
        tokens={scaledTokens}
        title={copy.message}
        ink={ink}
        accentColor={accent}
      />
      <div
        className="relative z-[2] flex flex-col"
        style={{ gap: scaledTokens.gapPx }}
      >
        <MetaBlock
          copy={copy}
          ink={ink}
          fontSize={metaSize}
          gap={scaledTokens.gapPx}
        />
        {qrVisible && qrSrc ? (
          <QrFooter
            tokens={scaledTokens}
            qrSrc={qrSrc}
            accentColor={colours.accent}
          />
        ) : null}
      </div>
    </div>
  );
}
