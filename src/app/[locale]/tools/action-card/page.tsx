"use client";

import { resolveTreatmentSurface, treatmentWalletFrameStyle } from "@/lib/brand/design-treatment-surface";

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
import { formatFilename, localLabel as formatLocalLabel, cn } from "@/lib/utils";
import { isBrandThemeEstablished } from "@/lib/utils/brand-theme";
import { BrandSetupPrompt } from "@/components/tools/BrandSetupPrompt";
import { listSavedLinks } from "@/lib/utils/local-links";
import { LogoContainer } from "@/components/canvas-core";
import { CanvasSheetPlate } from "@/components/tools/CanvasSheetPlate";
import {
  DEFAULT_QR_CARD_SIZE,
  QR_CARD_SIZE_ORDER,
  QR_CARD_SIZES,
  qrCardExportPixelRatio,
  qrCardPreviewHeightPx,
  type QrCardSizeId,
} from "@/lib/constants/qr-card-sizes";
import {
  ACTION_CARD_PRESETS,
  getActionCardPreset,
} from "@/lib/constants/action-card-presets";
import type { QrCardBgMode } from "@/lib/constants/qr-card-presets";
import { ToolLoadingFallback } from "@/components/tools/ToolLoadingFallback";
import { Button } from "@/components/ui/Button";
import { Input, Textarea } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Checkbox } from "@/components/ui/Checkbox";
import { PresetChips } from "@/components/tools/PresetChips";
import { ToolColourSection } from "@/components/tools/ToolColourSection";
import { UndoRedoBar } from "@/components/tools/UndoRedoBar";
import { ToolEditorLayout } from "@/components/tools/ToolEditorLayout";
import { ToolRelatedFooter } from "@/components/tools/ToolRelatedFooter";
import { ToolFormDetails } from "@/components/tools/ToolFormDetails";
import { DesignTreatmentControl } from "@/components/tools/DesignTreatmentControl";
import { resolveDesignTreatment } from "@/lib/brand/design-treatment";
import type { DesignTreatment } from "@/types/entities";
import { SegControl } from "@/components/tools/SegControl";
import { CanvasBrandingControls } from "@/components/tools/CanvasBrandingControls";
import type { BoardLogoMode } from "@/lib/constants/board-banner-ornaments";
import {
  INITIAL_LOGO_MODE,
  defaultLogoMode,
  defaultShowLocalNumber,
  resolveLogoVariant,
  showCanvasLogo,
} from "@/lib/comms/canvas-logo-mode";
import { mutedInkOnBackground, pickContrastingInk } from "@/lib/utils/ink";
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
import { CanvasTokenOverridesControls } from "@/components/tools/CanvasTokenOverridesControls";
import {
  EMPTY_CANVAS_TOKEN_OVERRIDES,
  resolveCanvasTokensWithOverrides,
  type CanvasTokenOverrides,
} from "@/lib/comms/canvas-token-overrides";
import {
  CanvasGrainOverlay,
  CanvasQrPlate,
  CanvasUrlCaption,
  WalletCopyBlock,
} from "@/components/tools/canvas";
import { meetsWcagAA } from "@/lib/utils/contrast";

interface ActionCardState {
  treatment: DesignTreatment;
  presetId: string;
  destination: string;
  headline: string;
  ask: string;
  deadline: string;
  cta: string;
  bgMode: QrCardBgMode;
  sizeId: QrCardSizeId;
  showUrl: boolean;
  logoMode: BoardLogoMode;
  showLocalNumber: boolean;
  primaryColor: string;
  secondaryColor: string;
  canvasOverrides: CanvasTokenOverrides;
}

export default function ActionCardPage() {
  return (
    <Suspense fallback={<ToolLoadingFallback />}>
      <ActionCardPageContent />
    </Suspense>
  );
}

function ActionCardPageContent() {
  const t = useTranslations("actionCard");
  const tc = useTranslations("common");
  const brandKit = useBrandStore((s) => s.brandKit);
  const onboardingComplete = useBrandStore((s) => s.onboardingComplete);
  const hydrated = useBrandStore((s) => s.hydrated);
  const searchParams = useSearchParams();
  const canvasRef = useRef<HTMLDivElement>(null);
  const deepLinkApplied = useRef(false);
  const brandSeedComplete = useRef(false);
  const [qrSrc, setQrSrc] = useState<string | null>(null);

  const themeEstablished = isBrandThemeEstablished(brandKit, onboardingComplete);
  const first = ACTION_CARD_PRESETS[0];

  const initial: ActionCardState = {
    treatment: resolveDesignTreatment(brandKit),
    presetId: first.id,
    destination: "",
    headline: "",
    ask: "",
    deadline: "",
    cta: "",
    bgMode: first.bgMode,
    sizeId: DEFAULT_QR_CARD_SIZE,
    showUrl: false,
    logoMode: INITIAL_LOGO_MODE,
    showLocalNumber: defaultShowLocalNumber(),
    primaryColor: brandKit.primaryColor,
    secondaryColor: brandKit.secondaryColor,
    canvasOverrides: { ...EMPTY_CANVAS_TOKEN_OVERRIDES },
  };

  const { state, setState, undo, redo, canUndo, canRedo, reset } =
    useUndoRedo<ActionCardState>(initial);
  const { exportError, exportSuccess, exporting, runExport } = useExportHandler();
  const [copyClamped, setCopyClamped] = useState(false);

  useOneShotBrandSeed(hydrated, () => {
    const deepPreset = searchParams.get("preset");
    const fromDeep =
      deepPreset && getActionCardPreset(deepPreset)
        ? getActionCardPreset(deepPreset)!
        : first;
    if (deepPreset && getActionCardPreset(deepPreset)) {
      deepLinkApplied.current = true;
    }
    reset({
      treatment: resolveDesignTreatment(brandKit),
      presetId: fromDeep.id,
      destination: "",
      headline: t(`presets.${fromDeep.headlineKey}`),
      ask: t(`presets.${fromDeep.askKey}`),
      deadline: t(`presets.${fromDeep.deadlineKey}`),
      cta: t(`presets.${fromDeep.ctaKey}`),
      bgMode: fromDeep.bgMode,
      sizeId: DEFAULT_QR_CARD_SIZE,
      showUrl: false,
      logoMode: defaultLogoMode(themeEstablished),
      showLocalNumber: defaultShowLocalNumber(),
      primaryColor: brandKit.primaryColor,
      secondaryColor: brandKit.secondaryColor,
      canvasOverrides: { ...EMPTY_CANVAS_TOKEN_OVERRIDES },
    });
    brandSeedComplete.current = true;
  });

  const applyPreset = (id: string) => {
    const preset = getActionCardPreset(id);
    if (!preset) return;
    setState({
      ...state,
      presetId: preset.id,
      headline: t(`presets.${preset.headlineKey}`),
      ask: t(`presets.${preset.askKey}`),
      deadline: t(`presets.${preset.deadlineKey}`),
      cta: t(`presets.${preset.ctaKey}`),
      bgMode: preset.bgMode,
    });
  };

  useEffect(() => {
    if (!brandSeedComplete.current || deepLinkApplied.current) return;
    const raw = searchParams.get("preset");
    if (!raw || !getActionCardPreset(raw)) return;
    deepLinkApplied.current = true;
    applyPreset(raw);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- one-shot deep link
  }, [searchParams, hydrated]);

  const size = QR_CARD_SIZES[state.sizeId];
  const designWidth = size.previewWidthPx;
  const designHeight = qrCardPreviewHeightPx(size);
  const brandCanvasTokens = resolveCanvasTokens(brandKit);
  const tokens = resolveCanvasTokensWithOverrides(
    brandKit,
    state.canvasOverrides,
  );
  const exportPixelRatio = qrCardExportPixelRatio(size);
  const savedLinks = listSavedLinks(brandKit, {
    website: t("savedWebsite"),
    facebook: t("savedFacebook"),
  });

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

  const localLabel = formatLocalLabel(
    brandKit.local.localNumber,
    brandKit.local.subText,
  );
  const treated = resolveTreatmentSurface(state.treatment, { primary: state.primaryColor, secondary: state.secondaryColor, accent: state.secondaryColor }, "sheet");
  const sheetPrimary = treated.primary;

  const canvasStyle: CSSProperties = (() => {
    const box: CSSProperties = {
      width: designWidth,
      height: designHeight,
      aspectRatio: `${size.widthInches} / ${size.heightInches}`,
    };
    const ink = pickContrastingInk(sheetPrimary);
    const border = treatmentWalletFrameStyle(state.treatment, state.primaryColor);
    if (state.bgMode === "gradient") {
      return {
        ...box,
        ...(state.treatment === "full" ? softGradientFillStyle(sheetPrimary, state.secondaryColor) : { backgroundColor: sheetPrimary }),
        color: ink,
        ...border,
      };
    }
    return {
      ...box,
      ...canvasSurfaceStyle(tokens, {
        primary: sheetPrimary,
        secondary: state.secondaryColor,
        accent: state.secondaryColor,
      }),
      color: ink,
      ...border,
    };
  })();

  const canvasInk = pickContrastingInk(sheetPrimary);
  const mutedInk = mutedInkOnBackground(sheetPrimary, 0.9);
  const mutedInk80 = mutedInkOnBackground(sheetPrimary, 0.8);
  const ctaColor =
    state.bgMode === "plain" &&
    meetsWcagAA(state.secondaryColor, sheetPrimary, true)
      ? state.secondaryColor
      : canvasInk;
  const isCompact = state.sizeId === "square4" || state.sizeId === "quarter";
  const autoMarkLogo =
    state.sizeId === "square4" ||
    state.sizeId === "square5" ||
    state.sizeId === "quarter";
  const canvasLogoMode =
    state.logoMode === "none"
      ? "none"
      : resolveLogoVariant(state.logoMode, { preferMark: autoMarkLogo }) ===
          "mark"
        ? "mark"
        : "lockup";
  const compactLocalLabel =
    showCanvasLogo(state.logoMode) &&
    state.showUrl &&
    (state.sizeId === "letter" || state.sizeId === "half");

  const qrPlatePercent =
    state.sizeId === "square4"
      ? 32
      : state.sizeId === "square5"
        ? 34
        : state.sizeId === "quarter"
          ? 36
          : state.sizeId === "half"
            ? 40
            : 32;

  const handleExportPng = async () => {
    if (!canvasRef.current) return;
    await runExport(async () => {
      await exportNodeAsPng(
        canvasRef.current!,
        formatFilename(
          `action-card-${state.sizeId}`,
          brandKit.local.localNumber,
          "png",
        ),
        { pixelRatio: exportPixelRatio, backgroundColor: sheetPrimary },
      );
    });
  };

  const handleExportPdf = async () => {
    if (!canvasRef.current) return;
    await runExport(async () => {
      await nodeToPdf(
        canvasRef.current!,
        formatFilename(
          `action-card-${state.sizeId}`,
          brandKit.local.localNumber,
          "pdf",
        ),
        size.widthInches,
        size.heightInches,
        exportPixelRatio,
        sheetPrimary,
      );
    });
  };

  const titleFontPx = walletTitleFontSizePx(tokens, size.previewWidthPx);
  const bodyFontPx = walletBodyFontSizePx(tokens, size.previewWidthPx);
  const metaFontPx = walletMetaFontSizePx(tokens, size.previewWidthPx);
  const localLabelFontPx = compactLocalLabel
    ? Math.max(9, Math.round(metaFontPx * 0.85))
    : metaFontPx;
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
      footer={<ToolRelatedFooter toolSlug="action-card" />}
      toolbar={
        !themeEstablished && hydrated ? (
          <BrandSetupPrompt themeEstablished={themeEstablished} />
        ) : null
      }
      form={
        <div className="space-y-5">
          <p className="text-sm leading-snug text-gray-600">{t("privacyHint")}</p>

          <section className="space-y-3">
          <PresetChips
            label={t("preset")}
            value={state.presetId}
            options={ACTION_CARD_PRESETS.map((p) => ({
              value: p.id,
              label: t(`presets.${p.headlineKey}`),
            }))}
            onChange={applyPreset}
          />

          <Input
            label={t("destination")}
            value={state.destination}
            onChange={(e) => setState({ ...state, destination: e.target.value })}
            placeholder="https://"
          />
          {savedLinks.length > 0 ? (
            <Select
              label={t("savedLinks")}
              value=""
              onChange={(e) => {
                const url = e.target.value;
                if (url) setState({ ...state, destination: url });
              }}
            >
              <option value="">{t("savedLinksPlaceholder")}</option>
              {savedLinks.map((link) => (
                <option key={link.id} value={link.url}>
                  {link.label}
                </option>
              ))}
            </Select>
          ) : null}

          <Input
            label={t("headline")}
            value={state.headline}
            onChange={(e) => setState({ ...state, headline: e.target.value })}
          />
          <Textarea
            label={t("ask")}
            value={state.ask}
            onChange={(e) => setState({ ...state, ask: e.target.value })}
            rows={3}
          />
          {copyClamped ? (
            <p className="text-sm leading-snug text-amber-800" role="status">
              {t("copyClampedHint")}
            </p>
          ) : null}
          <Input
            label={t("deadline")}
            value={state.deadline}
            onChange={(e) => setState({ ...state, deadline: e.target.value })}
            placeholder={t("deadlinePlaceholder")}
          />
          <Input
            label={t("cta")}
            value={state.cta}
            onChange={(e) => setState({ ...state, cta: e.target.value })}
          />
          </section>

          <DesignTreatmentControl primaryColor={state.primaryColor} value={state.treatment} onChange={(treatment) => setState({ ...state, treatment })} />
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
            <p className="text-sm leading-snug text-gray-600">{t("sizeTip")}</p>
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
            <CanvasTokenOverridesControls
              brandDefaults={{
                typeScale: brandCanvasTokens.typeScale,
                density: brandCanvasTokens.density,
                alignmentBias: brandCanvasTokens.alignmentBias,
                qrPlate: brandCanvasTokens.qrPlate,
                surface: brandCanvasTokens.surface,
              }}
              overrides={state.canvasOverrides}
              onChange={(canvasOverrides) =>
                setState({ ...state, canvasOverrides })
              }
            />

          <ToolFormDetails title={tc("sectionOptions")}>
            <Checkbox
              checked={state.showUrl}
              onChange={(e) => setState({ ...state, showUrl: e.target.checked })}
              label={t("showUrl")}
            />
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
              reset({
                ...initial,
                headline: t(`presets.${first.headlineKey}`),
                ask: t(`presets.${first.askKey}`),
                deadline: t(`presets.${first.deadlineKey}`),
                cta: t(`presets.${first.ctaKey}`),
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
        </div>
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
        <CanvasSheetPlate
          designWidth={designWidth}
          designHeight={designHeight}
          mode="fixed"
          maxScale={2}
          caption={t("previewSize", {
            label: t(`sizes.${state.sizeId}`),
            width: size.widthInches,
            height: size.heightInches,
          })}
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
                        "w-full shrink-0",
                        isCompact ? "h-2" : "h-3",
                      )}
                      style={{ backgroundColor: state.secondaryColor }}
                    />
                  ) : null}

                  <div
                    className="relative z-[2] flex min-h-0 min-w-0 flex-1 flex-col justify-start"
                    style={{
                      alignItems: flexAlign,
                      textAlign,
                      padding: contentPadPx,
                      gap: contentGapPx,
                    }}
                  >
                    <div
                      className="flex min-h-0 w-full min-w-0 flex-1 flex-col overflow-hidden"
                      style={{ gap: Math.max(4, Math.round(contentGapPx * 0.5)) }}
                    >
                      {showCanvasLogo(state.logoMode) ? (
                        <div
                          className="flex shrink-0"
                          style={{ justifyContent: brandJustify }}
                        >
                          <LogoContainer
                            backgroundColor={sheetPrimary}
                            logoMode={canvasLogoMode}
                            bounds={{
                              maxWidthCqw: isCompact ? 36 : 42,
                              align:
                                tokens.alignmentBias === "center"
                                  ? "center"
                                  : tokens.alignmentBias === "asymmetric"
                                    ? "end"
                                    : "start",
                            }}
                          />
                        </div>
                      ) : null}
                      <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
                        <WalletCopyBlock
                          className="min-h-0 flex-1"
                          title={state.headline}
                          body={
                            state.ask.trim() &&
                            state.ask.trim().toLowerCase() !==
                              state.headline.trim().toLowerCase()
                              ? state.ask
                              : undefined
                          }
                          titleFontPx={titleFontPx}
                          bodyFontPx={bodyFontPx}
                          titleColor={canvasInk}
                          bodyColor={mutedInk}
                          headlineFontFamily={tokens.headlineFontFamily}
                          bodyFontFamily={tokens.bodyFontFamily}
                          titleFontWeight={tokens.titleFontWeight}
                          titleLetterSpacing={tokens.titleLetterSpacing}
                          titleTextTransform={tokens.titleTextTransform}
                          textAlign={textAlign}
                          fit
                          onFitStateChange={({ clamped }) => setCopyClamped(clamped)}
                        />
                        {state.deadline.trim() ? (
                          <p
                            className="mt-1.5 shrink-0 font-bold uppercase tracking-wide"
                            style={{
                              color: ctaColor,
                              fontSize: metaFontPx,
                              textAlign,
                              fontFamily: tokens.bodyFontFamily,
                            }}
                          >
                            {state.deadline}
                          </p>
                        ) : null}
                      </div>
                    </div>

                    <div
                      className="flex min-h-0 w-full min-w-0 shrink-0 flex-col justify-center"
                      style={{ alignItems: "center" }}
                    >
                      <CanvasQrPlate
                        tokens={tokens}
                        qrSrc={qrSrc}
                        alt=""
                        widthPercent={qrPlatePercent}
                        accentColor={state.secondaryColor}
                      />
                      {state.cta.trim() ? (
                        <p
                          className="mt-1.5 font-bold uppercase tracking-wide"
                          style={{
                            color: ctaColor,
                            fontSize: metaFontPx,
                            textAlign,
                            width: "100%",
                            fontFamily: tokens.bodyFontFamily,
                          }}
                        >
                          {state.cta}
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

                    {showCanvasLogo(state.logoMode) && state.showLocalNumber ? (
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
                    ) : (
                      <span className="h-2 shrink-0" aria-hidden />
                    )}
                  </div>
                </div>
        </CanvasSheetPlate>
      }
    />
  );
}
