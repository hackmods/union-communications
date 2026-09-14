"use client";

import type { CSSProperties, Ref } from "react";
import {
  CanvasBrandHeader,
  CanvasGrainOverlay,
  CanvasStackSlot,
  CanvasTypeBlock,
} from "@/components/tools/canvas";
import type { BoardNoticeLayoutId } from "@/lib/comms/board-notice-layouts";
import type { BoardLogoMode } from "@/lib/constants/board-banner-ornaments";
import { pickContrastingInk, mutedInkOnBackground } from "@/lib/utils/ink";
import { meetsWcagAA } from "@/lib/utils/contrast";
import type { CanvasTokens } from "@/lib/utils/canvas-tokens";
import { resolvePrintPageLayout } from "@/lib/utils/canvas-tokens";
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
  /** Fixed design width in CSS px (preview scales via MobilePreviewStage). */
  designWidthPx: number;
  /** Fixed design height in CSS px — must match letter/tabloid aspect. */
  designHeightPx: number;
  /** Reference width for typography scaling (letter preview width). */
  referenceWidthPx: number;
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
      data-canvas-meta=""
      className={cn("relative z-[2] min-w-0 w-full", className)}
      style={{
        color: ink,
        fontSize,
        lineHeight: 1.35,
        fontFamily,
        display: "grid",
        gridTemplateColumns: "max-content minmax(0, 1fr)",
        columnGap: "0.4em",
        rowGap: gap,
        // Keep long locations on the usable column — never clip mid-word.
        overflowWrap: "anywhere",
        wordBreak: "normal",
      }}
    >
      {rows.map((row) => (
        <div key={row.label} style={{ display: "contents" }}>
          <strong style={{ fontWeight: 700 }}>{row.label}:</strong>
          <span>{row.value}</span>
        </div>
      ))}
      {copy.contact.trim() ? (
        <p
          style={{
            margin: 0,
            marginTop: Math.max(2, Math.round(gap * 0.5)),
            gridColumn: "1 / -1",
            fontSize: Math.max(11, fontSize - 1),
            color: mutedInkOnBackground(backgroundColor, 0.9),
            overflowWrap: "anywhere",
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
  designWidthPx,
  designHeightPx,
  referenceWidthPx,
  aspectClass,
  aspectRatio,
  logoMode = "lockup",
  showLocalLabel = true,
  className,
  style,
  canvasRef,
}: BoardNoticeLayoutCanvasProps) {
  const { tokens: scaledTokens, metaFontSizePx: metaSize } =
    resolvePrintPageLayout(tokens, designWidthPx, referenceWidthPx);
  const padPx = scaledTokens.paddingPx;
  const gapPx = scaledTokens.gapPx;
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

  const canvasBoxStyle: CSSProperties = {
    width: designWidthPx,
    height: designHeightPx,
    // No maxWidth: 100% — parent CanvasWrapper scales uniformly (CANVAS-004).
    flexShrink: 0,
    containerType: "size",
    containerName: "unionops-canvas",
  };

  const rootStyle: CSSProperties = {
    ...surfaceStyle,
    ...canvasBoxStyle,
    color: ink,
    aspectRatio,
    display: "flex",
    flexDirection: "column",
    // Pack from the top — justify-between left a dead band above meta and
    // pushed contact into overflow:hidden.
    justifyContent: "flex-start",
    overflow: "hidden",
    boxSizing: "border-box",
    padding: padPx,
    gap: gapPx,
    fontFamily: scaledTokens.bodyFontFamily,
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
          "relative flex flex-col overflow-hidden",
          aspectClass,
          className,
        )}
        style={{
          backgroundColor: panelBg,
          color: panelInk,
          aspectRatio,
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
          boxSizing: "border-box",
          fontFamily: scaledTokens.bodyFontFamily,
          ...canvasBoxStyle,
          ...style,
        }}
      >
        <CanvasGrainOverlay opacity={scaledTokens.grainOpacity} />
        <div
          className="relative z-[2] flex flex-col"
          style={{
            backgroundColor: colours.secondary,
            color: bandInk,
            padding: padPx,
            gap: gapPx,
            flex: "0 0 auto",
          }}
        >
          <CanvasBrandHeader
            backgroundColor={colours.secondary}
            localNumber={localNumber}
            subText={subText}
            fontFamily={scaledTokens.bodyFontFamily}
            logoMode={logoMode}
            showLocalLabel={showLocalLabel}
            badge={
              <NoticeTypeBadge
                label={copy.noticeTypeLabel}
                backgroundColor={colours.secondary}
                fontFamily={scaledTokens.bodyFontFamily}
                fontSizePx={metaSize}
              />
            }
          />
          <div className="max-h-[42%] min-h-0 w-full overflow-hidden">
            <CanvasTypeBlock
              fit
              tokens={{
                ...scaledTokens,
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
        </div>
        <div
          className="relative z-[2] flex min-h-0 flex-1 flex-col"
          style={{
            padding: padPx,
            gap: gapPx,
            backgroundColor: panelBg,
            color: panelInk,
          }}
        >
          {copy.body.trim() ? (
            <div className="min-h-0 flex-1 overflow-hidden">
              <p
                style={{
                  color: panelInk,
                  fontSize: Math.min(
                    scaledTokens.subtitleFontSizePx,
                    Math.round(designWidthPx * 0.032),
                  ),
                  fontWeight: scaledTokens.bodyFontWeight,
                  lineHeight: scaledTokens.bodyLineHeight,
                  margin: 0,
                  opacity: 0.9,
                  fontFamily: scaledTokens.bodyFontFamily,
                }}
              >
                {copy.body}
              </p>
            </div>
          ) : null}
          <MetaBlock
            copy={copy}
            ink={panelInk}
            fontSize={metaSize}
            gap={Math.max(6, Math.round(gapPx * 0.65))}
            backgroundColor={panelBg}
            fontFamily={scaledTokens.bodyFontFamily}
            className="shrink-0"
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
          "relative flex flex-col overflow-hidden",
          aspectClass,
          className,
        )}
        style={rootStyle}
      >
        <CanvasGrainOverlay opacity={scaledTokens.grainOpacity} />
        <div
          className="relative z-[2] flex min-h-0 flex-[1.2] flex-col"
          style={{ gap: gapPx }}
        >
          <CanvasBrandHeader
            backgroundColor={colours.primary}
            localNumber={localNumber}
            subText={subText}
            fontFamily={scaledTokens.bodyFontFamily}
            logoMode={logoMode}
            showLocalLabel={showLocalLabel}
            badge={
              <NoticeTypeBadge
                label={copy.noticeTypeLabel}
                backgroundColor={colours.primary}
                fontFamily={scaledTokens.bodyFontFamily}
                fontSizePx={metaSize}
              />
            }
          />
          <CanvasStackSlot>
            <CanvasTypeBlock
              fit
              tokens={scaledTokens}
              title={copy.headline}
              subtitle={copy.body}
              ink={ink}
              accentColor={accent}
            />
          </CanvasStackSlot>
        </div>
        <div
          className="relative z-[2] flex min-h-0 shrink-0 flex-col"
          style={{
            gap: gapPx,
            backgroundColor: colours.secondary,
            color: pickContrastingInk(colours.secondary),
            marginInline: -padPx,
            marginBottom: -padPx,
            padding: padPx,
          }}
        >
          <MetaBlock
            copy={copy}
            ink={pickContrastingInk(colours.secondary)}
            fontSize={metaSize}
            gap={Math.max(6, Math.round(gapPx * 0.65))}
            backgroundColor={colours.secondary}
            fontFamily={scaledTokens.bodyFontFamily}
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
        "relative flex flex-col overflow-hidden",
        aspectClass,
        className,
      )}
      style={rootStyle}
    >
      <CanvasGrainOverlay opacity={scaledTokens.grainOpacity} />
      <div className="relative z-[2] shrink-0">
        <CanvasBrandHeader
          backgroundColor={colours.primary}
          localNumber={localNumber}
          subText={subText}
          fontFamily={scaledTokens.bodyFontFamily}
          logoMode={logoMode}
          showLocalLabel={showLocalLabel}
          badge={
            <NoticeTypeBadge
              label={copy.noticeTypeLabel}
              backgroundColor={colours.primary}
              fontFamily={scaledTokens.bodyFontFamily}
              fontSizePx={metaSize}
            />
          }
        />
      </div>
      <CanvasStackSlot className="justify-start">
        <CanvasTypeBlock
          fit
          tokens={scaledTokens}
          title={copy.headline}
          subtitle={copy.body}
          ink={ink}
          accentColor={accent}
        />
      </CanvasStackSlot>
      <MetaBlock
        copy={copy}
        ink={ink}
        fontSize={metaSize}
        gap={Math.max(6, Math.round(gapPx * 0.65))}
        backgroundColor={colours.primary}
        fontFamily={scaledTokens.bodyFontFamily}
        className="relative z-[2] shrink-0"
      />
    </div>
  );
}
