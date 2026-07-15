"use client";

import type { TrimPieceId } from "@/lib/constants/board-banner-layouts";
import {
  cornerAllowsByline,
  pieceUsesChevrons,
  type BoardLogoMode,
} from "@/lib/constants/board-banner-ornaments";
import { BrandLogo } from "@/components/brand/BrandLogo";
import { pickContrastingInk } from "@/lib/utils/ink";

export interface BoardTrimCanvasProps {
  piece: TrimPieceId;
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  localNumber: string;
  showChevrons: boolean;
  showLocal: boolean;
  logoMode: BoardLogoMode;
  showByline: boolean;
  byline: string;
  /** Edge width in inches — gates corner byline */
  edgeWidthInches?: number;
  className?: string;
}

function HorizontalChevrons({
  color,
  bg,
}: {
  color: string;
  bg: string;
}) {
  const cols = 14;
  const vbW = cols * 28;
  return (
    <svg
      viewBox={`0 0 ${vbW} 40`}
      width="100%"
      height="100%"
      preserveAspectRatio="xMidYMid slice"
      aria-hidden="true"
      style={{ display: "block" }}
    >
      <rect width={vbW} height="40" fill={bg} />
      {Array.from({ length: cols }, (_, x) => (
        <path
          key={x}
          d={`M${4 + x * 28} 6 L${22 + x * 28} 20 L${4 + x * 28} 34`}
          fill="none"
          stroke={color}
          strokeWidth="4"
          strokeLinecap="square"
          strokeLinejoin="miter"
        />
      ))}
    </svg>
  );
}

function CornerChevrons({ color }: { color: string }) {
  return (
    <>
      <path
        d="M48 48 L62 55 L48 62"
        fill="none"
        stroke={color}
        strokeWidth="3"
        strokeLinecap="square"
      />
      <path
        d="M68 48 L82 55 L68 62"
        fill="none"
        stroke={color}
        strokeWidth="3"
        strokeLinecap="square"
      />
      <path
        d="M48 68 L62 75 L48 82"
        fill="none"
        stroke={color}
        strokeWidth="3"
        strokeLinecap="square"
      />
    </>
  );
}

/**
 * Trim pieces sized by parent:
 * - side: dual-tone rail + end caps (no chevrons)
 * - bottom: horizontal strip
 * - corner: square L-miter
 */
export function BoardTrimCanvas({
  piece,
  primaryColor,
  secondaryColor,
  accentColor,
  localNumber,
  showChevrons,
  showLocal,
  logoMode,
  showByline,
  byline,
  edgeWidthInches = 2,
  className,
}: BoardTrimCanvasProps) {
  const ink = pickContrastingInk(primaryColor);
  const accent = accentColor || secondaryColor;
  const accentInk = pickContrastingInk(accent);
  const secondaryInk = pickContrastingInk(secondaryColor);
  const localDisplay = `LOCAL ${localNumber}`;
  const bylineText = byline.trim();
  const showChev = pieceUsesChevrons(piece, showChevrons);
  const showLogo = logoMode !== "none";
  const logoVariant = logoMode === "mark" ? "mark" : "lockup";

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
        style={{
          boxSizing: "border-box",
          width: "100%",
          height: "100%",
          overflow: "hidden",
          display: "flex",
          flexDirection: "column",
          backgroundColor: primaryColor,
          fontFamily: "Arial, Helvetica, sans-serif",
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
                fontWeight: 900,
                fontSize: "clamp(0.45rem, 1.4vmin, 0.75rem)",
                letterSpacing: "0.08em",
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
                  fontSize: "clamp(0.4rem, 1.1vmin, 0.65rem)",
                  letterSpacing: "0.04em",
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
                fontWeight: 900,
                fontSize: "clamp(0.45rem, 1.4vmin, 0.75rem)",
                letterSpacing: "0.08em",
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
    const footText = showLocal
      ? localDisplay
      : showByline && bylineText
        ? bylineText
        : null;

    return (
      <div
        className={className}
        style={{
          boxSizing: "border-box",
          width: "100%",
          height: "100%",
          overflow: "hidden",
          display: "flex",
          flexDirection: "column",
          backgroundColor: "#FFFFFF",
          fontFamily: "Arial, Helvetica, sans-serif",
        }}
      >
        <div style={{ flex: "0 0 42%", minHeight: 0 }}>
          {showChev ? (
            <HorizontalChevrons color={ink} bg={primaryColor} />
          ) : (
            <div
              style={{
                width: "100%",
                height: "100%",
                backgroundColor: primaryColor,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "4%",
                padding: "0 4%",
                boxSizing: "border-box",
              }}
            >
              {showLogo ? (
                <BrandLogo
                  size="sm"
                  backgroundColor={primaryColor}
                  variantOverride={logoVariant}
                />
              ) : null}
            </div>
          )}
        </div>
        <div
          style={{
            flex: 1,
            minHeight: 0,
            display: "flex",
            backgroundColor: accent,
            alignItems: "center",
            justifyContent: "space-between",
            padding: "0 3%",
            boxSizing: "border-box",
          }}
        >
          <div style={{ flex: "0 0 18%", backgroundColor: secondaryColor, height: "100%" }} />
          <div
            style={{
              flex: 1,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "3%",
            }}
          >
            {showChev && showLogo ? (
              <BrandLogo
                size="sm"
                backgroundColor={accent}
                variantOverride={logoVariant}
              />
            ) : null}
            {showByline && bylineText && showLocal ? (
              <p
                style={{
                  margin: 0,
                  color: accentInk,
                  fontWeight: 700,
                  fontSize: "clamp(0.55rem, 1.6vmin, 0.85rem)",
                  letterSpacing: "0.04em",
                  textAlign: "center",
                }}
              >
                {bylineText}
              </p>
            ) : null}
          </div>
          <div style={{ flex: "0 0 18%", backgroundColor: primaryColor, height: "100%" }} />
        </div>
        <div
          style={{
            flex: "0 0 22%",
            backgroundColor: secondaryColor,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          {footText ? (
            <p
              style={{
                margin: 0,
                color: secondaryInk,
                fontWeight: 800,
                fontSize: "clamp(0.65rem, 2vmin, 1.1rem)",
                letterSpacing: "0.1em",
              }}
            >
              {footText}
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
      style={{
        boxSizing: "border-box",
        position: "relative",
        width: "100%",
        height: "100%",
        overflow: "hidden",
        backgroundColor: "#FFFFFF",
        fontFamily: "Arial, Helvetica, sans-serif",
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
        {showChev ? <CornerChevrons color={secondaryColor} /> : null}
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
            fontWeight: 900,
            fontSize: "clamp(0.5rem, 1.8vmin, 0.8rem)",
            letterSpacing: "0.06em",
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
            fontSize: "clamp(0.4rem, 1.2vmin, 0.6rem)",
            letterSpacing: "0.03em",
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
