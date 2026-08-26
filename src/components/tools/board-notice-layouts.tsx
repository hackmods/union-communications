"use client";

import type { CSSProperties, ReactNode, Ref } from "react";
import {
  CanvasBrandHeader,
  CanvasGrainOverlay,
  CanvasTypeBlock,
} from "@/components/tools/canvas";
import type { BoardNoticeLayoutId } from "@/lib/comms/board-notice-layouts";
import type { BoardLogoMode } from "@/lib/constants/board-banner-ornaments";
import { pickContrastingInk, mutedInkOnBackground } from "@/lib/utils/ink";
import { meetsWcagAA } from "@/lib/utils/contrast";
import type { CanvasTokens } from "@/lib/utils/canvas-tokens";
import { canvasSurfaceStyle } from "@/lib/utils/canvas-surface";
import { cn } from "@/lib/utils";

export interface BoardNoticeLayoutCopy {
  headline: string;
  body: string;
  date: string;
  time: string;
  location: string;
  contact: string;
  quorumNeeded?: string;
  noticeTypeLabel: string;
  dateLabel: string;
  timeLabel: string;
  locationLabel: string;
  quorumLabel?: string;
}

export interface BoardNoticeLayoutColors {
  primary: string;
  accent: string;
  secondary: string;
}

export interface BoardNoticeLayoutCanvasProps {
  layout: BoardNoticeLayoutId;
  tokens: CanvasTokens;
  colours: BoardNoticeLayoutColors;
  copy: BoardNoticeLayoutCopy;
  localNumber: string;
  subText: string;
  aspectClass: string;
  /** Inline aspect-ratio for capture-safe export (e.g. `"8.5 / 11"`). */
  aspectRatio: string;
  logoMode?: BoardLogoMode;
  showLocalLabel?: boolean;
  className?: string;
  style?: CSSProperties;
  canvasRef?: Ref<HTMLDivElement>;
}

function NoticeTypeBadge({
  label,
  backgroundColor,
  fontFamily,
  fontSizePx,
}: {
  label: string;
  backgroundColor: string;
  fontFamily?: string;
  fontSizePx: number;
}) {
  return (
    <p
      className="mt-2 uppercase"
      style={{
        color: mutedInkOnBackground(backgroundColor, 0.8),
        fontSize: Math.max(10, Math.round(fontSizePx * 0.85)),
        fontFamily,
        margin: 0,
      }}
    >
      {label}
    </p>
  );
}

function MetaBlock({
  copy,
  ink,
  fontSize,
  gap,
  backgroundColor,
  fontFamily,
  className,
}: {
  copy: BoardNoticeLayoutCopy;
  ink: string;
  fontSize: number;
  gap: number;
  backgroundColor: string;
  fontFamily?: string;
  className?: string;
}) {
  const rows: { label: string; value: string }[] = [];
  if (copy.date.trim()) rows.push({ label: copy.dateLabel, value: copy.date });
  if (copy.time.trim()) rows.push({ label: copy.timeLabel, value: copy.time });
  if (copy.location.trim()) {
    rows.push({ label: copy.locationLabel, value: copy.location });
  }
  if (copy.quorumNeeded?.trim() && copy.quorumLabel) {
    rows.push({ label: copy.quorumLabel, value: copy.quorumNeeded });
  }

  return (
    <div
      className={cn("relative z-[2] flex flex-col", className)}
      style={{
        color: ink,
        fontSize,
        lineHeight: 1.4,
        gap,
        fontFamily,
      }}
    >
      {rows.map((row) => (
        <p key={row.label} style={{ margin: 0 }}>
          <strong>{row.label}:</strong> {row.value}
        </p>
      ))}
      {copy.contact.trim() ? (
        <p
          style={{
            margin: 0,
            marginTop: gap,
            fontSize: Math.max(10, fontSize - 2),
            color: mutedInkOnBackground(backgroundColor, 0.9),
          }}
        >
          {copy.contact}
        </p>
      ) : null}
    </div>
  );
}

function accentRuleColor(
  primary: string,
  accent: string,
  secondary: string,
): string | undefined {
  if (secondary !== primary) return secondary;
  return meetsWcagAA(accent, primary, true) ? accent : undefined;
}

function headerBadge(
  copy: BoardNoticeLayoutCopy,
  backgroundColor: string,
  tokens: CanvasTokens,
): ReactNode {
  return (
    <NoticeTypeBadge
      label={copy.noticeTypeLabel}
      backgroundColor={backgroundColor}
      fontFamily={tokens.bodyFontFamily}
      fontSizePx={tokens.subtitleFontSizePx}
    />
  );
}

/**
 * Capture-safe board notice canvas. Shadows must stay on a parent outside canvasRef.
 */
export function BoardNoticeLayoutCanvas({
  layout,
  tokens,
  colours,
  copy,
  localNumber,
  subText,
  aspectClass,
  aspectRatio,
  logoMode = "lockup",
  showLocalLabel = true,
  className,
  style,
  canvasRef,
}: BoardNoticeLayoutCanvasProps) {
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
  const metaSize = tokens.subtitleFontSizePx + 6;

  const rootStyle: CSSProperties = {
    ...surfaceStyle,
    color: ink,
    aspectRatio,
    display: "flex",
    flexDirection: "column",
    width: "100%",
    overflow: "hidden",
    boxSizing: "border-box",
    padding: tokens.paddingPx,
    gap: tokens.gapPx,
    fontFamily: tokens.bodyFontFamily,
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
          "relative flex w-full flex-col overflow-hidden",
          aspectClass,
          className,
        )}
        style={{
          backgroundColor: panelBg,
          color: panelInk,
          aspectRatio,
          display: "flex",
          flexDirection: "column",
          width: "100%",
          overflow: "hidden",
          boxSizing: "border-box",
          fontFamily: tokens.bodyFontFamily,
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
            fontFamily={tokens.bodyFontFamily}
            logoMode={logoMode}
            showLocalLabel={showLocalLabel}
            badge={headerBadge(copy, colours.secondary, tokens)}
          />
          <CanvasTypeBlock
            tokens={{
              ...tokens,
              alignmentBias: "center",
            }}
            title={copy.headline}
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
          {copy.body.trim() ? (
            <p
              style={{
                color: panelInk,
                fontSize: tokens.subtitleFontSizePx,
                fontWeight: tokens.bodyFontWeight,
                lineHeight: tokens.bodyLineHeight,
                margin: 0,
                opacity: 0.9,
                fontFamily: tokens.bodyFontFamily,
              }}
            >
              {copy.body}
            </p>
          ) : null}
          <MetaBlock
            copy={copy}
            ink={panelInk}
            fontSize={metaSize}
            gap={tokens.gapPx}
            backgroundColor={panelBg}
            fontFamily={tokens.bodyFontFamily}
          />
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
            fontFamily={tokens.bodyFontFamily}
            logoMode={logoMode}
            showLocalLabel={showLocalLabel}
            badge={headerBadge(copy, colours.primary, tokens)}
          />
          <CanvasTypeBlock
            tokens={tokens}
            title={copy.headline}
            subtitle={copy.body}
            ink={ink}
            accentColor={accent}
          />
        </div>
        <div
          className="relative z-[2] flex min-h-0 flex-1 flex-col justify-end"
          style={{
            gap: tokens.gapPx,
            backgroundColor: colours.secondary,
            color: pickContrastingInk(colours.secondary),
            marginInline: -tokens.paddingPx,
            marginBottom: -tokens.paddingPx,
            padding: tokens.paddingPx,
          }}
        >
          <MetaBlock
            copy={copy}
            ink={pickContrastingInk(colours.secondary)}
            fontSize={metaSize}
            gap={Math.max(6, tokens.gapPx - 4)}
            backgroundColor={colours.secondary}
            fontFamily={tokens.bodyFontFamily}
          />
        </div>
      </div>
    );
  }

  /* stack — default */
  return (
    <div
      ref={canvasRef}
      data-export-root=""
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
        fontFamily={tokens.bodyFontFamily}
        logoMode={logoMode}
        showLocalLabel={showLocalLabel}
        badge={headerBadge(copy, colours.primary, tokens)}
      />
      <CanvasTypeBlock
        tokens={tokens}
        title={copy.headline}
        subtitle={copy.body}
        ink={ink}
        accentColor={accent}
      />
      <MetaBlock
        copy={copy}
        ink={ink}
        fontSize={metaSize}
        gap={tokens.gapPx}
        backgroundColor={colours.primary}
        fontFamily={tokens.bodyFontFamily}
      />
    </div>
  );
}
