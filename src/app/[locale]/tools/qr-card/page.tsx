"use client";

import { Suspense, useEffect, useRef, useState, type CSSProperties } from "react";
import { useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { useBrandStore } from "@/store/brand-store";
import { useUndoRedo } from "@/hooks/use-undo-redo";
import { useExportHandler } from "@/hooks/use-export-handler";
import { useOneShotBrandSeed } from "@/hooks/use-one-shot-brand-seed";
import { exportNodeAsPng } from "@/lib/export/image-export";
import { nodeToPdf } from "@/lib/export/pdf-export";
import { qrDataUrl } from "@/lib/export/qr";
import { formatFilename, resolveLocalNumber, cn } from "@/lib/utils";
import { isBrandThemeEstablished } from "@/lib/utils/brand-theme";
import { BrandSetupPrompt } from "@/components/tools/BrandSetupPrompt";
import {
  listSavedLinks,
  resolvePresetDestination,
} from "@/lib/utils/local-links";
import { FitWidthFrame } from "@/components/tools/FitWidthFrame";
import {
  DEFAULT_QR_CARD_SIZE,
  QR_CARD_SIZE_ORDER,
  QR_CARD_SIZES,
  isQrCardSquareSize,
  qrCardExportPixelRatio,
  qrCardPreviewHeightPx,
  type QrCardSizeId,
} from "@/lib/constants/qr-card-sizes";
import {
  QR_CARD_PRESETS,
  getQrCardPreset,
  type QrCardBgMode,
} from "@/lib/constants/qr-card-presets";
import { BrandLogo } from "@/components/brand/BrandLogo";
import { Button } from "@/components/ui/Button";
import { Input, Textarea } from "@/components/ui/Input";
import { Card } from "@/components/ui/Card";
import { ToolColourSection } from "@/components/tools/ToolColourSection";
import { PageShell } from "@/components/layout/PageShell";
import { UndoRedoBar } from "@/components/tools/UndoRedoBar";
import { ToolEditorLayout } from "@/components/tools/ToolEditorLayout";
import { ToolRelatedFooter } from "@/components/tools/ToolRelatedFooter";
import { ToolFormDetails } from "@/components/tools/ToolFormDetails";
import { SegControl } from "@/components/tools/SegControl";
import { CanvasBrandingControls } from "@/components/tools/CanvasBrandingControls";
import type { BoardLogoMode } from "@/lib/constants/board-banner-ornaments";
import {
  defaultLogoMode,
  defaultShowLocalNumber,
  resolveLogoVariant,
  showCanvasLogo,
} from "@/lib/comms/canvas-logo-mode";
import { mutedInkOnBackground, pickContrastingInk } from "@/lib/utils/ink";
import { meetsWcagAA } from "@/lib/utils/contrast";
import {
  flexAlignFromBias,
  resolveCanvasTokens,
  textAlignFromBias,
  walletBodyFontSizePx,
  walletContentGapPx,
  walletContentPaddingPx,
  walletMetaFontSizePx,
  walletTitleFontSizePx,
} from "@/lib/utils/canvas-tokens";
import {
  canvasSurfaceStyle,
  softGradientFillStyle,
} from "@/lib/utils/canvas-surface";
import {
  CanvasGrainOverlay,
  CanvasQrPlate,
  CanvasUrlCaption,
} from "@/components/tools/canvas";

interface QrCardState {
  presetId: string;
  destination: string;
  title: string;
  description: string;
  tagline: string;
  bgMode: QrCardBgMode;
  sizeId: QrCardSizeId;
  showUrl: boolean;
  logoMode: BoardLogoMode;
  showLocalNumber: boolean;
  primaryColor: string;
  secondaryColor: string;
}

export default function QrCardPage() {
  return (
    <Suspense
      fallback={
        <PageShell className="py-6 md:py-8 lg:py-10">
          <h1 className="text-2xl font-bold text-opseu-dark md:text-3xl">
            QR Link Card Maker
          </h1>
        </PageShell>
      }
    >
      <QrCardPageContent />
    </Suspense>
  );
}

function QrCardPageContent() {
  const t = useTranslations("qrCard");
  const tc = useTranslations("common");
  const searchParams = useSearchParams();
  const brandKit = useBrandStore((s) => s.brandKit);
  const onboardingComplete = useBrandStore((s) => s.onboardingComplete);
  const hydrated = useBrandStore((s) => s.hydrated);
  const canvasRef = useRef<HTMLDivElement>(null);
  const [qrSrc, setQrSrc] = useState<string | null>(null);
  const brandSeedComplete = useRef(false);
  const deepLinkApplied = useRef(false);

  const themeEstablished = isBrandThemeEstablished(brandKit, onboardingComplete);
  const first = QR_CARD_PRESETS[0];

  const initial: QrCardState = {
    presetId: first.id,
    destination: "",
    title: "",
    description: "",
    tagline: "",
    bgMode: first.bgMode,
    sizeId: DEFAULT_QR_CARD_SIZE,
    showUrl: false,
    logoMode: "none",
    showLocalNumber: defaultShowLocalNumber(),
    primaryColor: brandKit.primaryColor,
    secondaryColor: brandKit.secondaryColor,
  };

  const { state, setState, undo, redo, canUndo, canRedo, reset } =
    useUndoRedo<QrCardState>(initial);
  const { exportError, exportSuccess, exporting, runExport } = useExportHandler();

  const applyPreset = (id: string, base: QrCardState = state) => {
    const preset = getQrCardPreset(id);
    if (!preset) return;
    const origin = typeof window !== "undefined" ? window.location.origin : "";
    const fromPreset = preset.defaultUrl.trim();
    setState({
      ...base,
      presetId: preset.id,
      destination:
        fromPreset || resolvePresetDestination(preset.id, brandKit, origin),
      title: t(`presets.${preset.titleKey}`),
      description: t(`presets.${preset.descriptionKey}`),
      tagline: t(`presets.${preset.taglineKey}`),
      bgMode: preset.bgMode,
    });
  };

  useOneShotBrandSeed(hydrated, () => {
    const origin = typeof window !== "undefined" ? window.location.origin : "";
    const deepPreset = searchParams.get("preset");
    const fromDeep =
      deepPreset && getQrCardPreset(deepPreset)
        ? getQrCardPreset(deepPreset)!
        : first;
    if (deepPreset && getQrCardPreset(deepPreset)) {
      deepLinkApplied.current = true;
    }
    const fromPreset = fromDeep.defaultUrl.trim();
    reset({
      presetId: fromDeep.id,
      destination:
        fromPreset ||
        resolvePresetDestination(fromDeep.id, brandKit, origin),
      title: t(`presets.${fromDeep.titleKey}`),
      description: t(`presets.${fromDeep.descriptionKey}`),
      tagline: t(`presets.${fromDeep.taglineKey}`),
      bgMode: fromDeep.bgMode,
      sizeId: DEFAULT_QR_CARD_SIZE,
      showUrl: false,
      logoMode: defaultLogoMode(themeEstablished),
      showLocalNumber: defaultShowLocalNumber(),
      primaryColor: brandKit.primaryColor,
      secondaryColor: brandKit.secondaryColor,
    });
    brandSeedComplete.current = true;
  });

  useEffect(() => {
    if (!brandSeedComplete.current || deepLinkApplied.current) return;
    const raw = searchParams.get("preset");
    if (!raw || !getQrCardPreset(raw)) return;
    deepLinkApplied.current = true;
    applyPreset(raw);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- one-shot deep link
  }, [searchParams, hydrated]);

  const size = QR_CARD_SIZES[state.sizeId];
  const designWidth = size.previewWidthPx;
  const designHeight = qrCardPreviewHeightPx(size);
  const exportPixelRatio = qrCardExportPixelRatio(size);
  const tokens = resolveCanvasTokens(brandKit);
  const savedLinks = listSavedLinks(brandKit, {
    website: t("savedWebsite"),
    facebook: t("savedFacebook"),
  });
  const activePreset = getQrCardPreset(state.presetId);
  const isReference = activePreset?.layoutMode === "reference";

  useEffect(() => {
    let cancelled = false;
    const destination = state.destination.trim();
    const timer = window.setTimeout(() => {
      const task = destination
        ? qrDataUrl(destination, { width: size.qrPixels })
        : Promise.resolve(null);
      void task.then((url) => {
        if (!cancelled) setQrSrc(url);
      });
    }, 250);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [state.destination, size.qrPixels]);

  const localLabel = brandKit.local.subText
    ? `Local ${resolveLocalNumber(brandKit.local.localNumber)} - ${brandKit.local.subText}`
    : `Local ${resolveLocalNumber(brandKit.local.localNumber)}`;

  const canvasStyle: CSSProperties = (() => {
    const box: CSSProperties = {
      width: designWidth,
      height: designHeight,
      aspectRatio: `${size.widthInches} / ${size.heightInches}`,
    };
    const ink = pickContrastingInk(state.primaryColor);
    if (state.bgMode === "gradient") {
      return {
        ...box,
        ...softGradientFillStyle(state.primaryColor, state.secondaryColor),
        color: ink,
      };
    }
    // plain + accentBar: Brand Kit surface (soft-gradient / grain / accent-band) shows through
    return {
      ...box,
      ...canvasSurfaceStyle(tokens, {
        primary: state.primaryColor,
        secondary: state.secondaryColor,
        accent: state.secondaryColor,
      }),
      color: ink,
    };
  })();

  const canvasInk = pickContrastingInk(state.primaryColor);
  const mutedInk = mutedInkOnBackground(state.primaryColor, 0.9);
  const mutedInk80 = mutedInkOnBackground(state.primaryColor, 0.8);
  const taglineColor =
    state.bgMode === "plain" &&
    meetsWcagAA(state.secondaryColor, state.primaryColor, true)
      ? state.secondaryColor
      : canvasInk;
  const isSquare = isQrCardSquareSize(state.sizeId);
  const isCompact = isSquare || state.sizeId === "quarter";

  /** QR plate as % of card width - square formats keep more room for copy */
  const qrPlatePercent = isReference
    ? state.sizeId === "square4"
      ? 24
      : state.sizeId === "square5"
        ? 26
        : 28
    : state.sizeId === "square4"
      ? 24
      : state.sizeId === "square5"
        ? 26
        : state.sizeId === "quarter"
          ? 38
          : state.sizeId === "half"
            ? 42
            : 34;
  const referencePlatePx = isReference
    ? Math.round(size.previewWidthPx * (qrPlatePercent / 100))
    : null;

  const squareFontOpts = { square: isSquare } as const;
  const titleFontPx = walletTitleFontSizePx(
    tokens,
    size.previewWidthPx,
    { reference: isReference, ...squareFontOpts },
  );
  const bodyFontPx = walletBodyFontSizePx(tokens, size.previewWidthPx, squareFontOpts);
  const metaFontPx = walletMetaFontSizePx(tokens, size.previewWidthPx, squareFontOpts);
  const contentPadPx = walletContentPaddingPx(tokens, size.previewWidthPx, squareFontOpts);
  const contentGapPx = walletContentGapPx(tokens, size.previewWidthPx, squareFontOpts);

  /** Line-clamp description on dense canvases so QR + footer stay clear */
  const descriptionLineClamp = isReference
    ? isCompact
      ? 2
      : 4
    : isSquare
      ? 1
      : null;

  const handleExportPng = async () => {
    if (!canvasRef.current) return;
    await runExport(async () => {
      await exportNodeAsPng(
        canvasRef.current!,
        formatFilename(`qr-card-${state.sizeId}`, brandKit.local.localNumber, "png"),
        { pixelRatio: exportPixelRatio, backgroundColor: state.primaryColor },
      );
    });
  };

  const handleExportPdf = async () => {
    if (!canvasRef.current) return;
    await runExport(async () => {
      await nodeToPdf(
        canvasRef.current!,
        formatFilename(`qr-card-${state.sizeId}`, brandKit.local.localNumber, "pdf"),
        size.widthInches,
        size.heightInches,
        exportPixelRatio,
        state.primaryColor,
      );
    });
  };

  const textAlign = textAlignFromBias(tokens.alignmentBias);
  const flexAlign = flexAlignFromBias(tokens.alignmentBias);
  const brandJustify =
    tokens.alignmentBias === "center"
      ? "center"
      : tokens.alignmentBias === "asymmetric"
        ? "flex-end"
        : "flex-start";
  const useHeaderBranding = showCanvasLogo(state.logoMode) && isSquare;
  const autoMarkLogo = isCompact;
  const logoVariant = resolveLogoVariant(state.logoMode, {
    preferMark: autoMarkLogo,
  });
  const compactLocalLabel =
    showCanvasLogo(state.logoMode) &&
    state.showUrl &&
    (state.sizeId === "letter" || state.sizeId === "half");
  const localLabelFontPx = compactLocalLabel
    ? Math.max(9, Math.round(metaFontPx * 0.85))
    : metaFontPx;

  return (
    <ToolEditorLayout
      title={t("title")}
      description={t("subtitle")}
      purposeHint={t("whenToUse")}
      previewAccessibleName={t("previewAccessibleName")}
      exportError={exportError}
      exportSuccess={exportSuccess}
      footer={<ToolRelatedFooter toolSlug="qr-card" />}
      toolbar={
        !themeEstablished && hydrated ? (
          <BrandSetupPrompt themeEstablished={themeEstablished} />
        ) : null
      }
      form={
        <Card density="compact" className="space-y-5">
          <section className="space-y-3">
          <div>
            <label htmlFor="qr-preset" className="mb-1.5 block text-sm font-medium text-gray-700">
              {t("preset")}
            </label>
            <select
              id="qr-preset"
              value={state.presetId}
              onChange={(e) => applyPreset(e.target.value)}
              className="min-h-11 w-full rounded-md border border-gray-300 px-3 py-2"
            >
              {QR_CARD_PRESETS.map((p) => (
                <option key={p.id} value={p.id}>
                  {t(`presets.${p.titleKey}`)}
                </option>
              ))}
            </select>
          </div>

          <Input
            label={t("destination")}
            value={state.destination}
            onChange={(e) => setState({ ...state, destination: e.target.value })}
            placeholder="https://"
          />
          {savedLinks.length > 0 ? (
            <div>
              <label htmlFor="qr-saved-link" className="mb-1.5 block text-sm font-medium text-gray-700">
                {t("savedLinks")}
              </label>
              <select
                id="qr-saved-link"
                value=""
                onChange={(e) => {
                  const url = e.target.value;
                  if (url) setState({ ...state, destination: url });
                }}
                className="min-h-11 w-full rounded-md border border-gray-300 px-3 py-2"
              >
                <option value="">{t("savedLinksPlaceholder")}</option>
                {savedLinks.map((link) => (
                  <option key={link.id} value={link.url}>
                    {link.label}
                  </option>
                ))}
              </select>
            </div>
          ) : null}
          <Input
            label={t("cardTitle")}
            value={state.title}
            onChange={(e) => setState({ ...state, title: e.target.value })}
          />
          <Textarea
            label={t("description")}
            value={state.description}
            onChange={(e) => setState({ ...state, description: e.target.value })}
            rows={isReference ? 6 : 2}
          />
          <Input
            label={t("tagline")}
            value={state.tagline}
            onChange={(e) => setState({ ...state, tagline: e.target.value })}
          />
          </section>

          <ToolFormDetails title={tc("sectionLayout")}>
          <SegControl
            label={t("bgMode")}
            value={state.bgMode}
            options={(["plain", "gradient", "accentBar"] as const).map((mode) => ({
              value: mode,
              label: t(`bgModes.${mode}`),
            }))}
            onChange={(bgMode) => setState({ ...state, bgMode })}
          />

          <div className="space-y-2">
            <SegControl
              label={t("size")}
              value={state.sizeId}
              options={QR_CARD_SIZE_ORDER.map((id) => ({
                value: id,
                label: t(`sizes.${id}`),
              }))}
              onChange={(sizeId) => setState({ ...state, sizeId })}
            />
            <p className="text-sm leading-snug text-gray-600">
              {isSquare ? t("squareSizeTip") : t("sizeTip")}
            </p>
          </div>
            <CanvasBrandingControls
              logoMode={state.logoMode}
              onLogoModeChange={(logoMode) => setState({ ...state, logoMode })}
              showLocalNumber={state.showLocalNumber}
              onShowLocalNumberChange={(showLocalNumber) =>
                setState({ ...state, showLocalNumber })
              }
            />
          </ToolFormDetails>

          <ToolFormDetails title={tc("sectionOptions")}>
            <label className="flex min-h-11 items-center gap-2.5 text-sm text-opseu-dark">
              <input
                type="checkbox"
                checked={state.showUrl}
                onChange={(e) => setState({ ...state, showUrl: e.target.checked })}
                className="size-4"
              />
              {t("showUrl")}
            </label>
          </ToolFormDetails>

          <ToolColourSection
            primaryColor={state.primaryColor}
            secondaryColor={state.secondaryColor}
            onPrimaryChange={(c) => setState({ ...state, primaryColor: c })}
            onSecondaryChange={(c) => setState({ ...state, secondaryColor: c })}
          />

          <div className="space-y-3 border-t border-gray-200 pt-5">
          <UndoRedoBar
            canUndo={canUndo}
            canRedo={canRedo}
            onUndo={undo}
            onRedo={redo}
            onReset={() => {
              const origin =
                typeof window !== "undefined" ? window.location.origin : "";
              reset({
                ...initial,
                destination: resolvePresetDestination(first.id, brandKit, origin),
                title: t(`presets.${first.titleKey}`),
                description: t(`presets.${first.descriptionKey}`),
                tagline: t(`presets.${first.taglineKey}`),
                logoMode: defaultLogoMode(themeEstablished),
                showLocalNumber: defaultShowLocalNumber(),
                primaryColor: brandKit.primaryColor,
                secondaryColor: brandKit.secondaryColor,
              });
            }}
          />
          <div className="flex flex-wrap gap-3">
            <Button onClick={handleExportPng} disabled={exporting}>
              {exporting ? tc("exporting") : tc("downloadPng")}
            </Button>
            <Button
              variant="outline"
              onClick={handleExportPdf}
              disabled={exporting}
            >
              {tc("downloadPdf")}
            </Button>
          </div>
          </div>
        </Card>
      }
      previewActions={
        <>
          <Button onClick={handleExportPng} disabled={exporting}>
            {exporting ? tc("exporting") : tc("downloadPng")}
          </Button>
          <Button
            variant="outline"
            onClick={handleExportPdf}
            disabled={exporting}
          >
            {tc("downloadPdf")}
          </Button>
        </>
      }
      preview={
        <div className="mx-auto w-full min-w-0 max-w-full">
          <div className="rounded-lg border border-gray-200 bg-gray-100/80 p-4 md:p-6">
            {/* Shadow stays outside canvasRef — box-shadow oklch from Tailwind breaks PNG capture */}
            <div className="overflow-hidden rounded-lg shadow-lg">
              <FitWidthFrame
                designWidth={designWidth}
                designHeight={designHeight}
              >
                <div
                  ref={canvasRef}
                  data-export-root=""
                  className="relative flex min-w-0 flex-col overflow-hidden"
                  style={canvasStyle}
                >
                  <CanvasGrainOverlay opacity={tokens.grainOpacity} />
                  {state.bgMode === "accentBar" ? (
                    <div
                      className={cn(
                        "relative z-[2] w-full shrink-0",
                        isCompact ? "h-2" : "h-3",
                      )}
                      style={{ backgroundColor: state.secondaryColor }}
                    />
                  ) : null}

                  <div
                    className={cn(
                      "relative z-[2] flex min-h-0 min-w-0 flex-1 flex-col",
                      isReference || isSquare ? "justify-start" : "justify-between",
                    )}
                    style={{
                      alignItems: flexAlign,
                      textAlign,
                      padding: contentPadPx,
                      gap: contentGapPx,
                    }}
                  >
                    <div
                      className={cn(
                        "w-full min-w-0",
                        isReference || isSquare
                          ? "min-h-0 overflow-hidden"
                          : "shrink-0",
                      )}
                    >
                      {showCanvasLogo(state.logoMode) ? (
                        <div
                          className={cn("flex flex-col", isSquare ? "mb-1 gap-0.5" : "mb-2")}
                          style={{ alignItems: flexAlign, justifyContent: brandJustify }}
                        >
                          <BrandLogo
                            size="sm"
                            variantOverride={logoVariant}
                            backgroundColor={state.primaryColor}
                          />
                          {useHeaderBranding && state.showLocalNumber ? (
                            <p
                              className="truncate font-semibold leading-tight"
                              style={{
                                color: mutedInk,
                                fontSize: Math.max(9, Math.round(metaFontPx * 0.92)),
                                textAlign,
                                fontFamily: tokens.bodyFontFamily,
                              }}
                            >
                              {localLabel}
                            </p>
                          ) : null}
                        </div>
                      ) : null}
                      <h2
                        className="font-black uppercase leading-tight"
                        style={{
                          color: canvasInk,
                          fontSize: titleFontPx,
                          fontWeight: tokens.titleFontWeight,
                          letterSpacing: tokens.titleLetterSpacing,
                          textTransform: tokens.titleTextTransform,
                          fontFamily: tokens.headlineFontFamily,
                          ...(isSquare
                            ? {
                                display: "-webkit-box",
                                WebkitLineClamp: 2,
                                WebkitBoxOrient: "vertical" as const,
                                overflow: "hidden",
                              }
                            : {}),
                        }}
                      >
                        {state.title}
                      </h2>
                      {state.description.trim() ? (
                        <p
                          className={cn(
                            "mt-1 leading-snug",
                            (isReference || isSquare) && "whitespace-pre-line",
                          )}
                          style={{
                            color: mutedInk,
                            fontSize: bodyFontPx,
                            textAlign,
                            fontFamily: tokens.bodyFontFamily,
                            ...(descriptionLineClamp != null
                              ? {
                                  display: "-webkit-box",
                                  WebkitLineClamp: descriptionLineClamp,
                                  WebkitBoxOrient: "vertical" as const,
                                  overflow: "hidden",
                                }
                              : {}),
                          }}
                        >
                          {state.description}
                        </p>
                      ) : null}
                    </div>

                    <div
                      className={cn(
                        "flex w-full min-w-0 shrink-0 flex-col justify-center",
                        (isReference || isSquare) && "mt-auto",
                      )}
                      style={{
                        alignItems: "center",
                        ...(isReference
                          ? {
                              minHeight: referencePlatePx ?? undefined,
                            }
                          : {}),
                      }}
                    >
                      {referencePlatePx ? (
                        <div
                          className="shrink-0"
                          style={{
                            width: referencePlatePx,
                            height: referencePlatePx,
                            maxWidth: "100%",
                          }}
                        >
                          <CanvasQrPlate
                            tokens={tokens}
                            qrSrc={qrSrc}
                            alt=""
                            widthPercent={100}
                            accentColor={state.secondaryColor}
                          />
                        </div>
                      ) : (
                        <CanvasQrPlate
                          tokens={tokens}
                          qrSrc={qrSrc}
                          alt=""
                          widthPercent={qrPlatePercent}
                          accentColor={state.secondaryColor}
                        />
                      )}
                      {state.tagline.trim() ? (
                        <p
                          className="mt-1.5 font-bold uppercase tracking-wide"
                          style={{
                            color: taglineColor,
                            fontSize: metaFontPx,
                            textAlign,
                            width: "100%",
                            fontFamily: tokens.bodyFontFamily,
                          }}
                        >
                          {state.tagline}
                        </p>
                      ) : null}
                      {state.showUrl && state.destination.trim() ? (
                        <CanvasUrlCaption
                          url={state.destination}
                          color={mutedInk80}
                          fontSizePx={metaFontPx}
                          fontFamily={tokens.bodyFontFamily}
                          textAlign={textAlign}
                          maxLines={isCompact ? 2 : 3}
                          className="mt-1"
                        />
                      ) : null}
                    </div>

                    {showCanvasLogo(state.logoMode) &&
                    state.showLocalNumber &&
                    !useHeaderBranding ? (
                      <p
                        className="shrink-0 truncate font-semibold leading-tight"
                        style={{
                          color: mutedInk,
                          fontSize: localLabelFontPx,
                          textAlign,
                          width: "100%",
                          fontFamily: tokens.bodyFontFamily,
                        }}
                      >
                        {localLabel}
                      </p>
                    ) : !isSquare ? (
                      <span className="h-2 shrink-0" aria-hidden />
                    ) : null}
                  </div>
                </div>
              </FitWidthFrame>
            </div>
          </div>
          <p className="mt-3 text-center text-xs text-gray-500">
            {t("previewSize", {
              label: t(`sizes.${state.sizeId}`),
              width: size.widthInches,
              height: size.heightInches,
            })}
          </p>
        </div>
      }
    />
  );
}
