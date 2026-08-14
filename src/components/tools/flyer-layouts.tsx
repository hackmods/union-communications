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
import { pickContrastingInk } from "@/lib/utils/ink";
import { meetsWcagAA } from "@/lib/utils/contrast";
import type { CanvasTokens } from "@/lib/utils/canvas-tokens";
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
  fontFamily: string;
  aspectClass: string;
  photoUrl?: string;
  photoScale?: number;
  qrSrc?: string | null;
  showQr?: boolean;
  className?: string;
  style?: CSSProperties;
  /** Forwarded to the capture root (canvasRef target). */
  canvasRef?: Ref<HTMLDivElement>;
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
  fontFamily,
  aspectClass,
  photoUrl,
  photoScale = 1,
  qrSrc,
  showQr = false,
  className,
  style,
  canvasRef,
}: FlyerLayoutCanvasProps) {
  const ink = pickContrastingInk(colours.primary);
  const surfaceStyle = canvasSurfaceStyle(tokens, {
    primary: colours.primary,
    secondary: colours.secondary,
    accent: colours.accent,
  });
  const accent = accentRuleColor(
    colours.primary,
    colours.accent,
    colours.secondary,
  );
  const metaSize = tokens.subtitleFontSizePx + 4;
  const qrVisible = Boolean(showQr && qrSrc);

  const rootStyle: CSSProperties = {
    ...surfaceStyle,
    color: ink,
    fontFamily,
    padding: tokens.paddingPx,
    gap: tokens.gapPx,
    ...style,
  };

  if (layout === "band") {
    const bandInk = pickContrastingInk(colours.secondary);
    const panelBg = colours.primary;
    const panelInk = ink;
    return (
      <div
        ref={canvasRef}
        className={cn(
          "relative flex w-full flex-col overflow-hidden",
          aspectClass,
          className,
        )}
        style={{
          backgroundColor: panelBg,
          color: panelInk,
          fontFamily,
          ...style,
        }}
      >
        <CanvasGrainOverlay opacity={tokens.grainOpacity} />
        <div
          className="relative z-[2] flex flex-col"
          style={{
            backgroundColor: colours.secondary,
            color: bandInk,
            padding: tokens.paddingPx,
            gap: tokens.gapPx,
            flex: "0 0 auto",
          }}
        >
          <CanvasBrandHeader
            backgroundColor={colours.secondary}
            localNumber={localNumber}
            subText={subText}
          />
          <CanvasTypeBlock
            tokens={{
              ...tokens,
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
            padding: tokens.paddingPx,
            gap: tokens.gapPx,
            backgroundColor: panelBg,
            color: panelInk,
          }}
        >
          <MetaBlock
            copy={copy}
            ink={panelInk}
            fontSize={metaSize}
            gap={tokens.gapPx}
          />
          {qrVisible && qrSrc ? (
            <QrFooter
              tokens={tokens}
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
        className={cn(
          "relative flex w-full flex-col overflow-hidden",
          aspectClass,
          className,
        )}
        style={rootStyle}
      >
        <CanvasGrainOverlay opacity={tokens.grainOpacity} />
        <div
          className="relative z-[1] w-full shrink-0 overflow-hidden"
          style={{ flex: "0 0 38%", minHeight: 80 }}
        >
          {photoUrl ? (
            <CanvasDuotonePhoto
              photoUrl={photoUrl}
              shadowColor={colours.primary}
              highlightColor={colours.accent}
              highlightOpacity={tokens.duotoneHighlightOpacity}
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
          style={{ gap: tokens.gapPx }}
        >
          <CanvasBrandHeader
            backgroundColor={colours.primary}
            localNumber={localNumber}
            subText={subText}
          />
          <CanvasTypeBlock
            tokens={tokens}
            title={copy.message}
            ink={ink}
            accentColor={accent}
          />
          <MetaBlock
            copy={copy}
            ink={ink}
            fontSize={metaSize}
            gap={tokens.gapPx}
          />
          {qrVisible && qrSrc ? (
            <QrFooter
              tokens={tokens}
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
        className={cn(
          "relative flex w-full flex-col overflow-hidden",
          aspectClass,
          className,
        )}
        style={rootStyle}
      >
        <CanvasGrainOverlay opacity={tokens.grainOpacity} />
        <div
          className="relative z-[2] flex min-h-0 flex-[1.2] flex-col"
          style={{ gap: tokens.gapPx }}
        >
          <CanvasBrandHeader
            backgroundColor={colours.primary}
            localNumber={localNumber}
            subText={subText}
          />
          <CanvasTypeBlock
            tokens={tokens}
            title={copy.message}
            ink={ink}
            accentColor={accent}
          />
        </div>
        <div
          className="relative z-[2] flex min-h-0 flex-1 flex-col justify-end"
          style={{ gap: tokens.gapPx }}
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
                highlightOpacity={tokens.duotoneHighlightOpacity}
                photoScale={photoScale}
              />
            </div>
          ) : null}
          <div
            className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between"
            style={{ gap: tokens.gapPx }}
          >
            <MetaBlock
              copy={copy}
              ink={ink}
              fontSize={metaSize}
              gap={Math.max(6, tokens.gapPx - 4)}
              className="min-w-0 flex-1"
            />
            {qrVisible && qrSrc ? (
              <QrFooter
                tokens={tokens}
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
      className={cn(
        "relative flex w-full flex-col justify-between overflow-hidden",
        aspectClass,
        className,
      )}
      style={rootStyle}
    >
      <CanvasGrainOverlay opacity={tokens.grainOpacity} />
      <CanvasBrandHeader
        backgroundColor={colours.primary}
        localNumber={localNumber}
        subText={subText}
      />
      <CanvasTypeBlock
        tokens={tokens}
        title={copy.message}
        ink={ink}
        accentColor={accent}
      />
      <div
        className="relative z-[2] flex flex-col"
        style={{ gap: tokens.gapPx }}
      >
        <MetaBlock
          copy={copy}
          ink={ink}
          fontSize={metaSize}
          gap={tokens.gapPx}
        />
        {qrVisible && qrSrc ? (
          <QrFooter
            tokens={tokens}
            qrSrc={qrSrc}
            accentColor={colours.accent}
          />
        ) : null}
      </div>
    </div>
  );
}
