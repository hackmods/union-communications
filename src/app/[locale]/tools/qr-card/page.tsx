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
import {
  DEFAULT_QR_CARD_SIZE,
  QR_CARD_SIZE_ORDER,
  QR_CARD_SIZES,
  qrCardExportPixelRatio,
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
import { canvasSurfaceStyle } from "@/lib/utils/canvas-surface";
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
  includeBranding: boolean;
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
    includeBranding: false,
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
      includeBranding: themeEstablished,
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
      aspectRatio: `${size.widthInches} / ${size.heightInches}`,
    };
    const ink = pickContrastingInk(state.primaryColor);
    if (state.bgMode === "gradient") {
      return {
        ...box,
        backgroundImage: `linear-gradient(160deg, ${state.primaryColor} 0%, ${state.secondaryColor} 100%)`,
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
  const isCompact = state.sizeId === "square4" || state.sizeId === "quarter";

  /** QR plate as % of card width - smaller cards keep more room for copy */
  const qrPlatePercent = isReference
    ? state.sizeId === "square4"
      ? 26
      : 28
    : state.sizeId === "square4"
      ? 34
      : state.sizeId === "square5"
        ? 36
        : state.sizeId === "quarter"
          ? 38
          : state.sizeId === "half"
            ? 42
            : 34;

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

  const titleFontPx = walletTitleFontSizePx(
    tokens,
    size.previewWidthPx,
    { reference: isReference },
  );
  const bodyFontPx = walletBodyFontSizePx(tokens, size.previewWidthPx);
  const metaFontPx = walletMetaFontSizePx(tokens, size.previewWidthPx);
  const contentPadPx = walletContentPaddingPx(tokens, size.previewWidthPx);
  const contentGapPx = walletContentGapPx(tokens, size.previewWidthPx);
  const textAlign = textAlignFromBias(tokens.alignmentBias);
  const flexAlign = flexAlignFromBias(tokens.alignmentBias);
  const brandJustify =
    tokens.alignmentBias === "center"
      ? "center"
      : tokens.alignmentBias === "asymmetric"
        ? "flex-end"
        : "flex-start";

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
            <p className="text-sm leading-snug text-gray-600">{t("sizeTip")}</p>
          </div>
          </section>

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

            <label className="flex min-h-11 items-center gap-2.5 text-sm text-opseu-dark">
              <input
                type="checkbox"
                checked={state.includeBranding}
                onChange={(e) =>
                  setState({ ...state, includeBranding: e.target.checked })
                }
                className="size-4"
              />
              {t("includeBranding")}
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
                includeBranding: themeEstablished,
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
        <div className="mx-auto w-fit max-w-full">
          <div className="rounded-lg border border-gray-200 bg-gray-100/80 p-4 md:p-6">
            <div
              className="min-w-0"
              style={{ width: size.previewWidthPx, maxWidth: "100%" }}
            >
              {/* Shadow stays outside canvasRef — box-shadow oklch from Tailwind breaks PNG capture */}
              <div className="shadow-lg">
                <div
                  ref={canvasRef}
                  data-export-root=""
                  className="relative flex w-full min-w-0 flex-col overflow-hidden"
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
                      isReference ? "justify-start" : "justify-between",
                    )}
                    style={{
                      alignItems: flexAlign,
                      textAlign,
                      padding: contentPadPx,
                      gap: contentGapPx,
                    }}
                  >
                    <div className="w-full min-w-0 shrink-0">
                      {state.includeBranding ? (
                        <div
                          className="mb-2 flex"
                          style={{ justifyContent: brandJustify }}
                        >
                          <BrandLogo
                            size="sm"
                            backgroundColor={state.primaryColor}
                          />
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
                        }}
                      >
                        {state.title}
                      </h2>
                      {state.description.trim() ? (
                        <p
                          className={cn(
                            "mt-1 leading-snug",
                            isReference && "whitespace-pre-line",
                          )}
                          style={{
                            color: mutedInk,
                            fontSize: bodyFontPx,
                            textAlign,
                            fontFamily: tokens.bodyFontFamily,
                          }}
                        >
                          {state.description}
                        </p>
                      ) : null}
                    </div>

                    <div
                      className={cn(
                        "flex min-h-0 w-full min-w-0 flex-col justify-center",
                        isReference && "mt-auto",
                      )}
                      style={{ alignItems: "center" }}
                    >
                      <CanvasQrPlate
                        tokens={tokens}
                        qrSrc={qrSrc}
                        alt=""
                        widthPercent={qrPlatePercent}
                        accentColor={state.secondaryColor}
                      />
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

                    {state.includeBranding ? (
                      <p
                        className="shrink-0 font-semibold"
                        style={{
                          color: mutedInk,
                          fontSize: metaFontPx,
                          textAlign,
                          width: "100%",
                          fontFamily: tokens.bodyFontFamily,
                        }}
                      >
                        {localLabel}
                      </p>
                    ) : (
                      <span className="h-2 shrink-0" aria-hidden />
                    )}
                  </div>
                </div>
              </div>
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
