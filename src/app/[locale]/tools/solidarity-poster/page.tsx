"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
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
  supportsPdf,
  type OutputMedium,
  type PosterFormatId,
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

/** Decorative device chrome outside the export canvas. */
function PosterPreviewFrame({
  medium,
  formatId,
  children,
}: {
  medium: OutputMedium;
  formatId: PosterFormatId;
  children: ReactNode;
}) {
  if (medium === "print") {
    return <>{children}</>;
  }

  if (formatId === "horizontal") {
    return (
      <div className="flex w-full flex-col items-center">
        <div className="w-full rounded-lg bg-gray-800 p-2 shadow-md">
          <div className="overflow-hidden rounded-sm">{children}</div>
        </div>
        <div className="mt-1 h-2 w-16 rounded-b-md bg-gray-700" aria-hidden />
        <div className="h-1 w-28 rounded-b bg-gray-600" aria-hidden />
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-[220px]">
      <div className="rounded-[1.75rem] bg-gray-800 p-2.5 shadow-md">
        <div className="mb-2 flex justify-center" aria-hidden>
          <div className="h-1.5 w-16 rounded-full bg-gray-600" />
        </div>
        <div className="overflow-hidden rounded-[1.25rem]">{children}</div>
      </div>
    </div>
  );
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
      supportUrl: resolveLocalWebsiteUrl(brandKit, origin),
      showQr: true,
      includeBranding: themeEstablished,
      primaryColor: brandKit.primaryColor,
      secondaryColor: brandKit.secondaryColor,
      accentColor: brandKit.accentColor,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- one-shot after hydrate
  }, [hydrated, themeEstablished]);

  useEffect(() => {
    let cancelled = false;
    const supportUrl =
      state.showQr && state.supportUrl.trim() ? state.supportUrl.trim() : "";
    const task = supportUrl
      ? qrDataUrl(supportUrl, { width: 140 })
      : Promise.resolve(null);
    void task.then((url) => {
      if (!cancelled) setQrSrc(url);
    });
    return () => {
      cancelled = true;
    };
  }, [state.showQr, state.supportUrl]);

  const localNum = resolveLocalNumber(brandKit.local.localNumber);
  const localLabel = brandKit.local.subText
    ? `Local ${localNum} - ${brandKit.local.subText}`
    : `Local ${localNum}`;
  const showLockup =
    state.includeBranding &&
    (state.layout === "stack" || state.layout === "banner");
  const lines = headlineLines(state.headline);

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

  const footer = (
    <div className="flex items-end justify-between gap-3 border-t border-white/30 pt-3">
      <div className="min-w-0 text-left">
        <p className="text-sm font-bold uppercase tracking-wide">{t("cta")}</p>
        {state.supportUrl.trim() ? (
          <p className="mt-0.5 truncate text-xs opacity-90">{state.supportUrl}</p>
        ) : null}
        {state.includeBranding || state.layout === "split" ? (
          <p className="mt-1 text-xs opacity-80">{localLabel}</p>
        ) : null}
      </div>
      {state.showQr && qrSrc ? (
        // eslint-disable-next-line @next/next/no-img-element -- data URL from client QR
        <img
          src={qrSrc}
          alt=""
          width={72}
          height={72}
          className="h-[72px] w-[72px] shrink-0 rounded-sm bg-white p-1"
        />
      ) : null}
    </div>
  );

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
            placeholder="https://"
          />

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
                  ),
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

        <PosterPreviewFrame medium={medium} formatId={formatId}>
          <div
            ref={canvasRef}
            className={cn(
              "flex w-full flex-col overflow-hidden",
              medium === "print" && "shadow-lg",
              format.aspect,
            )}
            style={{
              backgroundColor: state.primaryColor,
              color: "#FFFFFF",
            }}
          >
            {state.layout === "stack" ? (
              <div className="flex h-full flex-col justify-between p-8 md:p-10">
                <div className="flex items-start justify-between gap-3">
                  <p
                    className="text-sm font-semibold uppercase tracking-[0.2em]"
                    style={{ color: state.secondaryColor }}
                  >
                    {state.leadIn}
                  </p>
                  {showLockup ? <BrandLogo size="md" onDark className="shrink-0" /> : null}
                </div>
                <div className="text-center">
                  {lines.map((line, i) => (
                    <p
                      key={`${i}-${line}`}
                      className="text-4xl font-black uppercase leading-[0.95] tracking-tight md:text-5xl lg:text-6xl"
                    >
                      {line}
                    </p>
                  ))}
                  <p
                    className="mt-6 text-lg font-medium tracking-wide"
                    style={{ color: state.secondaryColor }}
                  >
                    {state.closer}
                  </p>
                  {showLockup ? (
                    <p className="mt-3 text-sm font-semibold opacity-90">{localLabel}</p>
                  ) : null}
                </div>
                {footer}
              </div>
            ) : null}

            {state.layout === "split" ? (
              <div className="flex h-full flex-col">
                <div className="grid min-h-0 flex-1 grid-cols-5">
                  <div
                    className="col-span-2 flex flex-col justify-between p-6"
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
                  <div className="col-span-3 flex flex-col justify-center px-6 py-8">
                    {lines.map((line, i) => (
                      <p
                        key={`${i}-${line}`}
                        className="text-3xl font-black uppercase leading-[0.95] tracking-tight md:text-4xl lg:text-5xl"
                      >
                        {line}
                      </p>
                    ))}
                  </div>
                </div>
                <div className="px-6 pb-6">{footer}</div>
              </div>
            ) : null}

            {state.layout === "banner" ? (
              <div className="flex h-full flex-col">
                <div
                  className="flex items-center justify-between gap-3 px-6 py-4"
                  style={{ backgroundColor: state.accentColor || state.secondaryColor }}
                >
                  {showLockup ? <BrandLogo size="sm" onDark /> : <span />}
                  <p className="text-xs font-bold uppercase tracking-[0.3em] text-white">
                    {state.leadIn}
                  </p>
                </div>
                <div className="flex flex-1 flex-col justify-center px-8 py-6 text-center">
                  {lines.map((line, i) => (
                    <p
                      key={`${i}-${line}`}
                      className="text-4xl font-black uppercase leading-[0.92] tracking-tight md:text-5xl lg:text-6xl"
                    >
                      {line}
                    </p>
                  ))}
                  <p className="mt-5 text-base font-medium opacity-90">{state.closer}</p>
                  {showLockup ? (
                    <p className="mt-2 text-sm font-semibold opacity-90">{localLabel}</p>
                  ) : null}
                </div>
                <div className="px-6 pb-6">{footer}</div>
              </div>
            ) : null}
          </div>
        </PosterPreviewFrame>
      </div>
    </div>
  );
}
