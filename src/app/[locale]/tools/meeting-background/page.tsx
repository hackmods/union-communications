"use client";

import { useEffect, useRef, useState, type ReactElement } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { useBrandStore } from "@/store/brand-store";
import { useUndoRedo } from "@/hooks/use-undo-redo";
import { useExportHandler } from "@/hooks/use-export-handler";
import { exportNodeAsPng } from "@/lib/export/image-export";
import { formatFilename, resolveLocalNumber, cn } from "@/lib/utils";
import { isBrandThemeEstablished } from "@/lib/utils/brand-theme";
import { inkWithAlpha, pickContrastingInk } from "@/lib/utils/ink";
import { meetsWcagAA } from "@/lib/utils/contrast";
import {
  DEFAULT_MEETING_BACKGROUND_FORMAT,
  MEETING_BACKGROUND_FORMATS,
  exportPixelRatio,
  formatsForOrientation,
  matchingFormatForOrientation,
  orientationOf,
  type MeetingBackgroundFormatId,
  type MeetingBackgroundOrientation,
} from "@/lib/constants/meeting-background-formats";
import {
  MEETING_BACKGROUND_PRESETS,
  designSetForLayout,
  getMeetingPresetById,
  headlineLines,
  layoutForDesignSet,
  layoutsForDesignSet,
  type MeetingDesignSet,
  type MeetingLayout,
} from "@/lib/constants/meeting-background-presets";
import { BrandLogo } from "@/components/brand/BrandLogo";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Card } from "@/components/ui/Card";
import { ThemePicker } from "@/components/tools/ThemePicker";
import { UndoRedoBar } from "@/components/tools/UndoRedoBar";
import { ToolEditorLayout } from "@/components/tools/ToolEditorLayout";
import { SegControl } from "@/components/tools/SegControl";

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

type HeadlineDensity = "panel" | "bar" | "corner" | "readable";

/** Starting rem before measure-to-fit shrinks to keep each line intact. */
function headlineStartRem(lines: string[], density: HeadlineDensity): number {
  const longest = lines.reduce((m, l) => Math.max(m, l.length), 0) || 1;
  const caps =
    density === "panel"
      ? { min: 0.75, max: 1.35, fitAt: 8 }
      : density === "bar"
        ? { min: 0.95, max: 1.85, fitAt: 14 }
        : density === "readable"
          ? { min: 0.7, max: 1.25, fitAt: 12 }
          : { min: 1.0, max: 2.0, fitAt: 10 };
  return Math.max(
    caps.min,
    Math.min(caps.max, (caps.fitAt / longest) * caps.max),
  );
}

function headlineMinRem(density: HeadlineDensity): number {
  if (density === "panel") return 0.65;
  if (density === "bar") return 0.85;
  if (density === "readable") return 0.6;
  return 0.9;
}

/**
 * Stacked headline that never breaks mid-word — shrinks font until each
 * nowrap line fits the container width.
 */
function FitStackedHeadline({
  lines,
  ink,
  density,
  align = "left",
}: {
  lines: string[];
  ink: string;
  density: HeadlineDensity;
  align?: "left" | "right" | "center";
}) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const linesKey = lines.join("\n");
  const [fontSizeRem, setFontSizeRem] = useState(() =>
    headlineStartRem(lines, density),
  );

  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const currentLines = linesKey.split("\n").filter(Boolean);

    const fit = () => {
      const min = headlineMinRem(density);
      let size = headlineStartRem(currentLines, density);
      const apply = (rem: number) => {
        for (const node of el.querySelectorAll<HTMLElement>("[data-headline-line]")) {
          node.style.fontSize = `${rem}rem`;
        }
      };
      apply(size);
      // Shrink until every line fits (or floor). Step in rem for export stability.
      for (let i = 0; i < 48; i++) {
        const overflowing = Array.from(
          el.querySelectorAll<HTMLElement>("[data-headline-line]"),
        ).some((line) => line.scrollWidth > el.clientWidth + 0.5);
        if (!overflowing || size <= min) break;
        size = Math.max(min, size - 0.05);
        apply(size);
      }
      setFontSizeRem(size);
    };

    fit();
    const ro = new ResizeObserver(() => fit());
    ro.observe(el);
    return () => ro.disconnect();
  }, [linesKey, density]);

  return (
    <div
      ref={wrapRef}
      className={cn(
        "min-w-0 w-full max-w-full overflow-hidden",
        align === "center" && "text-center",
        align === "right" && "text-right",
      )}
    >
      {lines.map((line, i) => (
        <p
          key={`${i}-${line}`}
          data-headline-line
          className={cn(
            "uppercase leading-[0.95]",
            density === "readable"
              ? "font-bold tracking-wide"
              : "font-black leading-[0.92] tracking-tight",
          )}
          style={{
            color: ink,
            fontSize: `${fontSizeRem}rem`,
            whiteSpace: "nowrap",
            overflow: "hidden",
          }}
        >
          {line}
        </p>
      ))}
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
  const lastLandscapeDesign = useRef<MeetingDesignSet>("bold");
  const [formatId, setFormatId] = useState<MeetingBackgroundFormatId>(
    DEFAULT_MEETING_BACKGROUND_FORMAT,
  );

  const first = MEETING_BACKGROUND_PRESETS[0];
  const themeEstablished = isBrandThemeEstablished(brandKit, onboardingComplete);
  const format = MEETING_BACKGROUND_FORMATS[formatId];
  const orientation = orientationOf(format);
  const isPortrait = orientation === "portrait";
  const sizeFormats = formatsForOrientation(orientation);

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
  const { exportError, exporting, runExport } = useExportHandler();

  // Design set is derived from the active layout (undo/redo stays consistent)
  const designSet = designSetForLayout(state.layout);
  const layoutOptions = layoutsForDesignSet(
    isPortrait ? "minimal" : designSet,
  );

  // Bold layouts are landscape-only — fix format if history lands on Bold + portrait
  if (designSet === "bold" && isPortrait) {
    setFormatId(matchingFormatForOrientation(formatId, "landscape"));
  }

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
      layout: layoutForDesignSet(preset, designSet),
      showLeadIn: true,
      showHeadline: true,
      showCloser: true,
    });
  };

  const snapLayoutForDesign = (
    nextDesign: MeetingDesignSet,
    currentLayout: MeetingLayout,
    presetId: string,
  ): MeetingLayout => {
    const allowed = layoutsForDesignSet(nextDesign);
    if ((allowed as readonly string[]).includes(currentLayout)) {
      return currentLayout;
    }
    const preset = getMeetingPresetById(presetId);
    if (preset) return layoutForDesignSet(preset, nextDesign);
    return allowed[0];
  };

  const handleDesignChange = (next: MeetingDesignSet) => {
    if (next === designSet && !(next === "bold" && isPortrait)) return;
    // Bold is landscape-only — leaving Minimal+Portrait for Bold flips orientation
    if (next === "bold" && isPortrait) {
      setFormatId(matchingFormatForOrientation(formatId, "landscape"));
    }
    if (!isPortrait || next === "bold") {
      lastLandscapeDesign.current = next;
    }
    const nextLayout = snapLayoutForDesign(next, state.layout, state.presetId);
    if (nextLayout !== state.layout) {
      setState({ ...state, layout: nextLayout });
    }
  };

  const handleOrientationChange = (next: MeetingBackgroundOrientation) => {
    if (next === orientation) return;
    const nextFormat = matchingFormatForOrientation(formatId, next);
    setFormatId(nextFormat);

    if (next === "portrait") {
      lastLandscapeDesign.current = designSet;
      const nextLayout = snapLayoutForDesign(
        "minimal",
        state.layout,
        state.presetId,
      );
      if (nextLayout !== state.layout) {
        setState({ ...state, layout: nextLayout });
      }
      return;
    }

    // Back to landscape — restore last landscape design preference
    const restored = lastLandscapeDesign.current;
    const nextLayout = snapLayoutForDesign(
      restored,
      state.layout,
      state.presetId,
    );
    if (nextLayout !== state.layout) {
      setState({ ...state, layout: nextLayout });
    }
  };

  const handleExportPng = async () => {
    if (!canvasRef.current) return;
    await runExport(async () => {
      await exportNodeAsPng(
        canvasRef.current!,
        formatFilename(format.filenameStem, brandKit.local.localNumber, "png"),
        {
          pixelRatio: exportPixelRatio(canvasRef.current!, format),
          backgroundColor: primary,
        },
      );
    });
  };

  const stackedHeadline = (
    ink: string,
    density: HeadlineDensity,
    align: "left" | "right" | "center" = "left",
  ) =>
    showHead ? (
      <FitStackedHeadline
        lines={lines}
        ink={ink}
        density={density}
        align={align}
      />
    ) : null;

  const leadLine = (ink: string, align: "left" | "right" | "center" = "left") =>
    showLead ? (
      <p
        className={cn(
          "min-w-0 max-w-full text-[10px] font-semibold uppercase tracking-[0.18em] md:text-xs",
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
          "min-w-0 max-w-full text-[10px] font-medium tracking-wide md:text-xs",
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

  const bandPad = isPortrait
    ? "px-4 py-2.5 md:px-5 md:py-3"
    : "px-5 py-2 md:px-7 md:py-2.5";
  const fieldPad = isPortrait ? "p-4 md:p-5" : "p-5 md:p-7";
  const railWidth = isPortrait ? "w-[7%] min-w-[10px] max-w-[28px]" : "w-[4%] min-w-[8px] max-w-[20px]";

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
        <div className="ml-auto w-full max-w-[46%] min-w-0 overflow-hidden text-right">
          {showBrand && showLead ? leadLine(secondaryOnPrimary, "right") : null}
          <div className={cn(showLead && showBrand && "mt-1.5")}>
            {stackedHeadline(canvasInk, "corner", "right")}
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
            <div className="min-w-0 flex-1 overflow-hidden">
              {leadLine(meetsWcagAA(secondary, accent, true) ? secondary : mutedAccent)}
              <div className={cn(showLead && "mt-1")}>
                {stackedHeadline(accentInk, "bar")}
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
            className="box-border flex h-full w-[34%] min-w-0 max-w-[40%] shrink-0 flex-col justify-between overflow-hidden p-3 md:p-4"
            style={{ backgroundColor: secondary }}
          >
            <div className="min-w-0 w-full max-w-full overflow-hidden">
              {leadLine(meetsWcagAA(accent, secondary, true) ? accent : mutedSecondary)}
              <div className={cn(showLead && "mt-2")}>
                {stackedHeadline(secondaryInk, "panel")}
              </div>
              {showClose ? (
                <div className="mt-3">{closerLine(mutedSecondary)}</div>
              ) : null}
            </div>
            {showBrand ? (
              <div className="mt-4 min-w-0 max-w-full overflow-hidden">
                <BrandLogo size="sm" backgroundColor={secondary} />
                <p
                  className="mt-1.5 text-[9px] font-medium leading-tight md:text-[10px]"
                  style={{
                    color: mutedSecondary,
                    overflowWrap: "anywhere",
                    wordBreak: "break-word",
                  }}
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
  } else if (state.layout === "bands") {
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
            <div className="min-w-0 flex-1 overflow-hidden">
              {!showTop && showLead
                ? leadLine(
                    meetsWcagAA(accent, secondary, true)
                      ? accent
                      : mutedSecondary,
                  )
                : null}
              <div className={cn(!showTop && showLead && "mt-1")}>
                {stackedHeadline(secondaryInk, "bar")}
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
  } else if (state.layout === "masthead") {
    const bandHasContent = showCopy || showBrand;
    canvasBody = (
      <div
        className="relative box-border flex h-full w-full flex-col"
        style={{ backgroundColor: primary }}
      >
        {bandHasContent ? (
          <div
            className={cn(
              "flex shrink-0 items-center justify-between gap-3",
              bandPad,
            )}
            style={{ backgroundColor: secondary }}
          >
            <div className="min-w-0 flex-1 overflow-hidden">
              {leadLine(
                meetsWcagAA(accent, secondary, true) ? accent : mutedSecondary,
              )}
              <div className={cn(showLead && "mt-1")}>
                {stackedHeadline(secondaryInk, "readable")}
              </div>
              {showClose ? (
                <div className="mt-1">{closerLine(mutedSecondary)}</div>
              ) : null}
            </div>
            {brandLockup(secondary, mutedSecondary, "sm")}
          </div>
        ) : null}
        <div className="min-h-0 flex-1" />
      </div>
    );
  } else if (state.layout === "footer") {
    const bandHasContent = showCopy || showBrand;
    canvasBody = (
      <div
        className="relative box-border flex h-full w-full flex-col"
        style={{ backgroundColor: primary }}
      >
        <div className="min-h-0 flex-1" />
        {bandHasContent ? (
          <div
            className={cn(
              "flex shrink-0 items-center justify-between gap-3",
              bandPad,
            )}
            style={{ backgroundColor: accent }}
          >
            <div className="min-w-0 flex-1 overflow-hidden">
              {leadLine(
                meetsWcagAA(secondary, accent, true) ? secondary : mutedAccent,
              )}
              <div className={cn(showLead && "mt-1")}>
                {stackedHeadline(accentInk, "readable")}
              </div>
              {showClose ? (
                <div className="mt-1">{closerLine(mutedAccent)}</div>
              ) : null}
            </div>
            {brandLockup(accent, mutedAccent, "sm")}
          </div>
        ) : null}
      </div>
    );
  } else if (state.layout === "rails") {
    const hasType = showCopy;
    canvasBody = (
      <div
        className="relative box-border flex h-full w-full"
        style={{ backgroundColor: primary }}
      >
        <div
          className={cn("h-full shrink-0", railWidth)}
          style={{ backgroundColor: accent }}
        />
        <div
          className={cn(
            "flex min-h-0 min-w-0 flex-1 flex-col justify-between",
            fieldPad,
          )}
        >
          <div className="mx-auto w-full max-w-[88%] min-w-0 overflow-hidden text-center">
            {hasType ? (
              <>
                {leadLine(secondaryOnPrimary, "center")}
                <div className={cn(showLead && "mt-1.5")}>
                  {stackedHeadline(canvasInk, "readable", "center")}
                </div>
                {showClose ? (
                  <div className="mt-1.5">
                    {closerLine(mutedPrimary, "center")}
                  </div>
                ) : null}
              </>
            ) : null}
          </div>
          {showBrand ? (
            <div className="flex justify-center">
              {brandLockup(primary, mutedPrimary, "sm")}
            </div>
          ) : (
            <span />
          )}
        </div>
        <div
          className={cn("h-full shrink-0", railWidth)}
          style={{ backgroundColor: accent }}
        />
      </div>
    );
  } else {
    // upper-stack — readable type in upper ~28%; open field below
    const stackHasContent = showCopy || showBrand;
    canvasBody = (
      <div
        className="relative box-border flex h-full w-full flex-col"
        style={{ backgroundColor: primary }}
      >
        {stackHasContent ? (
          <div
            className={cn(
              "flex shrink-0 flex-col justify-start",
              fieldPad,
              isPortrait ? "max-h-[30%]" : "max-h-[28%]",
            )}
          >
            <div className="min-w-0 w-full max-w-[92%] overflow-hidden">
              {leadLine(secondaryOnPrimary)}
              <div className={cn(showLead && "mt-1.5")}>
                {stackedHeadline(canvasInk, "readable")}
              </div>
              {showClose ? (
                <div className="mt-1.5">{closerLine(mutedPrimary)}</div>
              ) : null}
            </div>
            {showBrand ? (
              <div className="mt-3">{brandLockup(primary, mutedPrimary, "sm")}</div>
            ) : null}
          </div>
        ) : null}
        <div className="min-h-0 flex-1" />
      </div>
    );
  }

  return (
    <ToolEditorLayout
      title={t("title")}
      description={t("subtitle")}
      exportError={exportError}
      toolbar={
        !themeEstablished && hydrated ? (
          <p className="rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950">
            {t("setupBrandPrompt")}{" "}
            <Link
              href="/onboarding"
              className="font-medium text-opseu-blue underline"
            >
              {t("setupBrandLink")}
            </Link>
          </p>
        ) : null
      }
      form={
        <Card density="compact" className="space-y-3">
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
              className="min-h-11 w-full rounded-md border border-gray-300 px-3 py-2"
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

          <SegControl
            label={t("design")}
            value={isPortrait ? "minimal" : designSet}
            options={[
              {
                value: "bold" as const,
                label: t("designs.bold"),
                disabled: isPortrait,
              },
              { value: "minimal" as const, label: t("designs.minimal") },
            ]}
            onChange={handleDesignChange}
          />

          <SegControl
            label={t("orientation")}
            value={orientation}
            options={[
              { value: "landscape" as const, label: t("orientations.landscape") },
              { value: "portrait" as const, label: t("orientations.portrait") },
            ]}
            onChange={handleOrientationChange}
          />

          <SegControl
            label={t("layout")}
            value={state.layout}
            options={layoutOptions.map((id) => ({
              value: id,
              label: t(`layouts.${id}`),
            }))}
            onChange={(layout) => setState({ ...state, layout })}
          />

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

          <SegControl
            label={t("outputSize")}
            value={formatId}
            options={sizeFormats.map((f) => ({
              value: f.id,
              label: t(f.labelKey),
            }))}
            onChange={setFormatId}
          />
          <p className="text-xs text-gray-500">
            {isPortrait ? t("sizeHintPortrait") : t("sizeHint")}
          </p>

          <ThemePicker
            primaryColor={state.primaryColor}
            secondaryColor={state.secondaryColor}
            onPrimaryChange={(c) => setState({ ...state, primaryColor: c })}
            onSecondaryChange={(c) =>
              setState({ ...state, secondaryColor: c })
            }
          />

          <UndoRedoBar
            canUndo={canUndo}
            canRedo={canRedo}
            onUndo={undo}
            onRedo={redo}
            onReset={() => {
              setFormatId(DEFAULT_MEETING_BACKGROUND_FORMAT);
              lastLandscapeDesign.current = "bold";
              reset({
                ...initial,
                includeBranding: themeEstablished,
                primaryColor: brandKit.primaryColor,
                secondaryColor: brandKit.secondaryColor,
                accentColor: brandKit.accentColor,
              });
            }}
          />

          <Button
            type="button"
            onClick={() => void handleExportPng()}
            disabled={exporting}
          >
            {exporting ? tc("exporting") : tc("downloadPng")}
          </Button>
        </Card>
      }
      previewActions={
        <Button
          type="button"
          onClick={() => void handleExportPng()}
          disabled={exporting}
        >
          {exporting ? tc("exporting") : tc("downloadPng")}
        </Button>
      }
      preview={
        <div>
          <p className="mb-2 text-sm font-medium text-gray-700">
            {t("preview")}
          </p>
          <div
            className={cn(
              "overflow-hidden rounded-lg shadow-lg shadow-black/20",
              isPortrait && "mx-auto max-w-[280px] sm:max-w-[320px]",
            )}
          >
            <div
              ref={canvasRef}
              className={cn("w-full overflow-hidden", format.aspect)}
              style={{ backgroundColor: primary, color: canvasInk }}
            >
              {canvasBody}
            </div>
          </div>
        </div>
      }
    />
  );
}
