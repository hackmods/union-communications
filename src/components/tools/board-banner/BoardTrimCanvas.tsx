"use client";

import type { TrimPieceId } from "@/lib/constants/board-banner-layouts";
import { pickContrastingInk } from "@/lib/utils/ink";

export interface BoardTrimCanvasProps {
  piece: TrimPieceId;
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  localNumber: string;
  className?: string;
}

function VerticalChevrons({
  color,
  bg,
}: {
  color: string;
  bg: string;
}) {
  const rows = 12;
  const vbH = rows * 28;
  return (
    <svg
      viewBox={`0 0 40 ${vbH}`}
      width="100%"
      height="100%"
      preserveAspectRatio="xMidYMid slice"
      aria-hidden="true"
      style={{ display: "block" }}
    >
      <rect width="40" height={vbH} fill={bg} />
      {Array.from({ length: rows }, (_, y) => (
        <path
          key={y}
          d={`M8 ${4 + y * 28} L28 ${16 + y * 28} L8 ${28 + y * 28}`}
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

/**
 * Trim pieces sized by parent:
 * - side: tall narrow column (edgeW × sheet usable height)
 * - bottom: horizontal strip (full usable width × strip height)
 * - corner: square (edgeW × edgeW)
 */
export function BoardTrimCanvas({
  piece,
  primaryColor,
  secondaryColor,
  accentColor,
  localNumber,
  className,
}: BoardTrimCanvasProps) {
  const ink = pickContrastingInk(primaryColor);
  const accent = accentColor || secondaryColor;
  const localDisplay = `LOCAL ${localNumber}`;

  if (piece === "side") {
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
        <div
          aria-hidden="true"
          style={{
            flex: "0 0 12%",
            backgroundColor: accent,
          }}
        />
        <div style={{ flex: 1, minHeight: 0, position: "relative" }}>
          <VerticalChevrons color={secondaryColor} bg={primaryColor} />
          <p
            style={{
              position: "absolute",
              left: "50%",
              top: "50%",
              margin: 0,
              transform: "translate(-50%, -50%) rotate(-90deg)",
              transformOrigin: "center",
              color: ink,
              fontWeight: 900,
              fontSize: "clamp(0.55rem, 1.6vmin, 0.85rem)",
              letterSpacing: "0.14em",
              whiteSpace: "nowrap",
            }}
          >
            {localDisplay}
          </p>
        </div>
        <div
          aria-hidden="true"
          style={{
            flex: "0 0 12%",
            backgroundColor: secondaryColor,
          }}
        />
      </div>
    );
  }

  if (piece === "bottom") {
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
          <HorizontalChevrons color={ink} bg={primaryColor} />
        </div>
        <div
          style={{
            flex: 1,
            minHeight: 0,
            display: "flex",
            backgroundColor: accent,
          }}
        >
          <div style={{ flex: "0 0 22%", backgroundColor: secondaryColor }} />
          <div style={{ flex: 1, backgroundColor: accent }} />
          <div style={{ flex: "0 0 22%", backgroundColor: primaryColor }} />
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
          <p
            style={{
              margin: 0,
              color: pickContrastingInk(secondaryColor),
              fontWeight: 800,
              fontSize: "clamp(0.65rem, 2vmin, 1.1rem)",
              letterSpacing: "0.1em",
            }}
          >
            {localDisplay}
          </p>
        </div>
      </div>
    );
  }

  // corner — L-miter via SVG (square tile)
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
        <path
          d="M48 48 L62 55 L48 62"
          fill="none"
          stroke={secondaryColor}
          strokeWidth="3"
          strokeLinecap="square"
        />
        <path
          d="M68 48 L82 55 L68 62"
          fill="none"
          stroke={secondaryColor}
          strokeWidth="3"
          strokeLinecap="square"
        />
        <path
          d="M48 68 L62 75 L48 82"
          fill="none"
          stroke={secondaryColor}
          strokeWidth="3"
          strokeLinecap="square"
        />
      </svg>
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
    </div>
  );
}
