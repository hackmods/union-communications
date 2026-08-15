"use client";

import { useEffect, useRef, useState } from "react";
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
  listMembershipDestinations,
  resolveLocalWebsiteUrl,
  resolvePresetDestination,
} from "@/lib/utils/local-links";
import { SITE_URL } from "@/lib/seo/site";
import {
  SOLIDARITY_SLOGANS,
  getSloganById,
  type PosterLayout,
} from "@/lib/constants/solidarity-slogans";
import {
  DEFAULT_DIGITAL_FORMAT,
  DEFAULT_PRINT_FORMAT,
  SOLIDARITY_POSTER_FORMATS,
  defaultFormatForMedium,
  exportPixelRatio,
  formatsForMedium,
  isLandscapeFormat,
  supportsPdf,
  type OutputMedium,
  type PosterFormatId,
  type SolidarityPosterFormat,
} from "@/lib/constants/solidarity-poster-formats";
import { BrandLogo } from "@/components/brand/BrandLogo";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Card } from "@/components/ui/Card";
import { ToolColourSection } from "@/components/tools/ToolColourSection";
import { UndoRedoBar } from "@/components/tools/UndoRedoBar";
import { ToolEditorLayout } from "@/components/tools/ToolEditorLayout";
import { ToolRelatedFooter } from "@/components/tools/ToolRelatedFooter";
import { ToolFormDetails } from "@/components/tools/ToolFormDetails";
import { SegControl } from "@/components/tools/SegControl";
import { inkWithAlpha, mutedInkOnBackground, pickContrastingInk } from "@/lib/utils/ink";
import { meetsWcagAA } from "@/lib/utils/contrast";
import {
  contentPaddingPx,
  flexAlignFromBias,
  resolveCanvasTokens,
  textAlignFromBias,
  typeScaleFactor,
} from "@/lib/utils/canvas-tokens";
import { canvasSurfaceStyle } from "@/lib/utils/canvas-surface";
import {
  CanvasEdgeClearanceFrame,
  CanvasGrainOverlay,
  CanvasQrPlate,
  CanvasSafeZoneOverlay,
} from "@/components/tools/canvas";
import {
  defaultEdgeClearanceForMedium,
  insetsForProfile,
  profileForSolidarityFormat,
} from "@/lib/utils/edge-clearance";

interface PosterState {
  sloganId: string;
  leadIn: string;
  headline: string;
  closer: string;
  layout: PosterLayout;
  supportUrl: string;
  showCta: boolean;
  showQr: boolean;
  includeBranding: boolean;
  edgeClearance: boolean;
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
}

function headlineLines(headline: string): string[] {
  return headline
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);
}

/** Spacing / type density keyed to print vs wallpaper aspect. */
function layoutChrome(format: SolidarityPosterFormat) {
  if (isLandscapeFormat(format)) {
    const ultraWide = format.id === "wide";
    // 16:9 / 19.5:9 previews are short — keep type small so header + body + footer fit
    return {
      padStack: ultraWide
        ? "box-border px-6 py-3 md:px-8 md:py-3.5"
        : "box-border px-8 py-4 md:px-10 md:py-4",
      padSplitSide: ultraWide ? "p-3 md:p-4" : "p-4 md:p-5",
      padSplitType: ultraWide ? "px-5 py-3 md:px-6" : "px-6 py-4 md:px-8",
      padBannerBar: ultraWide ? "px-5 py-1.5" : "px-6 py-2",
      padBannerBody: ultraWide ? "px-6 py-2 md:px-8" : "px-8 py-3 md:px-10",
      padFooterOuter: ultraWide
        ? "box-border px-6 pb-3 pt-1.5 md:px-8"
        : "box-border px-8 pb-3.5 pt-1.5 md:px-10",
      headlineStack: ultraWide
        ? "text-xl font-black uppercase leading-[0.95] tracking-tight md:text-2xl"
        : "text-2xl font-black uppercase leading-[0.95] tracking-tight md:text-3xl",
      headlineSplit: ultraWide
        ? "text-lg font-black uppercase leading-[0.95] tracking-tight md:text-xl"
        : "text-xl font-black uppercase leading-[0.95] tracking-tight md:text-2xl",
      closerStack: "mt-1.5 text-xs font-medium tracking-wide md:text-sm",
      closerBanner: "mt-1.5 text-xs font-medium",
      qrPx: ultraWide ? 40 : 48,
      footerGap: "gap-2 pt-1.5",
      urlClass: "mt-0.5 break-all text-[10px] leading-tight",
      ctaClass: "text-xs font-bold uppercase tracking-wide",
      isLandscape: true as const,
    };
  }

  if (format.id === "vertical") {
    return {
      padStack: "px-6 py-10 md:px-8 md:py-12",
      padSplitSide: "p-5 md:p-6",
      padSplitType: "px-5 py-8 md:px-6",
      padBannerBar: "px-5 py-3.5",
      padBannerBody: "px-6 py-8 md:px-8",
      padFooterOuter: "px-5 pb-6 md:px-6",
      headlineStack:
        "text-4xl font-black uppercase leading-[0.95] tracking-tight md:text-5xl",
      headlineSplit:
        "text-3xl font-black uppercase leading-[0.95] tracking-tight md:text-4xl",
      closerStack: "mt-5 text-base font-medium tracking-wide md:text-lg",
      closerBanner: "mt-4 text-sm font-medium md:text-base",
      qrPx: 64,
      footerGap: "gap-3 pt-3",
      urlClass: "mt-0.5 break-all text-xs leading-snug",
      ctaClass: "text-sm font-bold uppercase tracking-wide",
      isLandscape: false as const,
    };
  }

  return {
    padStack: "p-8 md:p-10",
    padSplitSide: "p-6",
    padSplitType: "px-6 py-8",
    padBannerBar: "px-6 py-4",
    padBannerBody: "px-8 py-6",
    padFooterOuter: "px-6 pb-6",
    headlineStack:
      "text-4xl font-black uppercase leading-[0.95] tracking-tight md:text-5xl lg:text-6xl",
    headlineSplit:
      "text-3xl font-black uppercase leading-[0.95] tracking-tight md:text-4xl lg:text-5xl",
    closerStack: "mt-6 text-lg font-medium tracking-wide",
    closerBanner: "mt-5 text-base font-medium",
    qrPx: 72,
    footerGap: "gap-3 pt-3",
    urlClass: "mt-0.5 break-all text-xs leading-snug",
    ctaClass: "text-sm font-bold uppercase tracking-wide",
    isLandscape: false as const,
  };
}

export default function SolidarityPosterPage() {
  const t = useTranslations("solidarityPoster");
  const tc = useTranslations("common");
  const brandKit = useBrandStore((s) => s.brandKit);
  const onboardingComplete = useBrandStore((s) => s.onboardingComplete);
  const hydrated = useBrandStore((s) => s.hydrated);
  const canvasRef = useRef<HTMLDivElement>(null);
  const [medium, setMedium] = useState<OutputMedium>("print");
  const [formatId, setFormatId] = useState<PosterFormatId>(DEFAULT_PRINT_FORMAT);
  const [lastFormatByMedium, setLastFormatByMedium] = useState<
    Record<OutputMedium, PosterFormatId>
  >({
    print: DEFAULT_PRINT_FORMAT,
    digital: DEFAULT_DIGITAL_FORMAT,
  });
  const [qrSrc, setQrSrc] = useState<string | null>(null);

  const first = SOLIDARITY_SLOGANS[0];
  const themeEstablished = isBrandThemeEstablished(brandKit, onboardingComplete);
  const format = SOLIDARITY_POSTER_FORMATS[formatId];
  const mediumFormats = formatsForMedium(medium);

  const initial: PosterState = {
    sloganId: first.id,
    leadIn: first.leadIn,
    headline: first.headline,
    closer: first.closer,
    layout: first.layout,
    supportUrl: "",
    showCta: true,
    showQr: true,
    includeBranding: false,
    edgeClearance: false,
    primaryColor: brandKit.primaryColor,
    secondaryColor: brandKit.secondaryColor,
    accentColor: brandKit.accentColor,
  };

  const { state, setState, undo, redo, canUndo, canRedo, reset } =
    useUndoRedo<PosterState>(initial);
  const { exportError, exportSuccess, exporting, runExport } = useExportHandler();

  useOneShotBrandSeed(hydrated, () => {
    const origin = typeof window !== "undefined" ? window.location.origin : "";
    const deepPreset =
      typeof window !== "undefined"
        ? new URLSearchParams(window.location.search).get("preset")
        : null;
    const fromDeep =
      deepPreset && getSloganById(deepPreset)
        ? getSloganById(deepPreset)!
        : first;
    reset({
      sloganId: fromDeep.id,
      leadIn: fromDeep.leadIn,
      headline: fromDeep.headline,
      closer: fromDeep.closer,
      layout: fromDeep.layout,
      supportUrl: resolveLocalWebsiteUrl(brandKit, origin) || SITE_URL,
      showCta: true,
      showQr: true,
      includeBranding: themeEstablished,
      edgeClearance: defaultEdgeClearanceForMedium("print"),
      primaryColor: brandKit.primaryColor,
      secondaryColor: brandKit.secondaryColor,
      accentColor: brandKit.accentColor,
    });
  });

  const supportUrlForQr = state.supportUrl.trim() || SITE_URL;

  useEffect(() => {
    let cancelled = false;
    const timer = window.setTimeout(() => {
      const task = state.showQr
        ? qrDataUrl(supportUrlForQr, { width: 140 })
        : Promise.resolve(null);
      void task.then((url) => {
        if (!cancelled) setQrSrc(url);
      });
    }, 250);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [state.showQr, supportUrlForQr]);

  const localNum = resolveLocalNumber(brandKit.local.localNumber);
  const localLabel = brandKit.local.subText
    ? `Local ${localNum} - ${brandKit.local.subText}`
    : `Local ${localNum}`;
  const showLockup =
    state.includeBranding &&
    (state.layout === "stack" || state.layout === "banner");
  const lines = headlineLines(state.headline);
  const chrome = layoutChrome(format);
  const isLandscape = chrome.isLandscape;
  const tokens = resolveCanvasTokens(brandKit);
  const surfaceStyle = canvasSurfaceStyle(tokens, {
    primary: state.primaryColor,
    secondary: state.secondaryColor,
    accent: state.accentColor,
  });
  const stackPadPx = contentPaddingPx(tokens, {
    factor: isLandscape ? 0.8 : 1,
  });
  const splitSidePadPx = contentPaddingPx(tokens, {
    factor: isLandscape ? 0.45 : 0.55,
  });
  const splitTypePadPx = contentPaddingPx(tokens, {
    factor: isLandscape ? 0.55 : 0.7,
  });
  const bannerBarPadY = Math.max(
    6,
    Math.round(contentPaddingPx(tokens, { factor: 0.28 })),
  );
  const bannerBodyPadPx = contentPaddingPx(tokens, {
    factor: isLandscape ? 0.55 : 0.75,
  });
  const qrPx = Math.round(
    chrome.qrPx * (tokens.density === "tight" ? 0.92 : 1) * typeScaleFactor(tokens),
  );
  const stackAlign = textAlignFromBias(tokens.alignmentBias);
  const stackItems = flexAlignFromBias(tokens.alignmentBias);
  const titleChrome = {
    fontWeight: tokens.titleFontWeight,
    letterSpacing: tokens.titleLetterSpacing,
    textTransform: tokens.titleTextTransform,
  } as const;
  const displayUrl = state.supportUrl.trim() || SITE_URL;
  const showLocalInFooter =
    state.includeBranding || state.layout === "split";
  const showFooter =
    state.showCta || state.showQr || showLocalInFooter;
  const canvasInk = pickContrastingInk(state.primaryColor);
  const mutedInk90 = mutedInkOnBackground(state.primaryColor, 0.9);
  const mutedInk80 = mutedInkOnBackground(state.primaryColor, 0.8);
  const mutedInk30 = inkWithAlpha(canvasInk, 0.3);
  const secondaryOnPrimary = meetsWcagAA(
    state.secondaryColor,
    state.primaryColor,
    true,
  )
    ? state.secondaryColor
    : canvasInk;
  const bannerBarBg = state.accentColor || state.secondaryColor;
  const bannerBarInk = pickContrastingInk(bannerBarBg);
  const splitSideInk = pickContrastingInk(state.secondaryColor);
  const clearanceInsets = insetsForProfile(
    profileForSolidarityFormat(formatId),
    state.edgeClearance,
  );

  const selectMedium = (next: OutputMedium) => {
    if (next === medium) return;
    const restored = lastFormatByMedium[next] ?? defaultFormatForMedium(next);
    setMedium(next);
    setFormatId(restored);
    setState({
      ...state,
      edgeClearance: defaultEdgeClearanceForMedium(next),
    });
  };

  const selectFormat = (id: PosterFormatId) => {
    setFormatId(id);
    setLastFormatByMedium((prev) => ({ ...prev, [medium]: id }));
  };

  const applyPreset = (id: string) => {
    const slogan = getSloganById(id);
    if (!slogan) return;
    setState({
      ...state,
      sloganId: slogan.id,
      leadIn: slogan.leadIn,
      headline: slogan.headline,
      closer: slogan.closer,
      layout: slogan.layout,
    });
  };

  const handleExportPng = async () => {
    if (!canvasRef.current) return;
    await runExport(async () => {
      await exportNodeAsPng(
        canvasRef.current!,
        formatFilename(format.filenameStem, brandKit.local.localNumber, "png"),
        {
          pixelRatio: exportPixelRatio(canvasRef.current!, format),
          // Hex fill — Tailwind oklch utilities break html-to-image capture
          backgroundColor: state.primaryColor,
        },
      );
    });
  };

  const handleExportPdf = async () => {
    if (!canvasRef.current || !supportsPdf(format)) return;
    await runExport(async () => {
      await nodeToPdf(
        canvasRef.current!,
        formatFilename(format.filenameStem, brandKit.local.localNumber, "pdf"),
        format.widthInches!,
        format.heightInches!,
        exportPixelRatio(canvasRef.current!, format),
        state.primaryColor,
      );
    });
  };

  const footer = showFooter ? (
    <div
      className={cn(
        "flex shrink-0 items-center justify-between",
        chrome.footerGap,
      )}
      style={{ borderTop: `1px solid ${mutedInk30}` }}
    >
      <div className="min-w-0 flex-1 pr-2 text-left">
        {state.showCta ? (
          <>
            <p className={chrome.ctaClass} style={{ color: canvasInk }}>
              {t("cta")}
            </p>
            <p className={chrome.urlClass} style={{ color: mutedInk90 }}>
              {displayUrl}
            </p>
          </>
        ) : null}
        {showLocalInFooter ? (
          <p
            className={cn("text-[10px] md:text-xs", state.showCta && "mt-0.5")}
            style={{ color: mutedInk80 }}
          >
            {localLabel}
          </p>
        ) : null}
      </div>
      {state.showQr && qrSrc ? (
        <div
          className="shrink-0 self-center"
          style={{ width: qrPx, maxWidth: "100%" }}
        >
          <CanvasQrPlate
            tokens={tokens}
            qrSrc={qrSrc}
            alt=""
            accentColor={state.secondaryColor}
          />
        </div>
      ) : null}
    </div>
  ) : null;

  return (
    <ToolEditorLayout
      title={t("title")}
      description={t("subtitle")}
      purposeHint={t("whenToUse")}
      exportError={exportError}
      exportSuccess={exportSuccess}
      footer={<ToolRelatedFooter toolSlug="solidarity-poster" />}
      previewAccessibleName={t("previewAccessibleName", {
        headline:
          state.headline.replace(/\n/g, " ").trim() || t("title"),
        color: state.primaryColor,
      })}
      toolbar={
        !themeEstablished && hydrated ? (
          <BrandSetupPrompt themeEstablished={themeEstablished} />
        ) : null
      }
      form={
        <Card density="compact" className="space-y-5">
          <div>
            <label htmlFor="slogan-preset" className="mb-1 block text-sm font-medium">
              {t("preset")}
            </label>
            <select
              id="slogan-preset"
              value={state.sloganId}
              onChange={(e) => applyPreset(e.target.value)}
              className="min-h-11 w-full rounded-md border border-gray-300 px-3 py-2"
            >
              {SOLIDARITY_SLOGANS.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.headline.replace(/\n/g, " ")}
                </option>
              ))}
            </select>
          </div>

          <Input
            label={t("leadIn")}
            value={state.leadIn}
            onChange={(e) => setState({ ...state, leadIn: e.target.value })}
          />
          <div>
            <label htmlFor="poster-headline" className="mb-1 block text-sm font-medium">
              {t("headline")}
            </label>
            <textarea
              id="poster-headline"
              value={state.headline}
              onChange={(e) => setState({ ...state, headline: e.target.value })}
              rows={3}
              className="w-full rounded-md border border-gray-300 px-3 py-2 font-semibold uppercase"
            />
            <p className="mt-1 text-xs text-gray-500">{t("headlineHint")}</p>
          </div>
          <Input
            label={t("closer")}
            value={state.closer}
            onChange={(e) => setState({ ...state, closer: e.target.value })}
          />

          <div>
            <label htmlFor="poster-layout" className="mb-1 block text-sm font-medium">
              {t("layout")}
            </label>
            <select
              id="poster-layout"
              value={state.layout}
              onChange={(e) =>
                setState({ ...state, layout: e.target.value as PosterLayout })
              }
              className="min-h-11 w-full rounded-md border border-gray-300 px-3 py-2"
            >
              {(["stack", "split", "banner"] as const).map((layout) => (
                <option key={layout} value={layout}>
                  {t(`layouts.${layout}`)}
                </option>
              ))}
            </select>
          </div>

          <SegControl
            label={t("outputMedium")}
            value={medium}
            options={(["print", "digital"] as const).map((m) => ({
              value: m,
              label: t(m === "print" ? "mediumPrint" : "mediumDigital"),
            }))}
            onChange={selectMedium}
          />

          <SegControl
            label={t("outputSize")}
            value={formatId}
            options={mediumFormats.map((f) => ({
              value: f.id,
              label: t(f.labelKey),
            }))}
            onChange={selectFormat}
          />
          {medium === "digital" ? (
            <p className="text-xs text-gray-500">{t("digitalHint")}</p>
          ) : null}

          <Input
            label={t("supportUrl")}
            value={state.supportUrl}
            onChange={(e) => setState({ ...state, supportUrl: e.target.value })}
            placeholder={SITE_URL}
          />
          {listMembershipDestinations(brandKit).length > 0 ? (
            <div>
              <label
                htmlFor="solidarity-membership-link"
                className="mb-1 block text-sm font-medium text-gray-700"
              >
                {t("membershipLink")}
              </label>
              <select
                id="solidarity-membership-link"
                className="min-h-11 w-full rounded-md border border-gray-300 px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-opseu-blue/40"
                defaultValue=""
                onChange={(e) => {
                  const id = e.target.value;
                  if (!id) return;
                  const origin =
                    typeof window !== "undefined" ? window.location.origin : "";
                  const url =
                    listMembershipDestinations(brandKit).find((d) => d.id === id)
                      ?.url ||
                    resolvePresetDestination("membership-primary", brandKit, origin);
                  if (url) setState({ ...state, supportUrl: url });
                  e.target.value = "";
                }}
              >
                <option value="">{t("membershipLinkPlaceholder")}</option>
                {listMembershipDestinations(brandKit).map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.label}
                  </option>
                ))}
              </select>
            </div>
          ) : null}

          <ToolFormDetails title={tc("sectionOptions")}>
            <label className="flex min-h-11 items-center gap-2.5 text-sm text-opseu-dark">
              <input
                type="checkbox"
                checked={state.showCta}
                onChange={(e) => setState({ ...state, showCta: e.target.checked })}
                className="size-4"
              />
              {t("showCta")}
            </label>

            <label className="flex min-h-11 items-center gap-2.5 text-sm text-opseu-dark">
              <input
                type="checkbox"
                checked={state.showQr}
                onChange={(e) => setState({ ...state, showQr: e.target.checked })}
                className="size-4"
              />
              {t("showQr")}
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

            <label className="flex min-h-11 items-center gap-2.5 text-sm text-opseu-dark">
              <input
                type="checkbox"
                checked={state.edgeClearance}
                onChange={(e) =>
                  setState({ ...state, edgeClearance: e.target.checked })
                }
                className="size-4"
              />
              {medium === "digital"
                ? t("edgeClearanceDigital")
                : t("edgeClearancePrint")}
            </label>
            <p className="text-xs leading-snug text-gray-500">
              {medium === "digital"
                ? t("edgeClearanceDigitalHint")
                : t("edgeClearancePrintHint")}
            </p>
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
            onReset={() =>
              reset({
                ...initial,
                primaryColor: brandKit.primaryColor,
                secondaryColor: brandKit.secondaryColor,
                accentColor: brandKit.accentColor,
                includeBranding: themeEstablished,
                edgeClearance: defaultEdgeClearanceForMedium(medium),
                supportUrl:
                  state.supportUrl ||
                  resolveLocalWebsiteUrl(
                    brandKit,
                    typeof window !== "undefined" ? window.location.origin : "",
                  ) ||
                  SITE_URL,
              })
            }
          />
          <div className="flex flex-wrap gap-3">
            <Button onClick={handleExportPng} disabled={exporting}>
              {exporting
                ? tc("exporting")
                : medium === "digital"
                  ? t("downloadWallpaper")
                  : tc("downloadPng")}
            </Button>
            {supportsPdf(format) ? (
              <Button
                variant="outline"
                onClick={handleExportPdf}
                disabled={exporting}
              >
                {tc("downloadPdf")}
              </Button>
            ) : null}
          </div>
          </div>
        </Card>
      }
      previewActions={
        <>
          <Button onClick={handleExportPng} disabled={exporting}>
            {exporting
              ? tc("exporting")
              : medium === "digital"
                ? t("downloadWallpaper")
                : tc("downloadPng")}
          </Button>
          {supportsPdf(format) ? (
            <Button
              variant="outline"
              onClick={handleExportPdf}
              disabled={exporting}
            >
              {tc("downloadPdf")}
            </Button>
          ) : null}
        </>
      }
      preview={
        /* Shadow stays outside canvasRef — box-shadow oklch from Tailwind breaks PNG capture */
        <div className="relative shadow-lg">
          <div
            ref={canvasRef}
                  data-export-root=""
            className={cn(
              "relative flex w-full flex-col overflow-hidden",
              format.aspect,
            )}
            style={{
              ...surfaceStyle,
              color: canvasInk,
            }}
          >
            <CanvasGrainOverlay opacity={tokens.grainOpacity} />
            <CanvasEdgeClearanceFrame
              insets={clearanceInsets}
              className="z-[2] min-h-0 flex-1"
            >
            {state.layout === "stack" ? (
              <div
                className="relative z-[2] flex h-full min-h-0 flex-col justify-between box-border"
                style={{ padding: stackPadPx }}
              >
                <div className="flex shrink-0 items-start justify-between gap-2">
                  <p
                    className={cn(
                      "font-semibold uppercase tracking-[0.2em]",
                      isLandscape ? "text-xs" : "text-sm",
                    )}
                    style={{
                      color: secondaryOnPrimary,
                      letterSpacing: tokens.titleLetterSpacing || "0.2em",
                      fontWeight: tokens.titleFontWeight,
                    }}
                  >
                    {state.leadIn}
                  </p>
                  {showLockup ? (
                    <BrandLogo
                      size={isLandscape ? "sm" : "md"}
                      backgroundColor={state.primaryColor}
                      className="shrink-0"
                    />
                  ) : null}
                </div>
                <div
                  className="flex min-h-0 flex-1 flex-col justify-center py-1"
                  style={{
                    alignItems: stackItems,
                    textAlign: stackAlign,
                  }}
                >
                  {lines.map((line, i) => (
                    <p
                      key={`${i}-${line}`}
                      className={chrome.headlineStack}
                      style={{
                        color: canvasInk,
                        ...titleChrome,
                      }}
                    >
                      {line}
                    </p>
                  ))}
                  <p
                    className={chrome.closerStack}
                    style={{ color: secondaryOnPrimary }}
                  >
                    {state.closer}
                  </p>
                  {showLockup && !isLandscape ? (
                    <p
                      className="mt-2 text-sm font-semibold md:mt-3"
                      style={{ color: mutedInk90 }}
                    >
                      {localLabel}
                    </p>
                  ) : null}
                </div>
                {footer}
              </div>
            ) : null}

            {state.layout === "split" ? (
              <div className="relative z-[2] flex h-full min-h-0 flex-col">
                <div
                  className={cn(
                    "grid min-h-0 flex-1",
                    isLandscape ? "grid-cols-2" : "grid-cols-5",
                  )}
                >
                  <div
                    className={cn(
                      "flex min-h-0 flex-col justify-between",
                      !isLandscape && "col-span-2",
                    )}
                    style={{
                      backgroundColor: state.secondaryColor,
                      color: splitSideInk,
                      padding: splitSidePadPx,
                    }}
                  >
                    <p
                      className="text-xs font-bold uppercase tracking-[0.25em]"
                      style={{
                        color: splitSideInk,
                        letterSpacing: tokens.titleLetterSpacing || "0.25em",
                        fontWeight: tokens.titleFontWeight,
                      }}
                    >
                      {state.leadIn}
                    </p>
                    <p
                      className={cn(
                        "font-semibold leading-snug",
                        isLandscape ? "text-xs" : "text-sm",
                      )}
                      style={{ color: splitSideInk }}
                    >
                      {state.closer}
                    </p>
                  </div>
                  <div
                    className={cn(
                      "flex min-h-0 flex-col justify-center",
                      !isLandscape && "col-span-3",
                    )}
                    style={{ padding: splitTypePadPx }}
                  >
                    {lines.map((line, i) => (
                      <p
                        key={`${i}-${line}`}
                        className={chrome.headlineSplit}
                        style={{ color: canvasInk, ...titleChrome }}
                      >
                        {line}
                      </p>
                    ))}
                  </div>
                </div>
                {footer ? (
                  <div className={cn("shrink-0", chrome.padFooterOuter)}>{footer}</div>
                ) : null}
              </div>
            ) : null}

            {state.layout === "banner" ? (
              <div className="relative z-[2] flex h-full min-h-0 flex-col justify-between">
                <div
                  className="flex shrink-0 items-center justify-between gap-3"
                  style={{
                    backgroundColor: bannerBarBg,
                    padding: `${bannerBarPadY}px ${bannerBodyPadPx}px`,
                  }}
                >
                  {showLockup ? (
                    <BrandLogo size="sm" backgroundColor={bannerBarBg} />
                  ) : (
                    <span />
                  )}
                  <p
                    className="text-xs font-bold uppercase tracking-[0.3em]"
                    style={{ color: bannerBarInk }}
                  >
                    {state.leadIn}
                  </p>
                </div>
                <div
                  className="flex min-h-0 flex-1 flex-col items-center justify-center text-center"
                  style={{ padding: bannerBodyPadPx }}
                >
                  {lines.map((line, i) => (
                    <p
                      key={`${i}-${line}`}
                      className={chrome.headlineStack}
                      style={{
                        color: canvasInk,
                        ...titleChrome,
                      }}
                    >
                      {line}
                    </p>
                  ))}
                  <p
                    className={chrome.closerBanner}
                    style={{ color: mutedInk90 }}
                  >
                    {state.closer}
                  </p>
                  {showLockup && !isLandscape ? (
                    <p
                      className="mt-2 text-sm font-semibold"
                      style={{ color: mutedInk90 }}
                    >
                      {localLabel}
                    </p>
                  ) : null}
                </div>
                {footer ? (
                  <div className={cn("shrink-0", chrome.padFooterOuter)}>{footer}</div>
                ) : null}
              </div>
            ) : null}
            </CanvasEdgeClearanceFrame>
          </div>
          {state.edgeClearance ? (
            <CanvasSafeZoneOverlay insets={clearanceInsets} />
          ) : null}
        </div>
      }
    />
  );
}
