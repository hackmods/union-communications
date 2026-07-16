"use client";

import { useEffect, useRef, useState, type ReactElement } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { useBrandStore } from "@/store/brand-store";
import { useUndoRedo } from "@/hooks/use-undo-redo";
import { exportNodeAsPng } from "@/lib/export/image-export";
import { formatFilename, resolveLocalNumber, cn } from "@/lib/utils";
import { isBrandThemeEstablished } from "@/lib/utils/brand-theme";
import { hexToRgb } from "@/lib/utils/contrast";
import { inkWithAlpha, pickContrastingInk } from "@/lib/utils/ink";
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
  type MeetingIntensity,
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
  headline: string;
  closer: string;
  layout: MeetingLayout;
  intensity: MeetingIntensity;
  includeBranding: boolean;
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
}

/** Soften a brand hex toward white for low-key meeting fields (export-safe solid hex). */
function mixTowardWhite(hex: string, amount: number): string {
  const rgb = hexToRgb(hex);
  if (!rgb) return hex;
  const t = Math.min(1, Math.max(0, amount));
  const r = Math.round(rgb.r + (255 - rgb.r) * t);
  const g = Math.round(rgb.g + (255 - rgb.g) * t);
  const b = Math.round(rgb.b + (255 - rgb.b) * t);
  return `#${[r, g, b].map((c) => c.toString(16).padStart(2, "0")).join("")}`;
}

function fieldHex(primary: string, intensity: MeetingIntensity): string {
  return mixTowardWhite(primary, intensity === "subtle" ? 0.78 : 0.52);
}

function panelHex(
  secondary: string,
  primary: string,
  intensity: MeetingIntensity,
): string {
  const base = secondary || primary;
  return mixTowardWhite(base, intensity === "subtle" ? 0.35 : 0.12);
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
        className="h-[72%] w-auto max-w-[42%] opacity-35"
        role="img"
      >
        <ellipse cx="100" cy="72" rx="42" ry="48" fill="#1a1a1a" />
        <path
          d="M40 210 C40 150 70 128 100 128 C130 128 160 150 160 210 Z"
          fill="#1a1a1a"
        />
      </svg>
      <div
        className="absolute inset-[8%] rounded-[50%] border-2 border-dashed opacity-40"
        style={{ borderColor: "#1a1a1a" }}
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
    headline: first.headline,
    closer: first.closer,
    layout: first.layout,
    intensity: first.intensity,
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

  const wash = fieldHex(state.primaryColor, state.intensity);
  const panel = panelHex(state.secondaryColor, state.primaryColor, state.intensity);
  const barBg =
    state.intensity === "subtle"
      ? mixTowardWhite(state.accentColor || state.secondaryColor || state.primaryColor, 0.55)
      : mixTowardWhite(state.accentColor || state.secondaryColor || state.primaryColor, 0.28);
  const washInk = pickContrastingInk(wash);
  const panelInk = pickContrastingInk(panel);
  const barInk = pickContrastingInk(barBg);
  const watermarkInk = inkWithAlpha(washInk, state.intensity === "subtle" ? 0.14 : 0.22);
  const mutedWash = inkWithAlpha(washInk, 0.55);
  const mutedPanel = inkWithAlpha(panelInk, 0.7);

  const applyPreset = (id: string) => {
    const preset = getMeetingPresetById(id);
    if (!preset) return;
    setState({
      ...state,
      presetId: preset.id,
      headline: preset.headline,
      closer: preset.closer,
      layout: preset.layout,
      intensity: preset.intensity,
    });
  };

  const handleExportPng = async () => {
    if (!canvasRef.current) return;
    await exportNodeAsPng(
      canvasRef.current,
      formatFilename(format.filenameStem, brandKit.local.localNumber, "png"),
      {
        pixelRatio: exportPixelRatio(canvasRef.current, format),
        backgroundColor: wash,
      },
    );
  };

  const brandingBlock = (bg: string, ink: string, compact = false) =>
    state.includeBranding ? (
      <div className={cn("flex items-center gap-2", compact && "scale-90")}>
        <BrandLogo size={compact ? "sm" : "md"} backgroundColor={bg} />
        <p
          className="text-[10px] font-medium tracking-wide md:text-xs"
          style={{ color: ink }}
        >
          {localLabel}
        </p>
      </div>
    ) : null;

  const textBlock = (
    ink: string,
    muted: string,
    align: "left" | "center" | "right" = "left",
  ) => (
    <div
      className={cn(
        "max-w-[40%]",
        align === "center" && "mx-auto text-center",
        align === "right" && "ml-auto text-right",
      )}
    >
      {state.headline ? (
        <p
          className="text-sm font-semibold tracking-wide md:text-base"
          style={{ color: ink }}
        >
          {state.headline}
        </p>
      ) : null}
      {state.closer ? (
        <p
          className="mt-0.5 text-[10px] font-medium md:text-xs"
          style={{ color: muted }}
        >
          {state.closer}
        </p>
      ) : null}
    </div>
  );

  let canvasBody: ReactElement | null = null;

  if (state.layout === "corner") {
    canvasBody = (
      <div
        className="relative box-border flex h-full w-full flex-col justify-end p-5 md:p-7"
        style={{ backgroundColor: wash }}
      >
        <div className="flex items-end justify-end gap-4">
          <div className="text-right">
            {textBlock(washInk, mutedWash, "right")}
            <div className="mt-2 flex justify-end">
              {brandingBlock(wash, mutedWash, true)}
            </div>
          </div>
        </div>
      </div>
    );
  } else if (state.layout === "lower-third") {
    canvasBody = (
      <div
        className="relative box-border flex h-full w-full flex-col"
        style={{ backgroundColor: wash }}
      >
        <div className="flex-1" />
        <div
          className="flex shrink-0 items-center justify-between gap-3 px-5 py-3 md:px-7 md:py-3.5"
          style={{ backgroundColor: barBg }}
        >
          <div className="min-w-0 flex-1">
            {state.headline ? (
              <p
                className="text-sm font-semibold tracking-wide md:text-base"
                style={{ color: barInk }}
              >
                {state.headline}
              </p>
            ) : null}
            {state.closer ? (
              <p
                className="mt-0.5 text-[10px] font-medium md:text-xs"
                style={{ color: inkWithAlpha(barInk, 0.75) }}
              >
                {state.closer}
              </p>
            ) : null}
          </div>
          {state.includeBranding ? (
            <div className="flex shrink-0 items-center gap-2">
              <BrandLogo size="sm" backgroundColor={barBg} />
              <p
                className="hidden text-[10px] font-medium sm:block md:text-xs"
                style={{ color: inkWithAlpha(barInk, 0.85) }}
              >
                {localLabel}
              </p>
            </div>
          ) : null}
        </div>
      </div>
    );
  } else if (state.layout === "side-panel") {
    canvasBody = (
      <div
        className="relative box-border flex h-full w-full"
        style={{ backgroundColor: wash }}
      >
        <div
          className="box-border flex h-full w-[22%] min-w-[5.5rem] flex-col justify-between p-3 md:p-4"
          style={{ backgroundColor: panel }}
        >
          <div>
            {state.headline ? (
              <p
                className="text-xs font-semibold leading-snug tracking-wide md:text-sm"
                style={{ color: panelInk }}
              >
                {state.headline}
              </p>
            ) : null}
            {state.closer ? (
              <p
                className="mt-2 text-[10px] font-medium leading-snug md:text-xs"
                style={{ color: mutedPanel }}
              >
                {state.closer}
              </p>
            ) : null}
          </div>
          {state.includeBranding ? (
            <div className="mt-auto">
              <BrandLogo size="sm" backgroundColor={panel} />
              <p
                className="mt-1.5 text-[9px] font-medium leading-tight md:text-[10px]"
                style={{ color: mutedPanel }}
              >
                {localLabel}
              </p>
            </div>
          ) : null}
        </div>
        <div className="flex-1" />
      </div>
    );
  } else {
    // watermark
    canvasBody = (
      <div
        className="relative box-border flex h-full w-full flex-col justify-between p-5 md:p-7"
        style={{ backgroundColor: wash }}
      >
        <div className="flex justify-end">
          {brandingBlock(wash, mutedWash, true)}
        </div>
        <div className="flex flex-1 items-center justify-center px-8">
          {state.headline ? (
            <p
              className="text-center text-2xl font-semibold uppercase tracking-[0.12em] md:text-3xl"
              style={{ color: watermarkInk }}
            >
              {state.headline}
            </p>
          ) : state.includeBranding ? (
            <div style={{ opacity: 0.4 }}>
              <BrandLogo size="lg" backgroundColor={wash} />
            </div>
          ) : null}
        </div>
        <div className="flex justify-start">
          {state.closer ? (
            <p
              className="text-[10px] font-medium md:text-xs"
              style={{ color: mutedWash }}
            >
              {state.closer}
            </p>
          ) : (
            <span />
          )}
        </div>
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
            label={t("headline")}
            value={state.headline}
            onChange={(e) => setState({ ...state, headline: e.target.value })}
          />
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
                [
                  "corner",
                  "lower-third",
                  "side-panel",
                  "watermark",
                ] as const
              ).map((id) => (
                <option key={id} value={id}>
                  {t(`layouts.${id}`)}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label
              htmlFor="meeting-intensity"
              className="mb-1 block text-sm font-medium"
            >
              {t("intensity")}
            </label>
            <select
              id="meeting-intensity"
              value={state.intensity}
              onChange={(e) =>
                setState({
                  ...state,
                  intensity: e.target.value as MeetingIntensity,
                })
              }
              className="w-full rounded-md border border-gray-300 px-3 py-2"
            >
              <option value="subtle">{t("intensities.subtle")}</option>
              <option value="balanced">{t("intensities.balanced")}</option>
            </select>
          </div>

          <div>
            <label
              htmlFor="meeting-format"
              className="mb-1 block text-sm font-medium"
            >
              {t("outputSize")}
            </label>
            <select
              id="meeting-format"
              value={formatId}
              onChange={(e) =>
                setFormatId(e.target.value as MeetingBackgroundFormatId)
              }
              className="w-full rounded-md border border-gray-300 px-3 py-2"
            >
              {formats.map((f) => (
                <option key={f.id} value={f.id}>
                  {t(f.labelKey)}
                </option>
              ))}
            </select>
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
              checked={state.includeBranding}
              onChange={(e) =>
                setState({ ...state, includeBranding: e.target.checked })
              }
            />
            {t("includeBranding")}
          </label>

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
