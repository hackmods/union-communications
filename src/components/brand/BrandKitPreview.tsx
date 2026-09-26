"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { canvasPreviewQrTarget } from "@/lib/brand/canvas-preview-qr";
import { qrDataUrl } from "@/lib/export/qr";
import {
  CanvasBrandHeader,
  CanvasGrainOverlay,
  CanvasQrPlate,
  CanvasTypeBlock,
} from "@/components/tools/canvas";
import { resolveCanvasTokens } from "@/lib/utils/canvas-tokens";
import { canvasSurfaceStyle } from "@/lib/utils/canvas-surface";
import { pickContrastingInk } from "@/lib/utils/ink";
import { resolveDesignTreatment } from "@/lib/brand/design-treatment";
import type { BrandKit } from "@/types/entities";

/** A sample treatment built from the same Brand Kit tokens used by Comms canvases. */
export function BrandKitPreview({
  brandKit,
  hydrated,
}: {
  brandKit: BrandKit;
  hydrated: boolean;
}) {
  const t = useTranslations("brandKit.canvas");
  const [qrSrc, setQrSrc] = useState<string | null>(null);
  const qrTarget = canvasPreviewQrTarget(brandKit);

  useEffect(() => {
    if (!hydrated) return;
    let cancelled = false;
    const timer = window.setTimeout(() => {
      void qrDataUrl(qrTarget, { width: 160 }).then((url) => {
        if (!cancelled) setQrSrc(url);
      });
    }, 250);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [hydrated, qrTarget]);

  const tokens = resolveCanvasTokens(brandKit);
  const treatment = resolveDesignTreatment(brandKit);
  const ink = pickContrastingInk(brandKit.primaryColor);
  const surfaceStyle = canvasSurfaceStyle(tokens, {
    primary: brandKit.primaryColor,
    secondary: brandKit.secondaryColor,
    accent: brandKit.accentColor,
  });

  return (
    <div
      data-testid="brand-kit-preview"
      className="relative min-h-64 min-w-0 overflow-hidden rounded-lg"
      style={{
        ...(treatment === "paper" ? { backgroundColor: "#FFFFFF" } : surfaceStyle),
        color: treatment === "paper" ? "#1A1A1A" : ink,
        padding: tokens.paddingPx / 2,
      }}
      aria-hidden="true"
    >
      <CanvasGrainOverlay opacity={tokens.grainOpacity} />
      <div style={treatment === "paper" ? { borderTop: `8px solid ${brandKit.primaryColor}` } : undefined}>
      <CanvasBrandHeader
        backgroundColor={treatment === "paper" ? "#FFFFFF" : brandKit.primaryColor}
        localNumber={brandKit.local.localNumber}
        subText={brandKit.local.subText}
        logoSize="sm"
        fontFamily={tokens.bodyFontFamily}
      />
      </div>
      <div style={treatment === "balanced" ? {
        backgroundColor: "#FFFFFF", color: "#1A1A1A", padding: 12, borderRadius: 8,
      } : undefined}>
      <CanvasTypeBlock
        tokens={tokens}
        title={t("previewHeadline")}
        subtitle={t("previewBody")}
        ink={treatment === "full" ? ink : "#1A1A1A"}
        accentColor={brandKit.secondaryColor}
        className="mt-3"
      />
      </div>
      <div
        className="mt-3 flex"
        style={{
          justifyContent:
            tokens.alignmentBias === "center"
              ? "center"
              : tokens.alignmentBias === "asymmetric"
                ? "flex-end"
                : "flex-start",
        }}
      >
        <CanvasQrPlate
          tokens={tokens}
          qrSrc={qrSrc}
          widthPercent={28}
          accentColor={brandKit.secondaryColor}
        />
      </div>
      {tokens.surface === "duotone" ? (
        <p className="relative z-[2] mt-2 text-xs" style={{ color: ink, opacity: 0.85 }}>
          {t("duotoneNote")}
        </p>
      ) : null}
    </div>
  );
}
