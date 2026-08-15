"use client";

import {
  cornerAllowsByline,
  type BoardLogoMode,
} from "@/lib/constants/board-banner-ornaments";
import { BrandLogo } from "@/components/brand/BrandLogo";
import type { CanvasTokens } from "@/lib/utils/canvas-tokens";
import { clampTypeRem } from "@/lib/utils/canvas-tokens";
import { pickContrastingInk } from "@/lib/utils/ink";

/** Rail / corner art only — top header strips use BoardBannerCanvas. */
export type TrimRailPieceId = "side" | "bottom" | "corner";

export interface BoardTrimCanvasProps {
  piece: TrimRailPieceId;
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  localNumber: string;
  showLocal: boolean;
  logoMode: BoardLogoMode;
  showByline: boolean;
  byline: string;
  /** Edge width in inches — gates corner byline */
  edgeWidthInches?: number;
  /** Assistive summary of this trim graphic (UI-005). */
  accessibleName?: string;
  tokens?: CanvasTokens;
  className?: string;
}

/**
 * Trim pieces sized by parent:
 * - side: dual-tone vertical rail + end caps
 * - bottom: dual-tone horizontal rail + end caps — side motif rotated
 * - corner: optional square L-miter (omit for continuous full-edge rails)
 */
export function BoardTrimCanvas({
  piece,
  primaryColor,
  secondaryColor,
  accentColor,
  localNumber,
  showLocal,
  logoMode,
  showByline,
  byline,
  edgeWidthInches = 2,
  accessibleName,
  tokens,
  className,
}: BoardTrimCanvasProps) {
  const ink = pickContrastingInk(primaryColor);
  const accent = accentColor || secondaryColor;
  const accentInk = pickContrastingInk(accent);
  const secondaryInk = pickContrastingInk(secondaryColor);
  const localDisplay = `LOCAL ${localNumber}`;
  const bylineText = byline.trim();
  const showLogo = logoMode !== "none";
  const logoVariant = logoMode === "mark" ? "mark" : "lockup";
  const localCapType = {
    fontWeight: (tokens?.titleFontWeight ?? 900) as number,
    letterSpacing: tokens?.titleLetterSpacing ?? "0.08em",
    textTransform: (tokens?.titleTextTransform ?? "uppercase") as
      | "none"
      | "uppercase",
    fontFamily: tokens?.headlineFontFamily,
  };
  const a11yProps = accessibleName
    ? ({
        role: "group" as const,
        "aria-label": accessibleName,
        "aria-live": "off" as const,
      })
    : {};

  if (piece === "side") {
    const topLabel = showLocal ? localDisplay : null;
    const bottomLabel =
      showLocal
        ? localDisplay
        : showByline && bylineText
          ? bylineText
          : null;

    return (
      <div
        className={className}
        {...a11yProps}
        style={{
          boxSizing: "border-box",
          width: "100%",
          height: "100%",
          overflow: "hidden",
          display: "flex",
          flexDirection: "column",
          backgroundColor: primaryColor,
          fontFamily: tokens?.bodyFontFamily,
        }}
      >
        {/* Top cap — accent */}
        <div
          style={{
            flex: "0 0 14%",
            backgroundColor: accent,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "2% 4%",
            boxSizing: "border-box",
          }}
        >
          {topLabel ? (
            <p
              style={{
                margin: 0,
                color: accentInk,
                fontSize: clampTypeRem(tokens, 0.45, 1.4, 0.75),
                ...localCapType,
                textAlign: "center",
                lineHeight: 1.1,
              }}
            >
              {topLabel}
            </p>
          ) : null}
        </div>

        {/* Dual-tone rail body */}
        <div
          style={{
            flex: 1,
            minHeight: 0,
            display: "flex",
            flexDirection: "row",
          }}
        >
          <div
            style={{
              flex: "0 0 70%",
              backgroundColor: primaryColor,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              gap: "8%",
              padding: "4% 2%",
              boxSizing: "border-box",
            }}
          >
            {showLogo ? (
              <div style={{ maxWidth: "80%", maxHeight: "28%" }}>
                <BrandLogo
                  size="sm"
                  backgroundColor={primaryColor}
                  variantOverride={logoVariant}
                />
              </div>
            ) : null}
            {showByline && bylineText && edgeWidthInches >= 2 ? (
              <p
                style={{
                  margin: 0,
                  color: ink,
                  fontWeight: 700,
                  fontSize: clampTypeRem(tokens, 0.4, 1.1, 0.65),
                  letterSpacing: tokens?.titleLetterSpacing ?? "0.04em",
                  textAlign: "center",
                  lineHeight: 1.25,
                  writingMode: "vertical-rl",
                  transform: "rotate(180deg)",
                }}
              >
                {bylineText}
              </p>
            ) : null}
          </div>
          <div
            aria-hidden="true"
            style={{ flex: "0 0 30%", backgroundColor: accent }}
          />
        </div>

        {/* Bottom cap — secondary */}
        <div
          style={{
            flex: "0 0 14%",
            backgroundColor: secondaryColor,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "2% 4%",
            boxSizing: "border-box",
          }}
        >
          {bottomLabel ? (
            <p
              style={{
                margin: 0,
                color: secondaryInk,
                fontSize: clampTypeRem(tokens, 0.45, 1.4, 0.75),
                ...localCapType,
                textAlign: "center",
                lineHeight: 1.1,
              }}
            >
              {bottomLabel}
            </p>
          ) : null}
        </div>
      </div>
    );
  }

  if (piece === "bottom") {
    const leftLabel = showLocal ? localDisplay : null;
    const rightLabel =
      showLocal
        ? localDisplay
        : showByline && bylineText
          ? bylineText
          : null;

    return (
      <div
        className={className}
        {...a11yProps}
        style={{
          boxSizing: "border-box",
          width: "100%",
          height: "100%",
          overflow: "hidden",
          display: "flex",
          flexDirection: "row",
          backgroundColor: primaryColor,
          fontFamily: tokens?.bodyFontFamily,
        }}
      >
        {/* Left cap — accent (mirrors side top cap) */}
        <div
          style={{
            flex: "0 0 14%",
            backgroundColor: accent,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "2% 3%",
            boxSizing: "border-box",
          }}
        >
          {leftLabel ? (
            <p
              style={{
                margin: 0,
                color: accentInk,
                fontSize: clampTypeRem(tokens, 0.55, 1.8, 0.95),
                ...localCapType,
                textAlign: "center",
                lineHeight: 1.1,
              }}
            >
              {leftLabel}
            </p>
          ) : null}
        </div>

        {/* Dual-tone body — primary band + accent rail (mirrors side 70/30) */}
        <div
          style={{
            flex: 1,
            minWidth: 0,
            display: "flex",
            flexDirection: "column",
          }}
        >
          <div
            style={{
              flex: "0 0 70%",
              backgroundColor: primaryColor,
              display: "flex",
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "center",
              gap: "4%",
              padding: "2% 3%",
              boxSizing: "border-box",
              minHeight: 0,
            }}
          >
            {showLogo ? (
              <div style={{ maxHeight: "85%", display: "flex", alignItems: "center" }}>
                <BrandLogo
                  size="sm"
                  backgroundColor={primaryColor}
                  variantOverride={logoVariant}
                />
              </div>
            ) : null}
            {showByline && bylineText ? (
              <p
                style={{
                  margin: 0,
                  color: ink,
                  fontWeight: 700,
                  fontSize: clampTypeRem(tokens, 0.5, 1.5, 0.8),
                  letterSpacing: tokens?.titleLetterSpacing ?? "0.04em",
                  textAlign: "center",
                  lineHeight: 1.25,
                }}
              >
                {bylineText}
              </p>
            ) : null}
          </div>
          <div
            aria-hidden="true"
            style={{ flex: "0 0 30%", backgroundColor: accent }}
          />
        </div>

        {/* Right cap — secondary (mirrors side bottom cap) */}
        <div
          style={{
            flex: "0 0 14%",
            backgroundColor: secondaryColor,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "2% 3%",
            boxSizing: "border-box",
          }}
        >
          {rightLabel ? (
            <p
              style={{
                margin: 0,
                color: secondaryInk,
                fontSize: clampTypeRem(tokens, 0.55, 1.8, 0.95),
                ...localCapType,
                textAlign: "center",
                lineHeight: 1.1,
              }}
            >
              {rightLabel}
            </p>
          ) : null}
        </div>
      </div>
    );
  }

  // corner
  const showCornerByline = cornerAllowsByline(showByline, edgeWidthInches);

  return (
    <div
      className={className}
      {...a11yProps}
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
        viewBox="0 0 100 100"
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
        <rect width="100" height="100" fill="#FFFFFF" />
        <polygon
          points="0,0 100,0 100,28 28,28 28,100 0,100"
          fill={primaryColor}
        />
        <polygon
          points="0,0 100,0 100,14 14,14 14,100 0,100"
          fill={accent}
        />
      </svg>
      {showLocal ? (
        <p
          style={{
            position: "absolute",
            top: "8%",
            left: "8%",
            margin: 0,
            zIndex: 1,
            color: ink,
            fontSize: clampTypeRem(tokens, 0.5, 1.8, 0.8),
            ...localCapType,
          }}
        >
          {localDisplay}
        </p>
      ) : null}
      {showLogo ? (
        <div
          style={{
            position: "absolute",
            right: "10%",
            bottom: "10%",
            zIndex: 1,
            maxWidth: "40%",
            maxHeight: "40%",
          }}
        >
          <BrandLogo
            size="sm"
            backgroundColor="#FFFFFF"
            variantOverride={logoVariant}
          />
        </div>
      ) : null}
      {showCornerByline && bylineText ? (
        <p
          style={{
            position: "absolute",
            left: "8%",
            bottom: "8%",
            margin: 0,
            zIndex: 1,
            color: ink,
            fontWeight: 700,
            fontSize: clampTypeRem(tokens, 0.4, 1.2, 0.6),
            letterSpacing: tokens?.titleLetterSpacing ?? "0.03em",
            maxWidth: "45%",
            lineHeight: 1.2,
          }}
        >
          {bylineText}
        </p>
      ) : null}
    </div>
  );
}
