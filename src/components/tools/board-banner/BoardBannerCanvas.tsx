"use client";

import { BrandLogo } from "@/components/brand/BrandLogo";
import type { BannerLayoutId } from "@/lib/constants/board-banner-layouts";
import {
  pieceUsesChevrons,
  type BoardLogoMode,
} from "@/lib/constants/board-banner-ornaments";
import { pickContrastingInk } from "@/lib/utils/ink";
import { meetsWcagAA } from "@/lib/utils/contrast";

export interface BoardBannerCanvasProps {
  layout: BannerLayoutId;
  callout: string;
  localLabel: string;
  localNumber: string;
  showChevrons: boolean;
  showLocal: boolean;
  logoMode: BoardLogoMode;
  showByline: boolean;
  byline: string;
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  className?: string;
}

function ChevronRow({
  color,
  count = 3,
}: {
  color: string;
  count?: number;
}) {
  const w = count * 28;
  return (
    <svg
      viewBox={`0 0 ${w} 36`}
      width="100%"
      height="100%"
      preserveAspectRatio="xMidYMid meet"
      aria-hidden="true"
      style={{ display: "block" }}
    >
      {Array.from({ length: count }, (_, i) => (
        <path
          key={i}
          d={`M${6 + i * 28} 4 L${22 + i * 28} 18 L${6 + i * 28} 32`}
          fill="none"
          stroke={color}
          strokeWidth="5"
          strokeLinecap="square"
          strokeLinejoin="miter"
        />
      ))}
    </svg>
  );
}

/**
 * Fixed-aspect header strip. Parent sets width + height (or aspect box).
 * SVG slant keeps BrandLogo outside clipped ancestors for clean PNG capture.
 */
export function BoardBannerCanvas({
  layout,
  callout,
  localLabel,
  localNumber,
  showChevrons,
  showLocal,
  logoMode,
  showByline,
  byline,
  primaryColor,
  secondaryColor,
  accentColor,
  className,
}: BoardBannerCanvasProps) {
  const ink = pickContrastingInk(primaryColor);
  const accent = accentColor || secondaryColor;
  const accentInk = pickContrastingInk(accent);
  const secondaryOnPrimary = meetsWcagAA(secondaryColor, primaryColor, true)
    ? secondaryColor
    : ink;
  const localDisplay = `LOCAL ${localNumber}`;
  const calloutText = callout.trim() || "Did you know?";
  const bylineText = byline.trim();
  const showChev = pieceUsesChevrons("banner", showChevrons);
  const showLogo = logoMode !== "none";
  const logoVariant = logoMode === "mark" ? "mark" : "lockup";

  if (layout === "slantCallout") {
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

        <div
          style={{
            position: "relative",
            zIndex: 1,
            display: "flex",
            flexDirection: "row",
            alignItems: "center",
            height: "100%",
            width: "100%",
            boxSizing: "border-box",
            padding: "0 2.5% 0 0",
          }}
        >
          <div
            style={{
              flex: "0 0 34%",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              gap: "6%",
              padding: "0 4% 0 3%",
              boxSizing: "border-box",
            }}
          >
            <p
              style={{
                margin: 0,
                color: ink,
                fontSize: "clamp(0.75rem, 2.4vmin, 1.35rem)",
                fontWeight: 800,
                lineHeight: 1.15,
                textAlign: "center",
              }}
            >
              {calloutText}
            </p>
            {showByline && bylineText ? (
              <p
                style={{
                  margin: 0,
                  color: ink,
                  fontSize: "clamp(0.5rem, 1.4vmin, 0.75rem)",
                  fontWeight: 600,
                  letterSpacing: "0.04em",
                  textAlign: "center",
                  lineHeight: 1.2,
                }}
              >
                {bylineText}
              </p>
            ) : null}
          </div>

          <div
            style={{
              flex: 1,
              minWidth: 0,
              display: "flex",
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
              gap: "3%",
              paddingLeft: "2%",
              height: "100%",
              boxSizing: "border-box",
            }}
          >
            {showLogo ? (
              <div
                style={{
                  flex: "0 1 auto",
                  maxWidth: "32%",
                  maxHeight: "70%",
                  display: "flex",
                  alignItems: "center",
                }}
              >
                <BrandLogo
                  size="md"
                  backgroundColor="#FFFFFF"
                  variantOverride={logoVariant}
                />
              </div>
            ) : (
              <span style={{ flex: "0 0 8%" }} />
            )}
            {showChev ? (
              <div
                style={{
                  flex: "0 0 16%",
                  height: "38%",
                  minHeight: 20,
                  maxHeight: 40,
                }}
              >
                <ChevronRow color={secondaryOnPrimary} count={3} />
              </div>
            ) : (
              <span style={{ flex: "0 0 4%" }} />
            )}
            {showLocal ? (
              <p
                style={{
                  margin: 0,
                  flex: "0 0 auto",
                  color: secondaryOnPrimary,
                  fontSize: "clamp(0.9rem, 3.2vmin, 1.85rem)",
                  fontWeight: 900,
                  letterSpacing: "0.04em",
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
    return (
      <div
        className={className}
        style={{
          boxSizing: "border-box",
          width: "100%",
          height: "100%",
          overflow: "hidden",
          backgroundColor: primaryColor,
          display: "flex",
          flexDirection: "column",
          fontFamily: "Arial, Helvetica, sans-serif",
        }}
      >
        <div
          aria-hidden="true"
          style={{ height: "12%", backgroundColor: accent, flexShrink: 0 }}
        />
        <div
          style={{
            flex: 1,
            minHeight: 0,
            display: "flex",
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "0 4%",
            gap: "3%",
          }}
        >
          <div style={{ maxWidth: "30%" }}>
            <p
              style={{
                margin: 0,
                color: ink,
                fontSize: "clamp(0.65rem, 2vmin, 1rem)",
                fontWeight: 700,
                letterSpacing: "0.06em",
                textTransform: "uppercase",
              }}
            >
              {showLocal ? localLabel : "\u00A0"}
            </p>
            {showByline && bylineText ? (
              <p
                style={{
                  margin: "4px 0 0",
                  color: ink,
                  fontSize: "clamp(0.5rem, 1.4vmin, 0.7rem)",
                  fontWeight: 600,
                  letterSpacing: "0.03em",
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
                fontSize: "clamp(0.95rem, 3vmin, 1.75rem)",
                fontWeight: 900,
                letterSpacing: "0.05em",
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
        {showChev ? (
          <div
            style={{
              height: "12%",
              backgroundColor: secondaryColor,
              flexShrink: 0,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              padding: "0 10%",
              boxSizing: "border-box",
            }}
          >
            <div style={{ width: "40%", height: "70%" }}>
              <ChevronRow
                color={pickContrastingInk(secondaryColor)}
                count={6}
              />
            </div>
          </div>
        ) : (
          <div
            aria-hidden="true"
            style={{
              height: "12%",
              backgroundColor: secondaryColor,
              flexShrink: 0,
            }}
          />
        )}
      </div>
    );
  }

  // minimalStripe
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
      <div
        style={{
          flex: "0 0 58%",
          backgroundColor: primaryColor,
          display: "flex",
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "0 4%",
          gap: "3%",
          minHeight: 0,
        }}
      >
        <div>
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
                fontWeight: 700,
                fontSize: "clamp(0.65rem, 1.8vmin, 0.95rem)",
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
                fontSize: "clamp(0.45rem, 1.2vmin, 0.65rem)",
                fontWeight: 600,
                letterSpacing: "0.03em",
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
              color: ink,
              fontSize: "clamp(1rem, 3.5vmin, 2rem)",
              fontWeight: 900,
              letterSpacing: "0.06em",
              whiteSpace: "nowrap",
            }}
          >
            {localDisplay}
          </p>
        ) : null}
      </div>
      <div
        style={{
          flex: 1,
          minHeight: 0,
          backgroundColor: accent,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "0 6%",
        }}
      >
        {showChev ? (
          <div style={{ width: "80%", height: "55%" }}>
            <ChevronRow color={accentInk} count={10} />
          </div>
        ) : null}
      </div>
    </div>
  );
}
