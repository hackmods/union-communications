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
    return {
      padStack: ultraWide
        ? "px-8 pt-4 pb-3 md:px-10 md:pt-5 md:pb-4"
        : "px-10 pt-5 pb-4 md:px-14 md:pt-6 md:pb-5",
      padSplitSide: ultraWide ? "p-4 md:p-5" : "p-5 md:p-6",
      padSplitType: ultraWide ? "px-6 py-4 md:px-8" : "px-8 py-5 md:px-10",
      padBannerBar: ultraWide ? "px-6 py-2" : "px-8 py-2.5",
      padBannerBody: ultraWide
        ? "px-8 py-3 md:px-10"
        : "px-10 py-4 md:px-14",
      padFooterOuter: ultraWide
        ? "px-6 pb-3 pt-1 md:px-8"
        : "px-8 pb-4 pt-1 md:px-10",
      headlineStack: ultraWide
        ? "text-2xl font-black uppercase leading-[0.9] tracking-tight md:text-3xl lg:text-4xl"
        : "text-3xl font-black uppercase leading-[0.92] tracking-tight md:text-4xl lg:text-5xl",
      headlineSplit: ultraWide
        ? "text-xl font-black uppercase leading-[0.9] tracking-tight md:text-2xl lg:text-3xl"
        : "text-2xl font-black uppercase leading-[0.92] tracking-tight md:text-3xl lg:text-4xl",
      closerStack: ultraWide
        ? "mt-2 text-sm font-medium tracking-wide md:text-base"
        : "mt-3 text-base font-medium tracking-wide md:text-lg",
      closerBanner: ultraWide
        ? "mt-2 text-xs font-medium opacity-90 md:text-sm"
        : "mt-3 text-sm font-medium opacity-90 md:text-base",
      qrPx: ultraWide ? 44 : 52,
      footerGap: "gap-2 border-t border-white/30 pt-2",
      urlClass: "mt-0.5 break-all text-[11px] leading-snug opacity-90",
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
      closerBanner: "mt-4 text-sm font-medium opacity-90 md:text-base",
      qrPx: 64,
      footerGap: "gap-3 border-t border-white/30 pt-3",
      urlClass: "mt-0.5 break-all text-xs leading-snug opacity-90",
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
    closerBanner: "mt-5 text-base font-medium opacity-90",
    qrPx: 72,
    footerGap: "gap-3 border-t border-white/30 pt-3",
    urlClass: "mt-0.5 break-all text-xs leading-snug opacity-90",
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
      { pixelRatio: exportPixelRatio(canvasRef.current, format) },
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
    );
  };

  const footer = showFooter ? (
    <div
      className={cn(
        "flex shrink-0 items-end justify-between",
        chrome.footerGap,
      )}
    >
      <div className="min-w-0 flex-1 text-left">
        {state.showCta ? (
          <>
            <p className="text-sm font-bold uppercase tracking-wide">{t("cta")}</p>
            <p className={chrome.urlClass}>{displayUrl}</p>
          </>
        ) : null}
        {showLocalInFooter ? (
          <p className={cn("text-xs opacity-80", state.showCta && "mt-1")}>
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
          className="shrink-0 rounded-sm bg-white p-1"
          style={{ width: chrome.qrPx, height: chrome.qrPx }}
        />
      ) : null}
    </div>
  ) : null;

  return (
    <div className="mx-auto max-w-5xl px-4 py-12">
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

      <div className="mt-8 grid gap-8 lg:grid-cols-2">
        <Card className="space-y-4">
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

        <div
          ref={canvasRef}
          className={cn("flex w-full flex-col overflow-hidden shadow-lg", format.aspect)}
          style={{
            backgroundColor: state.primaryColor,
            color: "#FFFFFF",
          }}
        >
          {state.layout === "stack" ? (
            <div
              className={cn(
                "flex h-full min-h-0 flex-col",
                chrome.padStack,
              )}
            >
              <div className="flex shrink-0 items-start justify-between gap-3">
                <p
                  className="text-sm font-semibold uppercase tracking-[0.2em]"
                  style={{ color: state.secondaryColor }}
                >
                  {state.leadIn}
                </p>
                {showLockup ? <BrandLogo size="md" onDark className="shrink-0" /> : null}
              </div>
              <div
                className={cn(
                  "flex min-h-0 flex-1 flex-col justify-center overflow-hidden text-center",
                  isLandscape ? "py-2" : "py-4",
                )}
              >
                {lines.map((line, i) => (
                  <p key={`${i}-${line}`} className={chrome.headlineStack}>
                    {line}
                  </p>
                ))}
                <p className={chrome.closerStack} style={{ color: state.secondaryColor }}>
                  {state.closer}
                </p>
                {showLockup ? (
                  <p className="mt-2 text-sm font-semibold opacity-90 md:mt-3">{localLabel}</p>
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
                    "flex min-h-0 flex-col justify-between overflow-hidden",
                    chrome.padSplitSide,
                    !isLandscape && "col-span-2",
                  )}
                  style={{
                    backgroundColor: state.secondaryColor,
                    color: state.primaryColor,
                  }}
                >
                  <p className="text-xs font-bold uppercase tracking-[0.25em]">
                    {state.leadIn}
                  </p>
                  <p className="text-sm font-semibold leading-snug">{state.closer}</p>
                </div>
                <div
                  className={cn(
                    "flex min-h-0 flex-col justify-center overflow-hidden",
                    chrome.padSplitType,
                    !isLandscape && "col-span-3",
                  )}
                >
                  {lines.map((line, i) => (
                    <p key={`${i}-${line}`} className={chrome.headlineSplit}>
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
            <div className="flex h-full min-h-0 flex-col">
              <div
                className={cn(
                  "flex shrink-0 items-center justify-between gap-3",
                  chrome.padBannerBar,
                )}
                style={{ backgroundColor: state.accentColor || state.secondaryColor }}
              >
                {showLockup ? <BrandLogo size="sm" onDark /> : <span />}
                <p className="text-xs font-bold uppercase tracking-[0.3em] text-white">
                  {state.leadIn}
                </p>
              </div>
              <div
                className={cn(
                  "flex min-h-0 flex-1 flex-col justify-center overflow-hidden text-center",
                  chrome.padBannerBody,
                )}
              >
                {lines.map((line, i) => (
                  <p key={`${i}-${line}`} className={chrome.headlineStack}>
                    {line}
                  </p>
                ))}
                <p className={chrome.closerBanner}>{state.closer}</p>
                {showLockup ? (
                  <p className="mt-2 text-sm font-semibold opacity-90">{localLabel}</p>
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
  );
}
