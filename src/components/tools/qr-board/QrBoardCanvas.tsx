"use client";

import type { CSSProperties, Ref } from "react";
import { BrandLogo } from "@/components/brand/BrandLogo";
import {
  QR_BOARD_FORMATS,
  qrBoardGridColumns,
  type QrBoardFormatId,
} from "@/lib/constants/qr-board-formats";
import { CANVAS_PLACEHOLDER_INK } from "@/lib/constants/brand";
import {
  canvasAccentStripColor,
  mutedInkOnBackground,
  pickContrastingInk,
} from "@/lib/utils/ink";
import type { CanvasTokens } from "@/lib/utils/canvas-tokens";
import {
  contentPaddingPx,
  flexAlignFromBias,
  textAlignFromBias,
  typeScaleFactor,
} from "@/lib/utils/canvas-tokens";
import { CanvasGrainOverlay, CanvasQrPlate, CanvasUrlCaption } from "@/components/tools/canvas";
import { canvasSurfaceStyle } from "@/lib/utils/canvas-surface";
import { boardUrlFontSizePx } from "@/lib/utils/canvas-url";

export interface QrBoardCanvasSlot {
  id: string;
  title: string;
  destination: string;
  qrSrc: string | null;
}

export interface QrBoardCanvasProps {
  canvasRef: Ref<HTMLDivElement>;
  formatId: QrBoardFormatId;
  posterTitle: string;
  posterSubtitle: string;
  slots: QrBoardCanvasSlot[];
  showUrl: boolean;
  includeBranding: boolean;
  primaryColor: string;
  secondaryColor: string;
  localLabel: string;
  qrPlaceholder: string;
  tokens?: CanvasTokens;
}

export function QrBoardCanvas({
  canvasRef,
  formatId,
  posterTitle,
  posterSubtitle,
  slots,
  showUrl,
  includeBranding,
  primaryColor,
  secondaryColor,
  localLabel,
  qrPlaceholder,
  tokens,
}: QrBoardCanvasProps) {
  const format = QR_BOARD_FORMATS[formatId];
  const ink = pickContrastingInk(primaryColor);
  const muted = mutedInkOnBackground(primaryColor, 0.85);
  const stripColor = canvasAccentStripColor(primaryColor, secondaryColor);
  const columns = qrBoardGridColumns(slots.length);
  const isTabloid = formatId === "tabloid";
  const isDense = slots.length >= 6;
  const grainOpacity = tokens?.grainOpacity ?? 0;
  const scale = tokens ? typeScaleFactor(tokens) : 1;
  const boardPad = tokens
    ? contentPaddingPx(tokens, { factor: isTabloid ? 0.75 : 0.55 })
    : isTabloid
      ? 28
      : 20;
  const headerAlign = tokens
    ? flexAlignFromBias(tokens.alignmentBias)
    : "center";
  const headerTextAlign = tokens
    ? textAlignFromBias(tokens.alignmentBias)
    : "center";
  const titleFontPx = Math.round(
    (isTabloid ? (isDense ? 28 : 34) : isDense ? 18 : 22) * scale,
  );
  const subtitleFontPx = Math.round(
    (isTabloid ? 15 : 13) * scale * (tokens ? 1 : 1),
  );
  const cellTitleFontPx = Math.round(
    (isTabloid ? (isDense ? 14 : 16) : isDense ? 11 : 13) * scale,
  );
  const urlFontPx = boardUrlFontSizePx({ isTabloid, isDense, typeScale: scale });
  const plateMax = isTabloid
    ? isDense
      ? "min(70%, 160px)"
      : "min(72%, 180px)"
    : isDense
      ? "min(68%, 120px)"
      : "min(72%, 140px)";

  const surface = tokens
    ? canvasSurfaceStyle(tokens, {
        primary: primaryColor,
        secondary: secondaryColor,
        accent: secondaryColor,
      })
    : { backgroundColor: primaryColor };
  const style: CSSProperties = {
    aspectRatio: `${format.widthInches} / ${format.heightInches}`,
    ...surface,
    color: ink,
    width: format.previewWidthPx,
    maxWidth: "100%",
  };

  return (
    <div
      ref={canvasRef}
      data-export-root=""
      className="relative flex h-full flex-col overflow-hidden"
      style={style}
    >
      <CanvasGrainOverlay opacity={grainOpacity} />
      <div
        className="relative z-[2]"
        style={{
          height: isTabloid ? 10 : 8,
          backgroundColor: stripColor,
          flexShrink: 0,
        }}
        aria-hidden
      />

      <div
        className="relative z-[2] flex flex-1 flex-col"
        style={{
          padding: boardPad,
          minHeight: 0,
          gap: tokens?.gapPx ?? (isTabloid ? 16 : 12),
        }}
      >
        <header
          className="flex shrink-0 flex-col"
          style={{
            alignItems: headerAlign,
            textAlign: headerTextAlign,
            marginBottom: isTabloid ? 8 : 4,
          }}
        >
          {includeBranding ? (
            <div style={{ marginBottom: isTabloid ? 12 : 8 }}>
              <BrandLogo
                size={isTabloid ? "md" : "sm"}
                backgroundColor={primaryColor}
              />
            </div>
          ) : null}
          <h2
            className="font-bold leading-tight tracking-tight"
            style={{
              color: ink,
              margin: 0,
              fontSize: titleFontPx,
              fontWeight: tokens?.titleFontWeight,
              letterSpacing: tokens?.titleLetterSpacing,
              textTransform: tokens?.titleTextTransform,
            }}
          >
            {posterTitle || "\u00a0"}
          </h2>
          {posterSubtitle.trim() ? (
            <p
              style={{
                color: muted,
                margin: isTabloid ? "8px 0 0" : "6px 0 0",
                maxWidth: "36em",
                fontSize: subtitleFontPx,
              }}
            >
              {posterSubtitle}
            </p>
          ) : null}
        </header>

        <div
          className="grid min-h-0 flex-1"
          style={{
            gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))`,
            gridAutoRows: "1fr",
            gap: isTabloid ? (isDense ? 18 : 24) : isDense ? 12 : 16,
          }}
        >
          {slots.map((slot) => (
            <div
              key={slot.id}
              className="flex min-h-0 flex-col items-center text-center"
              style={{ gap: isTabloid ? 8 : 6 }}
            >
              <p
                className="shrink-0 font-semibold leading-snug"
                style={{
                  color: ink,
                  margin: 0,
                  width: "100%",
                  wordBreak: "break-word",
                  fontSize: cellTitleFontPx,
                }}
              >
                {slot.title.trim() || "\u00a0"}
              </p>
              {/*
                Absolute slot keeps the plate inside leftover cell height.
                URL stays a shrink-0 sibling below so captions never sit under
                the white-card chrome.
              */}
              <div
                data-qr-slot=""
                className="relative min-h-0 w-full flex-1 overflow-hidden"
                style={{ minHeight: isTabloid ? (isDense ? 88 : 110) : isDense ? 64 : 80 }}
              >
                <div className="absolute inset-0 flex items-center justify-center p-0.5">
                  {tokens ? (
                    <div
                      style={{
                        width: plateMax,
                        height: plateMax,
                        maxWidth: "100%",
                        maxHeight: "100%",
                      }}
                    >
                      <CanvasQrPlate
                        tokens={tokens}
                        qrSrc={slot.qrSrc}
                        alt=""
                        accentColor={secondaryColor}
                        className="h-full w-full"
                      />
                    </div>
                  ) : slot.qrSrc ? (
                    // eslint-disable-next-line @next/next/no-img-element -- data URL from qrcode
                    <img
                      src={slot.qrSrc}
                      alt=""
                      style={{
                        display: "block",
                        backgroundColor: "#FFFFFF",
                        padding: isTabloid ? 10 : 7,
                        boxSizing: "border-box",
                        maxWidth: plateMax,
                        maxHeight: "100%",
                        width: "auto",
                        height: "auto",
                        objectFit: "contain",
                      }}
                    />
                  ) : (
                    <div
                      style={{
                        backgroundColor: "#FFFFFF",
                        padding: isTabloid ? 10 : 7,
                        boxSizing: "border-box",
                        maxWidth: plateMax,
                        maxHeight: "100%",
                        height: "min(100%, 180px)",
                        aspectRatio: "1",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      <span
                        style={{
                          color: CANVAS_PLACEHOLDER_INK,
                          fontSize: isTabloid ? 12 : 10,
                          padding: 4,
                        }}
                      >
                        {qrPlaceholder}
                      </span>
                    </div>
                  )}
                </div>
              </div>
              {showUrl && slot.destination.trim() ? (
                <CanvasUrlCaption
                  url={slot.destination}
                  color={muted}
                  fontSizePx={urlFontPx}
                  textAlign="center"
                  maxLines={2}
                  className="pt-0.5"
                />
              ) : null}
            </div>
          ))}
        </div>

        {includeBranding ? (
          <p
            className="shrink-0 text-center font-medium"
            style={{
              color: muted,
              margin: isTabloid ? "16px 0 0" : "12px 0 0",
              fontSize: isTabloid ? 14 : 11,
            }}
          >
            {localLabel}
          </p>
        ) : null}
      </div>
    </div>
  );
}
