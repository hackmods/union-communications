"use client";

import type { CSSProperties, Ref } from "react";
import {
  CanvasBrandHeader,
  CanvasDuotonePhoto,
  CanvasGrainOverlay,
  CanvasQrPlate,
  CanvasStackSlot,
  CanvasTypeBlock,
} from "@/components/tools/canvas";
import type { FlyerLayoutId } from "@/lib/comms/flyer-layouts";
import type { BoardLogoMode } from "@/lib/constants/board-banner-ornaments";
import { pickContrastingInk } from "@/lib/utils/ink";
import { meetsWcagAA } from "@/lib/utils/contrast";
import type { CanvasTokens } from "@/lib/utils/canvas-tokens";
import { resolvePrintPageLayout } from "@/lib/utils/canvas-tokens";
import { canvasSurfaceStyle } from "@/lib/utils/canvas-surface";
import { cn, resolveLocalNumber } from "@/lib/utils";

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
  /** Fixed design width in CSS px (preview scales via CanvasWrapper). */
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
  /** When false, body is omitted (e.g. fitted into CanvasTypeBlock subtitle). */
  includeBody = true,
}: {
  copy: FlyerLayoutCopy;
  ink: string;
  fontSize: number;
  gap: number;
  className?: string;
  includeBody?: boolean;
}) {
  const rows: { label: string; value: string }[] = [];
  if (copy.date.trim()) rows.push({ label: copy.dateLabel, value: copy.date });
  if (copy.time.trim()) rows.push({ label: copy.timeLabel, value: copy.time });
  if (copy.location.trim())
    rows.push({ label: copy.locationLabel, value: copy.location });

  const body = includeBody ? copy.body.trim() : "";
  const contact = copy.contact.trim();

  if (rows.length === 0 && !body && !contact) return null;

  return (
    <div
      data-canvas-meta=""
      className={cn("relative z-[2] min-w-0 w-full", className)}
      style={{
        color: ink,
        fontSize,
        lineHeight: 1.35,
        display: "grid",
        gridTemplateColumns: "max-content minmax(0, 1fr)",
        columnGap: "0.4em",
        rowGap: gap,
        overflowWrap: "anywhere",
        wordBreak: "normal",
      }}
    >
      {body ? (
        <p style={{ margin: 0, gridColumn: "1 / -1" }}>{body}</p>
      ) : null}
      {rows.map((row) => (
        <div key={row.label} style={{ display: "contents" }}>
          <strong style={{ fontWeight: 700 }}>{row.label}:</strong>
          <span>{row.value}</span>
        </div>
      ))}
      {contact ? (
        <p style={{ margin: 0, gridColumn: "1 / -1" }}>{contact}</p>
      ) : null}
    </div>
  );
}

function QrFooter({
  tokens,
  qrSrc,
  accentColor,
  widthPercent = 28,
  maxWidthPx = 140,
}: {
  tokens: CanvasTokens;
  qrSrc: string;
  accentColor?: string;
  widthPercent?: number;
  maxWidthPx?: number;
}) {
  return (
    <div
      className="relative z-[2] shrink-0 self-center"
      style={{ width: `${widthPercent}%`, maxWidth: maxWidthPx }}
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
  const { tokens: scaledTokens, metaFontSizePx: metaSize } =
    resolvePrintPageLayout(tokens, designWidthPx, referenceWidthPx);
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
  const qrVisible = Boolean(showQr && qrSrc);
  const bodyText = copy.body.trim();
  const resolvedLocal = resolveLocalNumber(localNumber);
  const localLine = subText
    ? `Local ${resolvedLocal} - ${subText}`
    : `Local ${resolvedLocal}`;

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
    fontFamily: scaledTokens.bodyFontFamily,
    aspectRatio,
    display: "flex",
    flexDirection: "column",
    // Pack from the top — justify-between opens a dead band and clips contact.
    justifyContent: "flex-start",
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
          className="relative z-[2] flex min-h-0 shrink-0 flex-col"
          style={{
            backgroundColor: colours.secondary,
            color: bandInk,
            fontFamily: scaledTokens.bodyFontFamily,
            padding: scaledTokens.paddingPx,
            gap: scaledTokens.gapPx,
            maxHeight: "48%",
          }}
        >
          <CanvasBrandHeader
            backgroundColor={colours.secondary}
            localNumber={localNumber}
            subText={subText}
            fontFamily={scaledTokens.bodyFontFamily}
            logoMode={logoMode}
            showLocalLabel={showLocalLabel}
            logoSize="sm"
            className="max-w-full shrink-0 overflow-hidden"
          />
          <div className="min-h-0 w-full flex-1 overflow-hidden">
            <CanvasTypeBlock
              fit
              tokens={{
                ...scaledTokens,
                alignmentBias: "center",
              }}
              title={copy.message}
              subtitle={bodyText || undefined}
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
            gap={Math.max(6, Math.round(scaledTokens.gapPx * 0.65))}
            includeBody={false}
            className="shrink-0"
          />
          {qrVisible && qrSrc ? (
            <div className="mt-auto shrink-0">
              <QrFooter
                tokens={scaledTokens}
                qrSrc={qrSrc}
                accentColor={colours.accent}
              />
            </div>
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
          className="relative z-[2] flex min-h-0 flex-1 flex-col"
          style={{ gap: scaledTokens.gapPx }}
        >
          <CanvasBrandHeader
            backgroundColor={colours.primary}
            localNumber={localNumber}
            subText={subText}
            fontFamily={scaledTokens.bodyFontFamily}
            logoMode={logoMode}
            showLocalLabel={showLocalLabel}
            logoSize="sm"
            className="max-w-full shrink-0 overflow-hidden"
          />
          <CanvasStackSlot className="min-h-[32%]">
            <CanvasTypeBlock
              fit
              tokens={scaledTokens}
              title={copy.message}
              subtitle={bodyText || undefined}
              ink={ink}
              accentColor={accent}
            />
          </CanvasStackSlot>
          <div
            className="relative z-[2] flex shrink-0 flex-col"
            style={{ gap: scaledTokens.gapPx }}
          >
            <MetaBlock
              copy={copy}
              ink={ink}
              fontSize={metaSize}
              gap={scaledTokens.gapPx}
              includeBody={false}
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
      </div>
    );
  }

  if (layout === "split") {
    // Half-letter walkabout: lockup + local label used to eat the type budget
    // so the headline squashed and body/meta clipped ("Your"). Logo only in
    // header; local line lives with meta; type slot gets the remaining height.
    const narrowSheet = designWidthPx < referenceWidthPx * 0.85;
    const footerMetaSize = narrowSheet
      ? Math.max(9, metaSize - 2)
      : metaSize;
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
          className="relative z-[2] flex min-h-0 flex-1 flex-col overflow-hidden"
          style={{ gap: scaledTokens.gapPx }}
        >
          <CanvasBrandHeader
            backgroundColor={colours.primary}
            localNumber={localNumber}
            subText={subText}
            fontFamily={scaledTokens.bodyFontFamily}
            logoMode={logoMode}
            showLocalLabel={false}
            logoSize="sm"
            className="max-w-[70%] shrink-0 overflow-hidden"
          />
          <CanvasStackSlot className="min-h-[42%] justify-start">
            <CanvasTypeBlock
              fit
              tokens={scaledTokens}
              title={copy.message}
              subtitle={bodyText || undefined}
              ink={ink}
              accentColor={accent}
            />
          </CanvasStackSlot>
        </div>
        <div
          className="relative z-[2] flex shrink-0 flex-col"
          style={{ gap: Math.max(4, scaledTokens.gapPx - 2) }}
        >
          <MetaBlock
            copy={copy}
            ink={ink}
            fontSize={footerMetaSize}
            gap={Math.max(3, scaledTokens.gapPx - 4)}
            includeBody={false}
          />
          {showLocalLabel ? (
            <p
              data-canvas-meta=""
              className="font-bold uppercase tracking-wide"
              style={{
                color: ink,
                fontSize: Math.max(8, footerMetaSize - 1),
                lineHeight: 1.2,
                margin: 0,
                opacity: 0.85,
                fontFamily: scaledTokens.bodyFontFamily,
                overflowWrap: "anywhere",
              }}
            >
              {localLine}
            </p>
          ) : null}
          {qrVisible && qrSrc ? (
            <QrFooter
              tokens={scaledTokens}
              qrSrc={qrSrc}
              accentColor={colours.accent}
              widthPercent={narrowSheet ? 24 : 28}
              maxWidthPx={narrowSheet ? 64 : 140}
            />
          ) : null}
        </div>
      </div>
    );
  }

  /* stack — letter meeting / rally */
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
      <CanvasBrandHeader
        backgroundColor={colours.primary}
        localNumber={localNumber}
        subText={subText}
        fontFamily={scaledTokens.bodyFontFamily}
        logoMode={logoMode}
        showLocalLabel={showLocalLabel}
        logoSize="sm"
        className="max-w-full shrink-0 overflow-hidden"
      />
      <CanvasStackSlot className="min-h-[36%]">
        <CanvasTypeBlock
          fit
          tokens={scaledTokens}
          title={copy.message}
          subtitle={bodyText || undefined}
          ink={ink}
          accentColor={accent}
        />
      </CanvasStackSlot>
      <div
        className="relative z-[2] flex shrink-0 flex-col"
        style={{ gap: scaledTokens.gapPx }}
      >
        <MetaBlock
          copy={copy}
          ink={ink}
          fontSize={metaSize}
          gap={scaledTokens.gapPx}
          includeBody={false}
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
