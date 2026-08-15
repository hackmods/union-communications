"use client";

import type { CSSProperties } from "react";
import { BrandLogo } from "@/components/brand/BrandLogo";
import { CanvasGrainOverlay } from "@/components/tools/canvas";
import type { BannerLayoutId } from "@/lib/constants/board-banner-layouts";
import type { BoardLogoMode } from "@/lib/constants/board-banner-ornaments";
import type { CanvasTokens } from "@/lib/utils/canvas-tokens";
import {
  bannerPadPercent,
  clampTypeRem,
} from "@/lib/utils/canvas-tokens";
import { canvasSurfaceStyle } from "@/lib/utils/canvas-surface";
import { pickContrastingInk } from "@/lib/utils/ink";
import { meetsWcagAA } from "@/lib/utils/contrast";

export interface BoardBannerCanvasProps {
  layout: BannerLayoutId;
  callout: string;
  localLabel: string;
  localNumber: string;
  showLocal: boolean;
  logoMode: BoardLogoMode;
  showByline: boolean;
  byline: string;
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  tokens?: CanvasTokens;
  className?: string;
}

/**
 * Fixed-aspect header strip. Parent sets width + height (or aspect box).
 * SVG slant keeps BrandLogo outside clipped ancestors for clean PNG capture.
 * No chevron ornaments — dual-tone geometry + type/logo only.
 */
export function BoardBannerCanvas({
  layout,
  callout,
  localLabel,
  localNumber,
  showLocal,
  logoMode,
  showByline,
  byline,
  primaryColor,
  secondaryColor,
  accentColor,
  tokens,
  className,
}: BoardBannerCanvasProps) {
  const ink = pickContrastingInk(primaryColor);
  const accent = accentColor || secondaryColor;
  const localDisplay = `LOCAL ${localNumber}`;
  const calloutText = callout.trim() || "Did you know?";
  const bylineText = byline.trim();
  const showLogo = logoMode !== "none";
  const logoVariant = logoMode === "mark" ? "mark" : "lockup";
  const padPct = bannerPadPercent(tokens);
  const titleType: CSSProperties = {
    fontWeight: tokens?.titleFontWeight ?? 900,
    letterSpacing: tokens?.titleLetterSpacing ?? "0.04em",
    textTransform: tokens?.titleTextTransform ?? "uppercase",
    fontFamily: tokens?.headlineFontFamily,
  };
  const metaType: CSSProperties = {
    fontWeight: 600,
    letterSpacing: tokens?.titleLetterSpacing ?? "0.03em",
    fontFamily: tokens?.bodyFontFamily,
  };

  if (layout === "slantCallout") {
    // SVG blue ends ~34–40%; accent band to ~43%. Keep callout in blue and
    // start logo/LOCAL on solid white past the slant (see board-banner.mdc).
    const localOnWhite = meetsWcagAA(primaryColor, "#FFFFFF", true)
      ? primaryColor
      : pickContrastingInk("#FFFFFF");

    return (
      <div
        className={className}
        style={{
          boxSizing: "border-box",
          position: "relative",
          width: "100%",
          height: "100%",
          overflow: "hidden",
          backgroundColor: "#FFFFFF",
          fontFamily: tokens?.bodyFontFamily,
        }}
      >
        <svg
          viewBox="0 0 1000 200"
          preserveAspectRatio="none"
          aria-hidden="true"
          style={{
            position: "absolute",
            inset: 0,
            width: "100%",
            height: "100%",
            display: "block",
          }}
        >
          <rect width="1000" height="200" fill="#FFFFFF" />
          <polygon points="0,0 340,0 400,200 0,200" fill={primaryColor} />
          <polygon points="340,0 400,0 430,200 400,200" fill={accent} />
        </svg>
        {tokens ? <CanvasGrainOverlay opacity={tokens.grainOpacity * 0.55} /> : null}

        <div
          style={{
            position: "relative",
            zIndex: 2,
            display: "flex",
            flexDirection: "row",
            alignItems: "center",
            height: "100%",
            width: "100%",
            boxSizing: "border-box",
            padding: `0 ${padPct * 0.6}% 0 0`,
          }}
        >
          <div
            style={{
              flex: "0 0 32%",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              gap: "6%",
              padding: `0 ${padPct * 0.5}% 0 ${padPct * 0.75}%`,
              boxSizing: "border-box",
            }}
          >
            <p
              style={{
                margin: 0,
                color: ink,
                fontSize: clampTypeRem(tokens, 0.75, 2.4, 1.35),
                fontWeight: tokens?.titleFontWeight ?? 800,
                lineHeight: 1.15,
                textAlign: "center",
                letterSpacing: tokens?.titleLetterSpacing ?? "0.02em",
              }}
            >
              {calloutText}
            </p>
            {showByline && bylineText ? (
              <p
                style={{
                  margin: 0,
                  color: ink,
                  fontSize: clampTypeRem(tokens, 0.5, 1.4, 0.75),
                  ...metaType,
                  textAlign: "center",
                  lineHeight: 1.2,
                }}
              >
                {bylineText}
              </p>
            ) : null}
          </div>

          {/* Clears primary slant + accent stripe so lockup never straddles blue/white */}
          <span aria-hidden="true" style={{ flex: "0 0 14%" }} />

          <div
            style={{
              flex: 1,
              minWidth: 0,
              display: "flex",
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
              gap: "3%",
              height: "100%",
              boxSizing: "border-box",
            }}
          >
            {showLogo ? (
              <div
                style={{
                  flex: "0 1 auto",
                  maxWidth: "48%",
                  maxHeight: "68%",
                  display: "flex",
                  alignItems: "center",
                  overflow: "hidden",
                }}
              >
                <BrandLogo
                  size="md"
                  backgroundColor="#FFFFFF"
                  variantOverride={logoVariant}
                  className="max-h-full w-auto max-w-full object-contain object-left"
                />
              </div>
            ) : (
              <span style={{ flex: "0 0 8%" }} />
            )}
            {showLocal ? (
              <p
                style={{
                  margin: 0,
                  flex: "0 0 auto",
                  color: localOnWhite,
                  fontSize: clampTypeRem(tokens, 0.9, 3.2, 1.85),
                  ...titleType,
                  whiteSpace: "nowrap",
                }}
              >
                {localDisplay}
              </p>
            ) : (
              <span style={{ flex: "0 0 4%" }} />
            )}
          </div>
        </div>
      </div>
    );
  }

  if (layout === "centeredLockup") {
    const fieldSurface = tokens
      ? canvasSurfaceStyle(tokens, {
          primary: primaryColor,
          secondary: secondaryColor,
          accent,
        })
      : { backgroundColor: primaryColor };
    const rowJustify =
      tokens?.alignmentBias === "center"
        ? "center"
        : tokens?.alignmentBias === "asymmetric"
          ? "flex-end"
          : "space-between";

    return (
      <div
        className={className}
        style={{
          boxSizing: "border-box",
          position: "relative",
          width: "100%",
          height: "100%",
          overflow: "hidden",
          ...fieldSurface,
          display: "flex",
          flexDirection: "column",
          fontFamily: tokens?.bodyFontFamily,
        }}
      >
        {tokens ? <CanvasGrainOverlay opacity={tokens.grainOpacity} /> : null}
        <div
          aria-hidden="true"
          style={{
            height: "12%",
            backgroundColor: accent,
            flexShrink: 0,
            position: "relative",
            zIndex: 2,
          }}
        />
        <div
          style={{
            flex: 1,
            minHeight: 0,
            display: "flex",
            flexDirection: "row",
            alignItems: "center",
            justifyContent: rowJustify,
            padding: `0 ${padPct}%`,
            gap: "3%",
            position: "relative",
            zIndex: 2,
          }}
        >
          <div style={{ maxWidth: "30%" }}>
            <p
              style={{
                margin: 0,
                color: ink,
                fontSize: clampTypeRem(tokens, 0.65, 2, 1),
                fontWeight: tokens?.titleFontWeight ?? 700,
                letterSpacing: tokens?.titleLetterSpacing ?? "0.06em",
                textTransform: tokens?.titleTextTransform ?? "uppercase",
              }}
            >
              {showLocal ? localLabel : "\u00A0"}
            </p>
            {showByline && bylineText ? (
              <p
                style={{
                  margin: "4px 0 0",
                  color: ink,
                  fontSize: clampTypeRem(tokens, 0.5, 1.4, 0.7),
                  ...metaType,
                  lineHeight: 1.2,
                }}
              >
                {bylineText}
              </p>
            ) : null}
          </div>
          {showLogo ? (
            <div
              style={{
                flex: "0 1 auto",
                maxHeight: "72%",
                display: "flex",
                alignItems: "center",
              }}
            >
              <BrandLogo
                size="md"
                backgroundColor={primaryColor}
                variantOverride={logoVariant}
              />
            </div>
          ) : null}
          {showLocal ? (
            <p
              style={{
                margin: 0,
                color: ink,
                fontSize: clampTypeRem(tokens, 0.95, 3, 1.75),
                ...titleType,
                textAlign: "right",
                whiteSpace: "nowrap",
              }}
            >
              {localDisplay}
            </p>
          ) : (
            <span />
          )}
        </div>
        <div
          aria-hidden="true"
          style={{
            height: "12%",
            backgroundColor: secondaryColor,
            flexShrink: 0,
            position: "relative",
            zIndex: 2,
          }}
        />
      </div>
    );
  }

  // minimalStripe
  return (
    <div
      className={className}
      style={{
        boxSizing: "border-box",
        position: "relative",
        width: "100%",
        height: "100%",
        overflow: "hidden",
        display: "flex",
        flexDirection: "column",
        backgroundColor: "#FFFFFF",
        fontFamily: tokens?.bodyFontFamily,
      }}
    >
      <div
        style={{
          flex: "0 0 70%",
          position: "relative",
          ...(tokens
            ? canvasSurfaceStyle(tokens, {
                primary: primaryColor,
                secondary: secondaryColor,
                accent,
              })
            : { backgroundColor: primaryColor }),
          display: "flex",
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          padding: `0 ${padPct}%`,
          gap: "3%",
          minHeight: 0,
        }}
      >
        {tokens ? <CanvasGrainOverlay opacity={tokens.grainOpacity * 0.7} /> : null}
        <div style={{ position: "relative", zIndex: 2 }}>
          {showLogo ? (
            <div style={{ maxHeight: "75%", display: "flex", alignItems: "center" }}>
              <BrandLogo
                size="sm"
                backgroundColor={primaryColor}
                variantOverride={logoVariant}
              />
            </div>
          ) : (
            <span
              style={{
                color: ink,
                fontWeight: tokens?.titleFontWeight ?? 700,
                fontSize: clampTypeRem(tokens, 0.65, 1.8, 0.95),
                letterSpacing: tokens?.titleLetterSpacing ?? "0.02em",
              }}
            >
              {showLocal ? localLabel : "\u00A0"}
            </span>
          )}
          {showByline && bylineText ? (
            <p
              style={{
                margin: "4px 0 0",
                color: ink,
                fontSize: clampTypeRem(tokens, 0.45, 1.2, 0.65),
                ...metaType,
              }}
            >
              {bylineText}
            </p>
          ) : null}
        </div>
        {showLocal ? (
          <p
            style={{
              margin: 0,
              position: "relative",
              zIndex: 2,
              color: ink,
              fontSize: clampTypeRem(tokens, 1, 3.5, 2),
              ...titleType,
              whiteSpace: "nowrap",
            }}
          >
            {localDisplay}
          </p>
        ) : null}
      </div>
      <div
        aria-hidden="true"
        style={{
          flex: 1,
          backgroundColor: secondaryColor,
        }}
      />
    </div>
  );
}
