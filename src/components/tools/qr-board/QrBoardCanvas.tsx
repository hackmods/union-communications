"use client";

import {
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
  type Ref,
} from "react";
import { BrandLogo } from "@/components/brand/BrandLogo";
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
  includeBranding: boolean;
  primaryColor: string;
  secondaryColor: string;
  localLabel: string;
  qrPlaceholder: string;
  tokens?: CanvasTokens;
}

/**
 * Layout the poster at its design width, then scale the whole sheet to the
 * preview column. Interior px chrome stays proportional — no cropped QRs
 * when the page narrows.
 */
function FitWidthFrame({
  designWidth,
  designHeight,
  children,
}: {
  designWidth: number;
  designHeight: number;
  children: ReactNode;
}) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);

  useLayoutEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const update = () => {
      const w = el.clientWidth;
      setScale(w > 0 ? Math.min(1, w / designWidth) : 1);
    };
    const ro = new ResizeObserver(update);
    ro.observe(el);
    update();
    return () => ro.disconnect();
  }, [designWidth]);

  return (
    <div
      ref={wrapRef}
      data-qr-board-fit=""
      className="w-full min-w-0 max-w-full"
    >
      <div
        style={{
          position: "relative",
          height: designHeight * scale,
        }}
      >
        <div
          style={{
            width: designWidth,
            height: designHeight,
            transform: scale === 1 ? undefined : `scale(${scale})`,
            transformOrigin: "top left",
          }}
        >
          {children}
        </div>
      </div>
    </div>
  );
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
  const designWidth = format.previewWidthPx;
  const designHeight = Math.round(
    designWidth * (format.heightInches / format.widthInches),
  );
  const ink = pickContrastingInk(primaryColor);
  const muted = mutedInkOnBackground(primaryColor, 0.85);
  const stripColor = canvasAccentStripColor(primaryColor, secondaryColor);
  const grainOpacity = tokens?.grainOpacity ?? 0;
  const chrome = qrBoardChrome({
    format,
    slotCount: slots.length,
    showUrl,
    includeBranding,
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
            {includeBranding ? (
              <div style={{ marginBottom: 2 }}>
                <BrandLogo
                  size="sm"
                  variantOverride={chrome.useMarkLogo ? "mark" : undefined}
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
            {includeBranding ? (
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
              gridAutoRows: "1fr",
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
