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

function StripeBand({
  primary,
  secondary,
  accent,
  vertical,
}: {
  primary: string;
  secondary: string;
  accent: string;
  vertical: boolean;
}) {
  const stripes = [primary, secondary, accent || secondary, primary, secondary];
  return (
    <div
      style={{
        display: "flex",
        flexDirection: vertical ? "column" : "row",
        width: "100%",
        height: "100%",
      }}
      aria-hidden="true"
    >
      {stripes.map((color, i) => (
        <div
          key={i}
          style={{
            flex: 1,
            backgroundColor: color,
          }}
        />
      ))}
    </div>
  );
}

function ChevronField({
  color,
  bg,
  vertical,
}: {
  color: string;
  bg: string;
  vertical: boolean;
}) {
  const cols = vertical ? 2 : 6;
  const rows = vertical ? 8 : 2;
  const chevrons: { x: number; y: number }[] = [];
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      chevrons.push({ x: c, y: r });
    }
  }
  const vbW = cols * 32;
  const vbH = rows * 28;
  return (
    <svg
      viewBox={`0 0 ${vbW} ${vbH}`}
      width="100%"
      height="100%"
      preserveAspectRatio="xMidYMid slice"
      aria-hidden="true"
      style={{ display: "block", backgroundColor: bg }}
    >
      <rect width={vbW} height={vbH} fill={bg} />
      {chevrons.map(({ x, y }, i) => (
        <path
          key={i}
          d={
            vertical
              ? `M${8 + x * 32} ${4 + y * 28} L${24 + x * 32} ${16 + y * 28} L${8 + x * 32} ${28 + y * 28}`
              : `M${4 + x * 32} ${6 + y * 28} L${22 + x * 32} ${14 + y * 28} L${4 + x * 32} ${22 + y * 28}`
          }
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

export function BoardTrimCanvas({
  piece,
  primaryColor,
  secondaryColor,
  accentColor,
  localNumber,
  className,
}: BoardTrimCanvasProps) {
  const ink = pickContrastingInk(primaryColor);
  const bandAccent = accentColor || secondaryColor;

  if (piece === "side") {
    return (
      <div
        className={className}
        style={{
          boxSizing: "border-box",
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "row",
          overflow: "hidden",
          backgroundColor: "#FFFFFF",
          fontFamily: "Arial, Helvetica, sans-serif",
        }}
      >
        <div style={{ flex: "0 0 38%", minWidth: 0 }}>
          <StripeBand
            primary={primaryColor}
            secondary={secondaryColor}
            accent={bandAccent}
            vertical
          />
        </div>
        <div style={{ flex: 1, minWidth: 0, position: "relative" }}>
          <ChevronField
            color={secondaryColor}
            bg="#FFFFFF"
            vertical
          />
          <p
            style={{
              position: "absolute",
              bottom: "6%",
              left: 0,
              right: 0,
              margin: 0,
              textAlign: "center",
              color: primaryColor,
              fontWeight: 800,
              fontSize: "clamp(0.7rem, 2vw, 1.1rem)",
              letterSpacing: "0.08em",
            }}
          >
            LOCAL {localNumber}
          </p>
        </div>
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
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
          backgroundColor: "#FFFFFF",
          fontFamily: "Arial, Helvetica, sans-serif",
        }}
      >
        <div style={{ flex: "0 0 40%" }}>
          <ChevronField color={ink} bg={primaryColor} vertical={false} />
        </div>
        <div style={{ flex: 1 }}>
          <StripeBand
            primary={primaryColor}
            secondary={secondaryColor}
            accent={bandAccent}
            vertical={false}
          />
        </div>
        <div
          style={{
            flex: "0 0 18%",
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
              fontSize: "clamp(0.75rem, 2.2vw, 1.25rem)",
              letterSpacing: "0.1em",
            }}
          >
            LOCAL {localNumber}
          </p>
        </div>
      </div>
    );
  }

  // corner — L-shaped miter using clip path
  return (
    <div
      className={className}
      style={{
        boxSizing: "border-box",
        width: "100%",
        height: "100%",
        position: "relative",
        overflow: "hidden",
        backgroundColor: "#FFFFFF",
        fontFamily: "Arial, Helvetica, sans-serif",
      }}
    >
      <div
        style={{
          position: "absolute",
          inset: 0,
          backgroundColor: primaryColor,
          clipPath: "polygon(0 0, 100% 0, 100% 28%, 28% 28%, 28% 100%, 0 100%)",
        }}
      />
      <div
        style={{
          position: "absolute",
          inset: 0,
          backgroundColor: bandAccent,
          clipPath:
            "polygon(0 0, 100% 0, 100% 14%, 14% 14%, 14% 100%, 0 100%)",
          opacity: 0.9,
        }}
      />
      <div
        style={{
          position: "absolute",
          right: "8%",
          bottom: "8%",
          width: "55%",
          height: "55%",
        }}
      >
        <ChevronField color={secondaryColor} bg="#FFFFFF" vertical={false} />
      </div>
      <p
        style={{
          position: "absolute",
          top: "6%",
          left: "6%",
          margin: 0,
          color: ink,
          fontWeight: 900,
          fontSize: "clamp(0.7rem, 2vw, 1.1rem)",
          letterSpacing: "0.06em",
        }}
      >
        LOCAL {localNumber}
      </p>
    </div>
  );
}
