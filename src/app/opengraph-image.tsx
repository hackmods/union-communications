import { ImageResponse } from "next/og";
import { PLATFORM_UNION_ORANGE } from "@/lib/constants/unionPresets";
import { SITE_NAME } from "@/lib/seo/site";
import {
  UNIONOPS_O,
  UNIONOPS_U_OPACITY,
  UNIONOPS_U_PATH,
  UNIONOPS_U_STROKE_WIDTH,
} from "@/lib/brand/unionops-mark-geometry";

export const runtime = "edge";
export const alt = `${SITE_NAME} - Solidarity.`;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpenGraphImage() {
  const primary = PLATFORM_UNION_ORANGE.primary;
  const accent = PLATFORM_UNION_ORANGE.accent;

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          background: `linear-gradient(145deg, ${primary} 0%, ${accent} 100%)`,
          padding: "64px 72px",
          color: "#FFFFFF",
          fontFamily: "system-ui, sans-serif",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 28 }}>
          <svg width="96" height="96" viewBox="0 0 64 64">
            <rect width="64" height="64" rx="14" fill="#FFFFFF" />
            <circle
              cx={UNIONOPS_O.cx}
              cy={UNIONOPS_O.cy}
              r={UNIONOPS_O.r}
              fill="none"
              stroke={primary}
              strokeWidth={UNIONOPS_O.strokeWidth}
            />
            <path
              d={UNIONOPS_U_PATH}
              fill="none"
              stroke={primary}
              strokeWidth={UNIONOPS_U_STROKE_WIDTH}
              strokeLinecap="butt"
              strokeLinejoin="round"
              opacity={UNIONOPS_U_OPACITY}
            />
          </svg>
          <div
            style={{
              display: "flex",
              fontSize: 64,
              fontWeight: 800,
              letterSpacing: "-1px",
            }}
          >
            {SITE_NAME}
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <div style={{ fontSize: 48, fontWeight: 700 }}>Solidarity.</div>
          <div
            style={{
              fontSize: 28,
              opacity: 0.92,
              maxWidth: 900,
              lineHeight: 1.35,
            }}
          >
            Free tools for union stewards and officers. Comms stay on your
            device.
          </div>
        </div>

        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            borderTop: "2px solid rgba(255,255,255,0.35)",
            paddingTop: 28,
            fontSize: 22,
            letterSpacing: "0.08em",
            textTransform: "uppercase",
            opacity: 0.95,
          }}
        >
          <span>Free tools for union locals</span>
          <span>unionops.org</span>
        </div>
      </div>
    ),
    { ...size },
  );
}
