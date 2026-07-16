"use client";

import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { useBrandStore } from "@/store/brand-store";
import { useUndoRedo } from "@/hooks/use-undo-redo";
import { exportNodeAsPng } from "@/lib/export/image-export";
import { nodeToPdf } from "@/lib/export/pdf-export";
import { qrDataUrl } from "@/lib/export/qr";
import { formatFilename, resolveLocalNumber, cn } from "@/lib/utils";
import { isBrandThemeEstablished } from "@/lib/utils/brand-theme";
import { resolveLocalWebsiteUrl } from "@/lib/utils/local-links";
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
import { ThemePicker } from "@/components/tools/ThemePicker";
import { UndoRedoBar } from "@/components/tools/UndoRedoBar";
import { inkWithAlpha, pickContrastingInk } from "@/lib/utils/ink";
import { meetsWcagAA } from "@/lib/utils/contrast";
import { PageShell } from "@/components/layout/PageShell";

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
  const brandingDefaultApplied = useRef(false);

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
    primaryColor: brandKit.primaryColor,
    secondaryColor: brandKit.secondaryColor,
    accentColor: brandKit.accentColor,
  };

  const { state, setState, undo, redo, canUndo, canRedo, reset } =
    useUndoRedo<PosterState>(initial);

  // Seed support URL + branding default once after Brand Kit hydrate
  useEffect(() => {
    if (!hydrated || brandingDefaultApplied.current) return;
    brandingDefaultApplied.current = true;
    const origin = typeof window !== "undefined" ? window.location.origin : "";
    reset({
      sloganId: first.id,
      leadIn: first.leadIn,
      headline: first.headline,
      closer: first.closer,
      layout: first.layout,
      supportUrl: resolveLocalWebsiteUrl(brandKit, origin) || SITE_URL,
      showCta: true,
      showQr: true,
      includeBranding: themeEstablished,
      primaryColor: brandKit.primaryColor,
      secondaryColor: brandKit.secondaryColor,
      accentColor: brandKit.accentColor,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- one-shot after hydrate
  }, [hydrated, themeEstablished]);

  const supportUrlForQr = state.supportUrl.trim() || SITE_URL;

  useEffect(() => {
    let cancelled = false;
    const task = state.showQr
      ? qrDataUrl(supportUrlForQr, { width: 140 })
      : Promise.resolve(null);
    void task.then((url) => {
      if (!cancelled) setQrSrc(url);
    });
    return () => {
      cancelled = true;
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
  const displayUrl = state.supportUrl.trim() || SITE_URL;
  const showLocalInFooter =
    state.includeBranding || state.layout === "split";
  const showFooter =
    state.showCta || state.showQr || showLocalInFooter;
  const canvasInk = pickContrastingInk(state.primaryColor);
  const mutedInk90 = inkWithAlpha(canvasInk, 0.9);
  const mutedInk80 = inkWithAlpha(canvasInk, 0.8);
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

  const selectMedium = (next: OutputMedium) => {
    if (next === medium) return;
    const restored = lastFormatByMedium[next] ?? defaultFormatForMedium(next);
    setMedium(next);
    setFormatId(restored);
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
    await exportNodeAsPng(
      canvasRef.current,
      formatFilename(format.filenameStem, brandKit.local.localNumber, "png"),
      {
        pixelRatio: exportPixelRatio(canvasRef.current, format),
        // Hex fill — Tailwind oklch utilities break html-to-image capture
        backgroundColor: state.primaryColor,
      },
    );
  };

  const handleExportPdf = async () => {
    if (!canvasRef.current || !supportsPdf(format)) return;
    await nodeToPdf(
      canvasRef.current,
      formatFilename(format.filenameStem, brandKit.local.localNumber, "pdf"),
      format.widthInches!,
      format.heightInches!,
      exportPixelRatio(canvasRef.current, format),
      state.primaryColor,
    );
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
        // eslint-disable-next-line @next/next/no-img-element -- data URL from client QR
        <img
          src={qrSrc}
          alt=""
          width={chrome.qrPx}
          height={chrome.qrPx}
          className="shrink-0 self-center rounded-sm p-0.5"
          style={{
            width: chrome.qrPx,
            height: chrome.qrPx,
            backgroundColor: "#FFFFFF",
          }}
        />
      ) : null}
    </div>
  ) : null;

  return (
    <PageShell className="py-6 md:py-8 lg:py-10">
      <h1 className="text-3xl font-bold text-opseu-dark">{t("title")}</h1>
      <p className="mt-2 text-gray-600">{t("subtitle")}</p>

      {!themeEstablished && hydrated ? (
        <p className="mt-4 rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950">
          {t("setupBrandPrompt")}{" "}
          <Link href="/onboarding" className="font-medium text-opseu-blue underline">
            {t("setupBrandLink")}
          </Link>
        </p>
      ) : null}

      <div className="mt-4 grid items-start gap-4 lg:mt-6 lg:grid-cols-2 lg:gap-6">
        <Card density="compact" className="space-y-3">
          <div>
            <label htmlFor="slogan-preset" className="mb-1 block text-sm font-medium">
              {t("preset")}
            </label>
            <select
              id="slogan-preset"
              value={state.sloganId}
              onChange={(e) => applyPreset(e.target.value)}
              className="w-full rounded-md border border-gray-300 px-3 py-2"
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
              className="w-full rounded-md border border-gray-300 px-3 py-2"
            >
              {(["stack", "split", "banner"] as const).map((layout) => (
                <option key={layout} value={layout}>
                  {t(`layouts.${layout}`)}
                </option>
              ))}
            </select>
          </div>

          <div>
            <p className="mb-1 text-sm font-medium" id="output-medium-label">
              {t("outputMedium")}
            </p>
            <div
              className="flex flex-wrap gap-2"
              role="group"
              aria-labelledby="output-medium-label"
            >
              {(["print", "digital"] as const).map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => selectMedium(m)}
                  className={cn(
                    "rounded-md px-4 py-1.5 text-sm font-medium transition-colors",
                    medium === m
                      ? "bg-opseu-blue text-white"
                      : "bg-gray-100 text-gray-700 hover:bg-gray-200",
                  )}
                >
                  {t(m === "print" ? "mediumPrint" : "mediumDigital")}
                </button>
              ))}
            </div>
          </div>

          <div>
            <p className="mb-1 text-sm font-medium" id="output-size-label">
              {t("outputSize")}
            </p>
            <div
              className="flex flex-wrap gap-2"
              role="group"
              aria-labelledby="output-size-label"
            >
              {mediumFormats.map((f) => (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => selectFormat(f.id)}
                  className={cn(
                    "rounded-md px-4 py-1.5 text-sm font-medium transition-colors",
                    formatId === f.id
                      ? "bg-opseu-blue text-white"
                      : "bg-gray-100 text-gray-700 hover:bg-gray-200",
                  )}
                >
                  {t(f.labelKey)}
                </button>
              ))}
            </div>
            {medium === "digital" ? (
              <p className="mt-2 text-xs text-gray-500">{t("digitalHint")}</p>
            ) : null}
          </div>

          <Input
            label={t("supportUrl")}
            value={state.supportUrl}
            onChange={(e) => setState({ ...state, supportUrl: e.target.value })}
            placeholder={SITE_URL}
          />

          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={state.showCta}
              onChange={(e) => setState({ ...state, showCta: e.target.checked })}
            />
            {t("showCta")}
          </label>

          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={state.showQr}
              onChange={(e) => setState({ ...state, showQr: e.target.checked })}
            />
            {t("showQr")}
          </label>

          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={state.includeBranding}
              onChange={(e) =>
                setState({ ...state, includeBranding: e.target.checked })
              }
            />
            {t("includeBranding")}
          </label>

          <ThemePicker
            primaryColor={state.primaryColor}
            secondaryColor={state.secondaryColor}
            onPrimaryChange={(c) => setState({ ...state, primaryColor: c })}
            onSecondaryChange={(c) => setState({ ...state, secondaryColor: c })}
          />

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
          <div className="flex gap-3">
            <Button onClick={handleExportPng}>
              {medium === "digital" ? t("downloadWallpaper") : tc("downloadPng")}
            </Button>
            {supportsPdf(format) ? (
              <Button variant="outline" onClick={handleExportPdf}>
                {tc("downloadPdf")}
              </Button>
            ) : null}
          </div>
        </Card>

        {/* Shadow stays outside canvasRef — box-shadow oklch from Tailwind breaks PNG capture */}
        <div className="shadow-lg">
          <div
            ref={canvasRef}
            className={cn("flex w-full flex-col overflow-hidden", format.aspect)}
            style={{
              backgroundColor: state.primaryColor,
              color: canvasInk,
            }}
          >
            {state.layout === "stack" ? (
              <div
                className={cn(
                  "flex h-full min-h-0 flex-col justify-between",
                  chrome.padStack,
                )}
              >
                <div className="flex shrink-0 items-start justify-between gap-2">
                  <p
                    className={cn(
                      "font-semibold uppercase tracking-[0.2em]",
                      isLandscape ? "text-xs" : "text-sm",
                    )}
                    style={{ color: secondaryOnPrimary }}
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
                <div className="flex min-h-0 flex-1 flex-col items-center justify-center py-1 text-center">
                  {lines.map((line, i) => (
                    <p
                      key={`${i}-${line}`}
                      className={chrome.headlineStack}
                      style={{ color: canvasInk }}
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
                  {/* Landscape: local stays in footer only so headline doesn't get crushed */}
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
              <div className="flex h-full min-h-0 flex-col">
                <div
                  className={cn(
                    "grid min-h-0 flex-1",
                    isLandscape ? "grid-cols-2" : "grid-cols-5",
                  )}
                >
                  <div
                    className={cn(
                      "flex min-h-0 flex-col justify-between",
                      chrome.padSplitSide,
                      !isLandscape && "col-span-2",
                    )}
                    style={{
                      backgroundColor: state.secondaryColor,
                      color: splitSideInk,
                    }}
                  >
                    <p
                      className="text-xs font-bold uppercase tracking-[0.25em]"
                      style={{ color: splitSideInk }}
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
                      chrome.padSplitType,
                      !isLandscape && "col-span-3",
                    )}
                  >
                    {lines.map((line, i) => (
                      <p
                        key={`${i}-${line}`}
                        className={chrome.headlineSplit}
                        style={{ color: canvasInk }}
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
              <div className="flex h-full min-h-0 flex-col justify-between">
                <div
                  className={cn(
                    "flex shrink-0 items-center justify-between gap-3",
                    chrome.padBannerBar,
                  )}
                  style={{
                    backgroundColor: bannerBarBg,
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
                  className={cn(
                    "flex min-h-0 flex-1 flex-col items-center justify-center text-center",
                    chrome.padBannerBody,
                  )}
                >
                  {lines.map((line, i) => (
                    <p
                      key={`${i}-${line}`}
                      className={chrome.headlineStack}
                      style={{ color: canvasInk }}
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
          </div>
        </div>
      </div>
    </PageShell>
  );
}
