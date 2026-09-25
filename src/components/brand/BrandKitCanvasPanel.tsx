"use client";

import { useTranslations } from "next-intl";
import { useBrandStore } from "@/store/brand-store";
import { PublicHubPanel } from "@/components/comms/PublicHubPanel";
import { SegControl } from "@/components/tools/SegControl";
import {
  CANVAS_STYLE_IDS,
  canvasFromStyleId,
  resolveCanvasTokens,
} from "@/lib/utils/canvas-tokens";
import type {
  BrandKitCanvas,
  CanvasAlignmentBias,
  CanvasDensity,
  CanvasQrPlate as QrPlateToken,
  CanvasStyleId,
  CanvasSurface,
  CanvasTypeScale,
} from "@/types/entities";
import {
  CANVAS_FONT_ORDER,
  canvasBodyFontChoices,
  canvasFontFamily,
  type CanvasFontId,
} from "@/lib/comms/canvas-fonts";

const SURFACE_ORDER: CanvasSurface[] = [
  "flat",
  "soft-gradient",
  "accent-band",
  "grain",
  "duotone",
];

const FONT_OPTIONS = CANVAS_FONT_ORDER.map((id) => id);

export function BrandKitCanvasPanel() {
  const t = useTranslations("brandKit.canvas");
  const brandKit = useBrandStore((s) => s.brandKit);
  const setBrandKit = useBrandStore((s) => s.setBrandKit);

  const tokens = resolveCanvasTokens(brandKit);

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
    <PublicHubPanel title={t("title")} description={t("description")} className="space-y-4">

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

      <SegControl
        label={t("headlineFont")}
        value={tokens.headlineFontId}
        options={FONT_OPTIONS.map((id) => ({
          value: id,
          label: t(`fonts.${id}`),
          fontFamily: canvasFontFamily(id),
        }))}
        onChange={(headlineFontId) =>
          setToken("headlineFontId", headlineFontId as CanvasFontId)
        }
      />
      <SegControl
        label={t("bodyFont")}
        value={tokens.bodyFontId}
        options={canvasBodyFontChoices(tokens.bodyFontId).map((id) => ({
          value: id,
          label: t(`fonts.${id}`),
          fontFamily: canvasFontFamily(id),
        }))}
        onChange={(bodyFontId) =>
          setToken("bodyFontId", bodyFontId as CanvasFontId)
        }
      />
      <p className="text-xs text-gray-500">{t("bodyFontHint")}</p>

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
      <p className="text-xs text-gray-500">
        {t("typeScaleSizes", {
          title: tokens.titleFontSizePx,
          body: tokens.subtitleFontSizePx,
          tracking: tokens.titleLetterSpacing,
        })}
      </p>

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
    </PublicHubPanel>
  );
}
