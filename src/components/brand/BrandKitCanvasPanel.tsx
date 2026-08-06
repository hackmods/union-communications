"use client";

import { useTranslations } from "next-intl";
import { useBrandStore } from "@/store/brand-store";
import { Card, CardTitle } from "@/components/ui/Card";
import { SegControl } from "@/components/tools/SegControl";
import {
  CanvasBrandHeader,
  CanvasGrainOverlay,
  CanvasQrPlate,
  CanvasTypeBlock,
} from "@/components/tools/canvas";
import {
  CANVAS_STYLE_IDS,
  canvasFromStyleId,
  resolveCanvasTokens,
} from "@/lib/utils/canvas-tokens";
import { canvasSurfaceStyle } from "@/lib/utils/canvas-surface";
import { pickContrastingInk } from "@/lib/utils/ink";
import type {
  BrandKitCanvas,
  CanvasAlignmentBias,
  CanvasDensity,
  CanvasQrPlate as QrPlateToken,
  CanvasStyleId,
  CanvasSurface,
  CanvasTypeScale,
} from "@/types/entities";

const SURFACE_ORDER: CanvasSurface[] = [
  "flat",
  "soft-gradient",
  "accent-band",
  "grain",
  "duotone",
];

export function BrandKitCanvasPanel() {
  const t = useTranslations("brandKit.canvas");
  const brandKit = useBrandStore((s) => s.brandKit);
  const setBrandKit = useBrandStore((s) => s.setBrandKit);

  const tokens = resolveCanvasTokens(brandKit);
  const ink = pickContrastingInk(brandKit.primaryColor);
  const surfaceStyle = canvasSurfaceStyle(tokens, {
    primary: brandKit.primaryColor,
    secondary: brandKit.secondaryColor,
    accent: brandKit.accentColor,
  });

  const patchCanvas = (next: BrandKitCanvas | null | undefined) => {
    setBrandKit({ canvas: next ?? null });
  };

  const setStyle = (styleId: CanvasStyleId | "legacy") => {
    if (styleId === "legacy") {
      patchCanvas(null);
      return;
    }
    patchCanvas(canvasFromStyleId(styleId));
  };

  const setToken = <K extends keyof BrandKitCanvas>(
    key: K,
    value: BrandKitCanvas[K],
  ) => {
    const base = brandKit.canvas ?? {};
    patchCanvas({ ...base, [key]: value });
  };

  const activeStyle =
    brandKit.canvas?.styleId &&
    CANVAS_STYLE_IDS.includes(brandKit.canvas.styleId)
      ? brandKit.canvas.styleId
      : "legacy";

  return (
    <Card density="compact" className="space-y-4">
      <div>
        <CardTitle>{t("title")}</CardTitle>
        <p className="mt-1 text-sm text-gray-600">{t("description")}</p>
      </div>

      <SegControl
        label={t("style")}
        value={activeStyle}
        options={[
          { value: "legacy", label: t("styles.legacy") },
          ...CANVAS_STYLE_IDS.map((id) => ({
            value: id,
            label: t(`styles.${id}`),
          })),
        ]}
        onChange={(v) => setStyle(v as CanvasStyleId | "legacy")}
      />

      <p className="text-xs text-gray-500">{t(`styleHints.${activeStyle}`)}</p>

      <div
        className="relative overflow-hidden rounded-md"
        style={{
          ...surfaceStyle,
          color: ink,
          minHeight: 160,
          padding: tokens.paddingPx / 2,
        }}
        aria-hidden
      >
        <CanvasGrainOverlay opacity={tokens.grainOpacity} />
        <CanvasBrandHeader
          backgroundColor={brandKit.primaryColor}
          localNumber={brandKit.local.localNumber}
          subText={brandKit.local.subText}
          logoSize="sm"
        />
        <CanvasTypeBlock
          tokens={tokens}
          title={t("previewHeadline")}
          ink={ink}
          accentColor={brandKit.secondaryColor}
          className="mt-3"
        />
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
          <CanvasQrPlate tokens={tokens} qrSrc={null} widthPercent={28} />
        </div>
        {tokens.surface === "duotone" ? (
          <p
            className="relative z-[2] mt-2 text-xs"
            style={{ color: ink, opacity: 0.85 }}
          >
            {t("duotoneNote")}
          </p>
        ) : null}
      </div>

      <details className="rounded-md border border-gray-200 p-3">
        <summary className="cursor-pointer text-sm font-medium text-gray-700">
          {t("advanced")}
        </summary>
        <div className="mt-3 space-y-3">
          <SegControl
            label={t("alignment")}
            value={tokens.alignmentBias}
            options={(["center", "start", "asymmetric"] as const).map((v) => ({
              value: v,
              label: t(`alignmentBias.${v}`),
            }))}
            onChange={(alignmentBias) =>
              setToken("alignmentBias", alignmentBias as CanvasAlignmentBias)
            }
          />
          <SegControl
            label={t("density")}
            value={tokens.density}
            options={(["roomy", "tight"] as const).map((v) => ({
              value: v,
              label: t(`densityOpts.${v}`),
            }))}
            onChange={(density) => setToken("density", density as CanvasDensity)}
          />
          <SegControl
            label={t("typeScale")}
            value={tokens.typeScale}
            options={(["compact", "display", "dense"] as const).map((v) => ({
              value: v,
              label: t(`typeScaleOpts.${v}`),
            }))}
            onChange={(typeScale) =>
              setToken("typeScale", typeScale as CanvasTypeScale)
            }
          />
          <SegControl
            label={t("qrPlate")}
            value={tokens.qrPlate}
            options={(["white-card", "inset", "flush"] as const).map((v) => ({
              value: v,
              label: t(`qrPlateOpts.${v}`),
            }))}
            onChange={(qrPlate) =>
              setToken("qrPlate", qrPlate as QrPlateToken)
            }
          />
          <SegControl
            label={t("surface")}
            value={tokens.surface}
            options={SURFACE_ORDER.map((v) => ({
              value: v,
              label: t(`surfaceOpts.${v}`),
            }))}
            onChange={(surface) => setToken("surface", surface as CanvasSurface)}
          />
        </div>
      </details>
    </Card>
  );
}
