import { ImageResponse } from "next/og";
import { PLATFORM_UNION_ORANGE } from "@/lib/constants/unionPresets";
import { SITE_NAME } from "@/lib/seo/site";

export const runtime = "edge";
export const alt = `${SITE_NAME} - Solidarity.`;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

/** Inline UO mark (black on transparent) — avoids remote fetch failures in OG render. */
const MARK_SRC = `data:image/svg+xml,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
  <circle cx="44" cy="34" r="14" fill="none" stroke="#1A1A1A" stroke-width="10"/>
  <path d="M12 14v20a14 14 0 0 0 28 0V14" fill="none" stroke="#1A1A1A" stroke-width="10" stroke-linecap="butt" stroke-linejoin="round" opacity="0.88"/>
</svg>`)}`;

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
          <div
            style={{
              display: "flex",
              width: 96,
              height: 96,
              borderRadius: 21,
              backgroundColor: "#FFFFFF",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            {/* ImageResponse requires a plain img; next/image is unsupported here */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={MARK_SRC}
              width={72}
              height={72}
              alt=""
              style={{ objectFit: "contain" }}
            />
          </div>
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
