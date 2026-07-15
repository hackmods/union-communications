"use client";

import { BrandLogo } from "@/components/brand/BrandLogo";
import type { BannerLayoutId } from "@/lib/constants/board-banner-layouts";
import { inkWithAlpha, pickContrastingInk } from "@/lib/utils/ink";
import { meetsWcagAA } from "@/lib/utils/contrast";

export interface BoardBannerCanvasProps {
  layout: BannerLayoutId;
  callout: string;
  localLabel: string;
  localNumber: string;
  includeLogo: boolean;
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  className?: string;
}

/** Repeating chevron marks for join-friendly edges (inline SVG, capture-safe). */
function ChevronRow({
  color,
  count = 3,
}: {
  color: string;
  count?: number;
}) {
  return (
    <svg
      viewBox={`0 0 ${count * 28} 40`}
      width="100%"
      height="100%"
      preserveAspectRatio="xMidYMid meet"
      aria-hidden="true"
      style={{ display: "block" }}
    >
      {Array.from({ length: count }, (_, i) => (
        <path
          key={i}
          d={`M${4 + i * 28} 6 L${22 + i * 28} 20 L${4 + i * 28} 34`}
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

export function BoardBannerCanvas({
  layout,
  callout,
  localLabel,
  localNumber,
  includeLogo,
  primaryColor,
  secondaryColor,
  accentColor,
  className,
}: BoardBannerCanvasProps) {
  const ink = pickContrastingInk(primaryColor);
  const accentInk = pickContrastingInk(accentColor);
  const secondaryOnPrimary = meetsWcagAA(secondaryColor, primaryColor, true)
    ? secondaryColor
    : ink;
  const mutedInk = inkWithAlpha(ink, 0.85);
  const localDisplay = `LOCAL ${localNumber}`;

  if (layout === "slantCallout") {
    return (
      <div
        className={className}
        style={{
          boxSizing: "border-box",
          width: "100%",
          height: "100%",
          backgroundColor: "#FFFFFF",
          display: "flex",
          flexDirection: "row",
          alignItems: "stretch",
          overflow: "hidden",
          fontFamily: "Arial, Helvetica, sans-serif",
        }}
      >
        {/* Slanted callout panel */}
        <div
          style={{
            position: "relative",
            flex: "0 0 32%",
            minWidth: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "0 8% 0 4%",
            backgroundColor: primaryColor,
            clipPath: "polygon(0 0, 88% 0, 100% 100%, 0 100%)",
          }}
        >
          <p
            style={{
              margin: 0,
              color: ink,
              fontSize: "clamp(0.85rem, 2.8vw, 1.75rem)",
              fontWeight: 800,
              lineHeight: 1.15,
              textAlign: "center",
            }}
          >
            {callout.trim() || "Did you know?"}
          </p>
          {/* Accent wedge along the slant */}
          <div
            aria-hidden="true"
            style={{
              position: "absolute",
              top: 0,
              right: 0,
              width: "14%",
              height: "100%",
              backgroundColor: accentColor || secondaryColor,
              clipPath: "polygon(0 0, 100% 0, 100% 100%, 40% 100%)",
              opacity: 0.95,
            }}
          />
        </div>

        {/* Logo + chevrons + local */}
        <div
          style={{
            flex: 1,
            minWidth: 0,
            display: "flex",
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
            gap: "2%",
            padding: "4% 5% 4% 3%",
            backgroundColor: "#FFFFFF",
          }}
        >
          {includeLogo ? (
            <div
              style={{
                flex: "0 0 auto",
                maxWidth: "28%",
                display: "flex",
                alignItems: "center",
              }}
            >
              <BrandLogo size="lg" backgroundColor="#FFFFFF" />
            </div>
          ) : (
            <div style={{ flex: "0 0 8%" }} />
          )}
          <div
            style={{
              flex: "0 0 18%",
              height: "42%",
              minHeight: 28,
            }}
          >
            <ChevronRow color={secondaryOnPrimary} count={3} />
          </div>
          <p
            style={{
              margin: 0,
              flex: "0 1 auto",
              color: secondaryOnPrimary,
              fontSize: "clamp(1rem, 3.5vw, 2.25rem)",
              fontWeight: 900,
              letterSpacing: "0.04em",
              whiteSpace: "nowrap",
            }}
          >
            {localDisplay}
          </p>
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
          backgroundColor: primaryColor,
          display: "flex",
          flexDirection: "column",
          alignItems: "stretch",
          overflow: "hidden",
          fontFamily: "Arial, Helvetica, sans-serif",
        }}
      >
        <div
          aria-hidden="true"
          style={{
            height: "10%",
            backgroundColor: accentColor || secondaryColor,
          }}
        />
        <div
          style={{
            flex: 1,
            display: "flex",
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "3% 6%",
            gap: "4%",
          }}
        >
          <p
            style={{
              margin: 0,
              color: ink,
              fontSize: "clamp(0.9rem, 2.5vw, 1.5rem)",
              fontWeight: 700,
              letterSpacing: "0.06em",
              textTransform: "uppercase",
              opacity: 0.95,
            }}
          >
            {localLabel}
          </p>
          {includeLogo ? (
            <div style={{ flex: "0 0 auto", maxWidth: "30%" }}>
              <BrandLogo size="lg" backgroundColor={primaryColor} />
            </div>
          ) : null}
          <p
            style={{
              margin: 0,
              color: ink,
              fontSize: "clamp(1.1rem, 3.2vw, 2rem)",
              fontWeight: 900,
              letterSpacing: "0.05em",
              textAlign: "right",
            }}
          >
            {localDisplay}
          </p>
        </div>
        <div
          aria-hidden="true"
          style={{
            height: "10%",
            backgroundColor: secondaryColor,
          }}
        />
      </div>
    );
  }

  // minimalStripe — dual-tone bar + local number for boards that already have parent-union art behind
  return (
    <div
      className={className}
      style={{
        boxSizing: "border-box",
        width: "100%",
        height: "100%",
        backgroundColor: "#FFFFFF",
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
        fontFamily: "Arial, Helvetica, sans-serif",
      }}
    >
      <div
        style={{
          flex: "0 0 55%",
          backgroundColor: primaryColor,
          display: "flex",
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "0 5%",
          gap: "3%",
        }}
      >
        {includeLogo ? (
          <BrandLogo size="md" backgroundColor={primaryColor} />
        ) : (
          <span style={{ color: mutedInk, fontWeight: 700, fontSize: "1rem" }}>
            {localLabel}
          </span>
        )}
        <p
          style={{
            margin: 0,
            color: ink,
            fontSize: "clamp(1.2rem, 4vw, 2.5rem)",
            fontWeight: 900,
            letterSpacing: "0.06em",
          }}
        >
          {localDisplay}
        </p>
      </div>
      <div
        style={{
          flex: 1,
          backgroundColor: accentColor || secondaryColor,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "0 4%",
        }}
      >
        <div style={{ width: "70%", height: "55%" }}>
          <ChevronRow color={accentInk} count={8} />
        </div>
      </div>
    </div>
  );
}
