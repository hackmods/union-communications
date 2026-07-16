"use client";

import { useEffect, useRef, useState, type ReactElement } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { useBrandStore } from "@/store/brand-store";
import { useUndoRedo } from "@/hooks/use-undo-redo";
import { exportNodeAsPng } from "@/lib/export/image-export";
import { formatFilename, resolveLocalNumber, cn } from "@/lib/utils";
import { isBrandThemeEstablished } from "@/lib/utils/brand-theme";
import { inkWithAlpha, pickContrastingInk } from "@/lib/utils/ink";
import { meetsWcagAA } from "@/lib/utils/contrast";
import {
  DEFAULT_MEETING_BACKGROUND_FORMAT,
  MEETING_BACKGROUND_FORMATS,
  exportPixelRatio,
  meetingBackgroundFormats,
  type MeetingBackgroundFormatId,
} from "@/lib/constants/meeting-background-formats";
import {
  MEETING_BACKGROUND_PRESETS,
  getMeetingPresetById,
  headlineLines,
  type MeetingLayout,
} from "@/lib/constants/meeting-background-presets";
import { BrandLogo } from "@/components/brand/BrandLogo";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Card } from "@/components/ui/Card";
import { ThemePicker } from "@/components/tools/ThemePicker";
import { UndoRedoBar } from "@/components/tools/UndoRedoBar";
import { PageShell } from "@/components/layout/PageShell";

interface BackgroundState {
  presetId: string;
  leadIn: string;
  headline: string;
  closer: string;
  layout: MeetingLayout;
  showLeadIn: boolean;
  showHeadline: boolean;
  showCloser: boolean;
  includeBranding: boolean;
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
}

/** Preview-only webcam silhouette — never inside canvasRef. */
function FacePreviewOverlay() {
  return (
    <div
      className="pointer-events-none absolute inset-0 z-10 flex items-end justify-center"
      aria-hidden
    >
      <svg
        viewBox="0 0 200 220"
        className="h-[72%] w-auto max-w-[42%]"
        style={{ opacity: 0.32 }}
        role="img"
      >
        <ellipse cx="100" cy="72" rx="42" ry="48" fill="#1a1a1a" />
        <path
          d="M40 210 C40 150 70 128 100 128 C130 128 160 150 160 210 Z"
          fill="#1a1a1a"
        />
      </svg>
      <div
        className="absolute inset-[8%] rounded-[50%] border-2 border-dashed"
        style={{ borderColor: "#1a1a1a", opacity: 0.35 }}
      />
    </div>
  );
}

export default function MeetingBackgroundPage() {
  const t = useTranslations("meetingBackground");
  const tc = useTranslations("common");
  const brandKit = useBrandStore((s) => s.brandKit);
  const onboardingComplete = useBrandStore((s) => s.onboardingComplete);
  const hydrated = useBrandStore((s) => s.hydrated);
  const canvasRef = useRef<HTMLDivElement>(null);
  const brandingDefaultApplied = useRef(false);
  const [formatId, setFormatId] = useState<MeetingBackgroundFormatId>(
    DEFAULT_MEETING_BACKGROUND_FORMAT,
  );
  const [showFacePreview, setShowFacePreview] = useState(true);

  const first = MEETING_BACKGROUND_PRESETS[0];
  const themeEstablished = isBrandThemeEstablished(brandKit, onboardingComplete);
  const format = MEETING_BACKGROUND_FORMATS[formatId];
  const formats = meetingBackgroundFormats();

  const initial: BackgroundState = {
    presetId: first.id,
    leadIn: first.leadIn,
    headline: first.headline,
    closer: first.closer,
    layout: first.layout,
    showLeadIn: true,
    showHeadline: true,
    showCloser: true,
    includeBranding: false,
    primaryColor: brandKit.primaryColor,
    secondaryColor: brandKit.secondaryColor,
    accentColor: brandKit.accentColor,
  };

  const { state, setState, undo, redo, canUndo, canRedo, reset } =
    useUndoRedo<BackgroundState>(initial);

  useEffect(() => {
    if (!hydrated || brandingDefaultApplied.current) return;
    brandingDefaultApplied.current = true;
    reset({
      ...initial,
      includeBranding: themeEstablished,
      primaryColor: brandKit.primaryColor,
      secondaryColor: brandKit.secondaryColor,
      accentColor: brandKit.accentColor,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- one-shot after hydrate
  }, [hydrated, themeEstablished]);

  const localNum = resolveLocalNumber(brandKit.local.localNumber);
  const localLabel = brandKit.local.subText
    ? `Local ${localNum} — ${brandKit.local.subText}`
    : `Local ${localNum}`;

  const primary = state.primaryColor;
  const secondary = state.secondaryColor || primary;
  const accent = state.accentColor || secondary;
  const canvasInk = pickContrastingInk(primary);
  const secondaryInk = pickContrastingInk(secondary);
  const accentInk = pickContrastingInk(accent);
  const mutedPrimary = inkWithAlpha(canvasInk, 0.85);
  const mutedSecondary = inkWithAlpha(secondaryInk, 0.85);
  const mutedAccent = inkWithAlpha(accentInk, 0.85);
  const secondaryOnPrimary = meetsWcagAA(secondary, primary, true)
    ? secondary
    : canvasInk;
  const lines = headlineLines(state.headline);
  const showLead = state.showLeadIn && Boolean(state.leadIn.trim());
  const showHead = state.showHeadline && lines.length > 0;
  const showClose = state.showCloser && Boolean(state.closer.trim());
  const showCopy = showLead || showHead || showClose;
  const showBrand = state.includeBranding;

  const applyPreset = (id: string) => {
    const preset = getMeetingPresetById(id);
    if (!preset) return;
    setState({
      ...state,
      presetId: preset.id,
      leadIn: preset.leadIn,
      headline: preset.headline,
      closer: preset.closer,
      layout: preset.layout,
      showLeadIn: true,
      showHeadline: true,
      showCloser: true,
    });
  };

  const handleExportPng = async () => {
    if (!canvasRef.current) return;
    await exportNodeAsPng(
      canvasRef.current,
      formatFilename(format.filenameStem, brandKit.local.localNumber, "png"),
      {
        pixelRatio: exportPixelRatio(canvasRef.current, format),
        backgroundColor: primary,
      },
    );
  };

  const stackedHeadline = (
    ink: string,
    size: "md" | "lg" | "xl",
    align: "left" | "right" | "center" = "left",
  ) =>
    showHead ? (
      <div
        className={cn(
          align === "center" && "text-center",
          align === "right" && "text-right",
        )}
      >
        {lines.map((line, i) => (
          <p
            key={`${i}-${line}`}
            className={cn(
              "font-black uppercase leading-[0.92] tracking-tight",
              size === "xl" && "text-2xl md:text-4xl",
              size === "lg" && "text-xl md:text-3xl",
              size === "md" && "text-lg md:text-2xl",
            )}
            style={{ color: ink }}
          >
            {line}
          </p>
        ))}
      </div>
    ) : null;

  const leadLine = (ink: string, align: "left" | "right" | "center" = "left") =>
    showLead ? (
      <p
        className={cn(
          "text-[10px] font-semibold uppercase tracking-[0.2em] md:text-xs",
          align === "center" && "text-center",
          align === "right" && "text-right",
        )}
        style={{ color: ink }}
      >
        {state.leadIn}
      </p>
    ) : null;

  const closerLine = (
    ink: string,
    align: "left" | "right" | "center" = "left",
  ) =>
    showClose ? (
      <p
        className={cn(
          "text-[10px] font-medium tracking-wide md:text-xs",
          align === "center" && "text-center",
          align === "right" && "text-right",
        )}
        style={{ color: ink }}
      >
        {state.closer}
      </p>
    ) : null;

  const brandLockup = (bg: string, ink: string, size: "sm" | "md" = "sm") =>
    showBrand ? (
      <div className="flex shrink-0 items-center gap-2">
        <BrandLogo size={size} backgroundColor={bg} className="shrink-0" />
        <p
          className="text-[9px] font-medium tracking-wide md:text-[10px]"
          style={{ color: ink }}
        >
          {localLabel}
        </p>
      </div>
    ) : null;

  let canvasBody: ReactElement | null = null;

  if (state.layout === "corner") {
    // Full primary field; punchy stack bottom-right; logo top-left when branding on
    canvasBody = (
      <div
        className="relative box-border flex h-full w-full flex-col justify-between p-5 md:p-7"
        style={{ backgroundColor: primary }}
      >
        <div className="flex shrink-0 items-start justify-between gap-3">
          {showBrand ? brandLockup(primary, mutedPrimary, "md") : <span />}
          {!showBrand && showLead ? leadLine(secondaryOnPrimary, "right") : null}
        </div>
        <div className="flex min-h-0 flex-1" />
        <div className="ml-auto max-w-[48%] text-right">
          {showBrand && showLead ? leadLine(secondaryOnPrimary, "right") : null}
          <div className={cn(showLead && showBrand && "mt-1.5")}>
            {stackedHeadline(canvasInk, "xl", "right")}
          </div>
          {showClose ? (
            <div className="mt-2">{closerLine(mutedPrimary, "right")}</div>
          ) : null}
        </div>
      </div>
    );
  } else if (state.layout === "lower-third") {
    // Full primary; thick accent bar with type — bar height collapses when copy/brand off
    const barHasContent = showCopy || showBrand;
    canvasBody = (
      <div
        className="relative box-border flex h-full w-full flex-col"
        style={{ backgroundColor: primary }}
      >
        <div className="flex min-h-0 flex-1 items-start justify-end p-5 md:p-7">
          {!barHasContent && showBrand
            ? brandLockup(primary, mutedPrimary, "md")
            : null}
        </div>
        {barHasContent ? (
          <div
            className="flex shrink-0 items-end justify-between gap-4 px-5 py-3.5 md:px-7 md:py-4"
            style={{ backgroundColor: accent }}
          >
            <div className="min-w-0 flex-1">
              {leadLine(meetsWcagAA(secondary, accent, true) ? secondary : mutedAccent)}
              <div className={cn(showLead && "mt-1")}>
                {stackedHeadline(accentInk, "lg")}
              </div>
              {showClose ? (
                <div className="mt-1.5">{closerLine(mutedAccent)}</div>
              ) : null}
            </div>
            {brandLockup(accent, mutedAccent, "md")}
          </div>
        ) : null}
      </div>
    );
  } else if (state.layout === "side-panel") {
    // Split energy: secondary edge strip + open primary face zone
    const panelHasContent = showCopy || showBrand;
    canvasBody = (
      <div
        className="relative box-border flex h-full w-full"
        style={{ backgroundColor: primary }}
      >
        {panelHasContent ? (
          <div
            className="box-border flex h-full w-[28%] min-w-[7rem] max-w-[12rem] flex-col justify-between p-3 md:p-4"
            style={{ backgroundColor: secondary }}
          >
            <div className="min-w-0">
              {leadLine(meetsWcagAA(accent, secondary, true) ? accent : mutedSecondary)}
              <div className={cn(showLead && "mt-2")}>
                {stackedHeadline(secondaryInk, "md")}
              </div>
              {showClose ? (
                <div className="mt-3">{closerLine(mutedSecondary)}</div>
              ) : null}
            </div>
            {showBrand ? (
              <div className="mt-4">
                <BrandLogo size="sm" backgroundColor={secondary} />
                <p
                  className="mt-1.5 text-[9px] font-medium leading-tight md:text-[10px]"
                  style={{ color: mutedSecondary }}
                >
                  {localLabel}
                </p>
              </div>
            ) : null}
          </div>
        ) : null}
        <div className="flex min-h-0 flex-1 flex-col justify-between p-5 md:p-7">
          {!panelHasContent && showBrand
            ? brandLockup(primary, mutedPrimary, "md")
            : null}
        </div>
      </div>
    );
  } else {
    // bands — top accent + bottom secondary strips; centre stays clear
    const showTop = showLead || (showBrand && !showHead && !showClose);
    const showBottom = showHead || showClose || showBrand;
    canvasBody = (
      <div
        className="relative box-border flex h-full w-full flex-col"
        style={{ backgroundColor: primary }}
      >
        {showTop ? (
          <div
            className="flex shrink-0 items-center justify-between gap-3 px-5 py-2.5 md:px-7 md:py-3"
            style={{ backgroundColor: accent }}
          >
            <div className="min-w-0 flex-1">
              {leadLine(
                meetsWcagAA(secondary, accent, true) ? secondary : mutedAccent,
              )}
            </div>
            {!showBottom ? brandLockup(accent, mutedAccent, "sm") : null}
          </div>
        ) : null}
        <div className="min-h-0 flex-1" />
        {showBottom ? (
          <div
            className="flex shrink-0 items-end justify-between gap-4 px-5 py-3.5 md:px-7 md:py-4"
            style={{ backgroundColor: secondary }}
          >
            <div className="min-w-0 flex-1">
              {!showTop && showLead
                ? leadLine(
                    meetsWcagAA(accent, secondary, true)
                      ? accent
                      : mutedSecondary,
                  )
                : null}
              <div className={cn(!showTop && showLead && "mt-1")}>
                {stackedHeadline(secondaryInk, "lg")}
              </div>
              {showClose ? (
                <div className={cn(showHead && "mt-1.5")}>
                  {closerLine(mutedSecondary)}
                </div>
              ) : null}
            </div>
            {brandLockup(secondary, mutedSecondary, "md")}
          </div>
        ) : null}
      </div>
    );
  }

  return (
    <PageShell className="py-12">
      <h1 className="text-3xl font-bold text-opseu-dark">{t("title")}</h1>
      <p className="mt-2 text-gray-600">{t("subtitle")}</p>

      {!themeEstablished && hydrated ? (
        <p className="mt-4 rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950">
          {t("setupBrandPrompt")}{" "}
          <Link
            href="/onboarding"
            className="font-medium text-opseu-blue underline"
          >
            {t("setupBrandLink")}
          </Link>
        </p>
      ) : null}

      <div className="mt-8 grid gap-8 lg:grid-cols-2">
        <Card className="space-y-4">
          <div>
            <label
              htmlFor="meeting-preset"
              className="mb-1 block text-sm font-medium"
            >
              {t("preset")}
            </label>
            <select
              id="meeting-preset"
              value={state.presetId}
              onChange={(e) => applyPreset(e.target.value)}
              className="w-full rounded-md border border-gray-300 px-3 py-2"
            >
              {MEETING_BACKGROUND_PRESETS.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.label}
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
            <label
              htmlFor="meeting-headline"
              className="mb-1 block text-sm font-medium"
            >
              {t("headline")}
            </label>
            <textarea
              id="meeting-headline"
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
            <label
              htmlFor="meeting-layout"
              className="mb-1 block text-sm font-medium"
            >
              {t("layout")}
            </label>
            <select
              id="meeting-layout"
              value={state.layout}
              onChange={(e) =>
                setState({
                  ...state,
                  layout: e.target.value as MeetingLayout,
                })
              }
              className="w-full rounded-md border border-gray-300 px-3 py-2"
            >
              {(
                ["corner", "lower-third", "side-panel", "bands"] as const
              ).map((id) => (
                <option key={id} value={id}>
                  {t(`layouts.${id}`)}
                </option>
              ))}
            </select>
          </div>

          <div>
            <p className="mb-1 text-sm font-medium" id="meeting-toggles-label">
              {t("toggles")}
            </p>
            <div
              className="space-y-2"
              role="group"
              aria-labelledby="meeting-toggles-label"
            >
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={state.showLeadIn}
                  onChange={(e) =>
                    setState({ ...state, showLeadIn: e.target.checked })
                  }
                />
                {t("showLeadIn")}
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={state.showHeadline}
                  onChange={(e) =>
                    setState({ ...state, showHeadline: e.target.checked })
                  }
                />
                {t("showHeadline")}
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={state.showCloser}
                  onChange={(e) =>
                    setState({ ...state, showCloser: e.target.checked })
                  }
                />
                {t("showCloser")}
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
            </div>
            <p className="mt-1 text-xs text-gray-500">{t("togglesHint")}</p>
          </div>

          <div>
            <p className="mb-1 text-sm font-medium" id="meeting-size-label">
              {t("outputSize")}
            </p>
            <div
              className="flex flex-wrap gap-2"
              role="group"
              aria-labelledby="meeting-size-label"
            >
              {formats.map((f) => (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => setFormatId(f.id)}
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
            <p className="mt-1 text-xs text-gray-500">{t("sizeHint")}</p>
          </div>

          <ThemePicker
            primaryColor={state.primaryColor}
            secondaryColor={state.secondaryColor}
            onPrimaryChange={(c) => setState({ ...state, primaryColor: c })}
            onSecondaryChange={(c) =>
              setState({ ...state, secondaryColor: c })
            }
          />

          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={showFacePreview}
              onChange={(e) => setShowFacePreview(e.target.checked)}
            />
            {t("showFacePreview")}
          </label>
          <p className="text-xs text-gray-500">{t("facePreviewHint")}</p>

          <UndoRedoBar
            canUndo={canUndo}
            canRedo={canRedo}
            onUndo={undo}
            onRedo={redo}
            onReset={() =>
              reset({
                ...initial,
                includeBranding: themeEstablished,
                primaryColor: brandKit.primaryColor,
                secondaryColor: brandKit.secondaryColor,
                accentColor: brandKit.accentColor,
              })
            }
          />

          <Button type="button" onClick={() => void handleExportPng()}>
            {tc("downloadPng")}
          </Button>
        </Card>

        <div>
          <p className="mb-2 text-sm font-medium text-gray-700">
            {t("preview")}
          </p>
          <div className="overflow-hidden rounded-lg shadow-lg shadow-black/20">
            <div className="relative w-full">
              <div
                ref={canvasRef}
                className={cn("w-full overflow-hidden", format.aspect)}
                style={{ backgroundColor: primary, color: canvasInk }}
              >
                {canvasBody}
              </div>
              {showFacePreview ? <FacePreviewOverlay /> : null}
            </div>
          </div>
        </div>
      </div>
    </PageShell>
  );
}
