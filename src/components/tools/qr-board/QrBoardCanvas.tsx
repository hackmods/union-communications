"use client";

import { type CSSProperties, type Ref } from "react";
import { BrandLogo } from "@/components/brand/BrandLogo";
import type { BoardLogoMode } from "@/lib/constants/board-banner-ornaments";
import {
  resolveLogoVariant,
  showCanvasLogo,
} from "@/lib/comms/canvas-logo-mode";
import { FitWidthFrame } from "@/components/tools/FitWidthFrame";
import {
  QR_BOARD_FORMATS,
  qrBoardChrome,
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
  flexAlignFromBias,
  textAlignFromBias,
  typeScaleFactor,
} from "@/lib/utils/canvas-tokens";
import { CanvasGrainOverlay, CanvasQrPlate, CanvasUrlCaption } from "@/components/tools/canvas";
import { canvasSurfaceStyle } from "@/lib/utils/canvas-surface";

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
  logoMode: BoardLogoMode;
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
  logoMode,
  primaryColor,
  secondaryColor,
  localLabel,
  qrPlaceholder,
  tokens,
}: QrBoardCanvasProps) {
  const format = QR_BOARD_FORMATS[formatId];
  const designWidth = format.previewWidthPx;
  const designHeight = Math.round(
    designWidth * (format.heightInches / format.widthInches),
  );
  const ink = pickContrastingInk(primaryColor);
  const muted = mutedInkOnBackground(primaryColor, 0.85);
  const stripColor = canvasAccentStripColor(primaryColor, secondaryColor);
  const grainOpacity = tokens?.grainOpacity ?? 0;
  const showLogo = showCanvasLogo(logoMode);
  const chrome = qrBoardChrome({
    format,
    slotCount: slots.length,
    showUrl,
    logoMode,
    typeScale: tokens ? typeScaleFactor(tokens) : 1,
  });
  const headerAlign = tokens
    ? flexAlignFromBias(tokens.alignmentBias)
    : "center";
  const headerTextAlign = tokens
    ? textAlignFromBias(tokens.alignmentBias)
    : "center";

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
    width: designWidth,
    height: designHeight,
    fontFamily: tokens?.bodyFontFamily,
  };

  return (
    <FitWidthFrame designWidth={designWidth} designHeight={designHeight}>
      <div
        ref={canvasRef}
        data-export-root=""
        data-qr-board-density={chrome.density}
        className="relative flex min-w-0 flex-col overflow-hidden"
        style={style}
      >
        <CanvasGrainOverlay opacity={grainOpacity} />
        <div
          className="relative z-[2] shrink-0"
          style={{
            height: chrome.stripPx,
            backgroundColor: stripColor,
          }}
          aria-hidden
        />

        <div
          className="relative z-[2] flex min-h-0 flex-1 flex-col"
          style={{
            padding: chrome.padPx,
            gap: chrome.stackGapPx,
          }}
        >
          <header
            className="flex shrink-0 flex-col"
            style={{
              alignItems: headerAlign,
              textAlign: headerTextAlign,
            }}
          >
            {showLogo ? (
              <div style={{ marginBottom: 2 }}>
                <BrandLogo
                  size="sm"
                  variantOverride={resolveLogoVariant(logoMode, {
                    preferMark: chrome.useMarkLogo,
                  })}
                  backgroundColor={primaryColor}
                />
              </div>
            ) : null}
            <h2
              className="font-bold leading-tight tracking-tight"
              style={{
                color: ink,
                margin: 0,
                fontSize: chrome.titleFontPx,
                fontFamily: tokens?.headlineFontFamily,
                fontWeight: tokens?.titleFontWeight,
                letterSpacing: tokens?.titleLetterSpacing,
                textTransform: tokens?.titleTextTransform,
                display: "-webkit-box",
                WebkitLineClamp: chrome.density === "roomy" ? 3 : 2,
                WebkitBoxOrient: "vertical",
                overflow: "hidden",
              }}
            >
              {posterTitle || "\u00a0"}
            </h2>
            {posterSubtitle.trim() ? (
              <p
                style={{
                  color: muted,
                  margin: "2px 0 0",
                  maxWidth: "36em",
                  fontSize: chrome.subtitleFontPx,
                  lineHeight: 1.25,
                  display: "-webkit-box",
                  WebkitLineClamp: 2,
                  WebkitBoxOrient: "vertical",
                  overflow: "hidden",
                }}
              >
                {posterSubtitle}
              </p>
            ) : null}
            {showLogo ? (
              <p
                data-board-footer=""
                className="truncate"
                style={{
                  color: muted,
                  margin: "3px 0 0",
                  fontSize: chrome.localFontPx,
                  lineHeight: 1.2,
                  width: "100%",
                }}
              >
                {localLabel}
              </p>
            ) : null}
          </header>

          <div
            className="grid min-h-0 flex-1"
            style={{
              gridTemplateColumns: `repeat(${chrome.columns}, minmax(0, 1fr))`,
              gridAutoRows: chrome.centerGridVertically ? "auto" : "1fr",
              alignContent: chrome.centerGridVertically ? "center" : undefined,
              gap: chrome.gridGapPx,
            }}
          >
            {slots.map((slot) => (
              <div
                key={slot.id}
                data-qr-cell=""
                className="flex min-h-0 flex-col items-center overflow-hidden text-center"
                style={{ gap: chrome.cellGapPx }}
              >
                <p
                  className="shrink-0 font-semibold leading-snug"
                  style={{
                    color: ink,
                    margin: 0,
                    width: "100%",
                    wordBreak: "break-word",
                    fontSize: chrome.cellTitleFontPx,
                    fontFamily: tokens?.headlineFontFamily,
                  }}
                >
                  {slot.title.trim() || "\u00a0"}
                </p>
                <div
                  data-qr-slot=""
                  className="mx-auto max-w-full shrink-0"
                  style={{
                    width: chrome.platePx,
                    height: chrome.platePx,
                  }}
                >
                  {tokens ? (
                    <CanvasQrPlate
                      tokens={tokens}
                      qrSrc={slot.qrSrc}
                      alt=""
                      accentColor={secondaryColor}
                      paddingPx={Math.max(3, Math.round(chrome.platePx * 0.06))}
                    />
                  ) : slot.qrSrc ? (
                    // eslint-disable-next-line @next/next/no-img-element -- data URL from qrcode
                    <img
                      src={slot.qrSrc}
                      alt=""
                      style={{
                        display: "block",
                        backgroundColor: "#FFFFFF",
                        padding: 6,
                        boxSizing: "border-box",
                        width: "100%",
                        height: "100%",
                        objectFit: "contain",
                      }}
                    />
                  ) : (
                    <div
                      style={{
                        backgroundColor: "#FFFFFF",
                        padding: 6,
                        boxSizing: "border-box",
                        width: "100%",
                        height: "100%",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      <span
                        style={{
                          color: CANVAS_PLACEHOLDER_INK,
                          fontSize: 10,
                          padding: 4,
                        }}
                      >
                        {qrPlaceholder}
                      </span>
                    </div>
                  )}
                </div>
                {showUrl && slot.destination.trim() ? (
                  <CanvasUrlCaption
                    url={slot.destination}
                    color={muted}
                    fontSizePx={chrome.urlFontPx}
                    fontFamily={tokens?.bodyFontFamily}
                    textAlign="center"
                    maxLines={chrome.urlMaxLines}
                    maxChars={chrome.urlMaxChars}
                    className="w-full"
                  />
                ) : null}
              </div>
            ))}
          </div>
        </div>
      </div>
    </FitWidthFrame>
  );
}
