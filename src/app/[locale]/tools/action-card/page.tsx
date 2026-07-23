"use client";

import { useEffect, useRef, useState, type CSSProperties } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { useBrandStore } from "@/store/brand-store";
import { useUndoRedo } from "@/hooks/use-undo-redo";
import { useExportHandler } from "@/hooks/use-export-handler";
import { exportNodeAsPng } from "@/lib/export/image-export";
import { nodeToPdf } from "@/lib/export/pdf-export";
import { qrDataUrl } from "@/lib/export/qr";
import { formatFilename, resolveLocalNumber, cn } from "@/lib/utils";
import { isBrandThemeEstablished } from "@/lib/utils/brand-theme";
import { listSavedLinks } from "@/lib/utils/local-links";
import {
  DEFAULT_QR_CARD_SIZE,
  QR_CARD_SIZE_ORDER,
  QR_CARD_SIZES,
  qrCardExportPixelRatio,
  type QrCardSizeId,
} from "@/lib/constants/qr-card-sizes";
import {
  ACTION_CARD_PRESETS,
  getActionCardPreset,
} from "@/lib/constants/action-card-presets";
import type { QrCardBgMode } from "@/lib/constants/qr-card-presets";
import { BrandLogo } from "@/components/brand/BrandLogo";
import { Button } from "@/components/ui/Button";
import { Input, Textarea } from "@/components/ui/Input";
import { Card } from "@/components/ui/Card";
import { ThemePicker } from "@/components/tools/ThemePicker";
import { UndoRedoBar } from "@/components/tools/UndoRedoBar";
import { ToolEditorLayout } from "@/components/tools/ToolEditorLayout";
import { SegControl } from "@/components/tools/SegControl";
import { inkWithAlpha, pickContrastingInk } from "@/lib/utils/ink";
import { meetsWcagAA } from "@/lib/utils/contrast";

interface ActionCardState {
  presetId: string;
  destination: string;
  headline: string;
  ask: string;
  deadline: string;
  cta: string;
  bgMode: QrCardBgMode;
  sizeId: QrCardSizeId;
  showUrl: boolean;
  includeBranding: boolean;
  primaryColor: string;
  secondaryColor: string;
}

export default function ActionCardPage() {
  const t = useTranslations("actionCard");
  const tc = useTranslations("common");
  const brandKit = useBrandStore((s) => s.brandKit);
  const onboardingComplete = useBrandStore((s) => s.onboardingComplete);
  const hydrated = useBrandStore((s) => s.hydrated);
  const canvasRef = useRef<HTMLDivElement>(null);
  const [qrSrc, setQrSrc] = useState<string | null>(null);
  const seeded = useRef(false);

  const themeEstablished = isBrandThemeEstablished(brandKit, onboardingComplete);
  const first = ACTION_CARD_PRESETS[0];

  const initial: ActionCardState = {
    presetId: first.id,
    destination: "",
    headline: "",
    ask: "",
    deadline: "",
    cta: "",
    bgMode: first.bgMode,
    sizeId: DEFAULT_QR_CARD_SIZE,
    showUrl: false,
    includeBranding: false,
    primaryColor: brandKit.primaryColor,
    secondaryColor: brandKit.secondaryColor,
  };

  const { state, setState, undo, redo, canUndo, canRedo, reset } =
    useUndoRedo<ActionCardState>(initial);
  const { exportError, exporting, runExport } = useExportHandler();

  useEffect(() => {
    if (!hydrated || seeded.current) return;
    seeded.current = true;
    reset({
      presetId: first.id,
      destination: "",
      headline: t(`presets.${first.headlineKey}`),
      ask: t(`presets.${first.askKey}`),
      deadline: t(`presets.${first.deadlineKey}`),
      cta: t(`presets.${first.ctaKey}`),
      bgMode: first.bgMode,
      sizeId: DEFAULT_QR_CARD_SIZE,
      showUrl: false,
      includeBranding: themeEstablished,
      primaryColor: brandKit.primaryColor,
      secondaryColor: brandKit.secondaryColor,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- one-shot hydrate
  }, [hydrated, themeEstablished]);

  const size = QR_CARD_SIZES[state.sizeId];
  const exportPixelRatio = qrCardExportPixelRatio(size);
  const savedLinks = listSavedLinks(brandKit, {
    website: t("savedWebsite"),
    facebook: t("savedFacebook"),
  });

  useEffect(() => {
    let cancelled = false;
    const destination = state.destination.trim();
    const task = destination
      ? qrDataUrl(destination, { width: size.qrPixels })
      : Promise.resolve(null);
    void task.then((url) => {
      if (!cancelled) setQrSrc(url);
    });
    return () => {
      cancelled = true;
    };
  }, [state.destination, size.qrPixels]);

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
    return {
      ...box,
      backgroundColor: state.primaryColor,
      color: ink,
    };
  })();

  const canvasInk = pickContrastingInk(state.primaryColor);
  const mutedInk = inkWithAlpha(canvasInk, 0.9);
  const mutedInk80 = inkWithAlpha(canvasInk, 0.8);
  const ctaColor =
    state.bgMode === "plain" &&
    meetsWcagAA(state.secondaryColor, state.primaryColor, true)
      ? state.secondaryColor
      : canvasInk;

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
        { pixelRatio: exportPixelRatio, backgroundColor: state.primaryColor },
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
        state.primaryColor,
      );
    });
  };

  const isCompact = state.sizeId === "square4" || state.sizeId === "quarter";
  const isSquare = state.sizeId === "square4" || state.sizeId === "square5";

  const headlineSize = isSquare
    ? state.sizeId === "square4"
      ? "text-base"
      : "text-lg"
    : state.sizeId === "letter"
      ? "text-3xl"
      : state.sizeId === "half"
        ? "text-2xl"
        : "text-xl";

  return (
    <ToolEditorLayout
      title={t("title")}
      description={t("subtitle")}
      exportError={exportError}
      toolbar={
        !themeEstablished && hydrated ? (
          <p className="rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950">
            {t("setupBrandPrompt")}{" "}
            <Link href="/onboarding" className="font-medium text-opseu-blue underline">
              {t("setupBrandLink")}
            </Link>
          </p>
        ) : null
      }
      form={
        <Card density="compact" className="space-y-3">
          <p className="text-xs text-gray-600">{t("privacyHint")}</p>

          <div>
            <label
              htmlFor="action-preset"
              className="mb-1.5 block text-sm font-medium text-gray-700"
            >
              {t("preset")}
            </label>
            <select
              id="action-preset"
              value={state.presetId}
              onChange={(e) => applyPreset(e.target.value)}
              className="min-h-11 w-full rounded-md border border-gray-300 px-3 py-2"
            >
              {ACTION_CARD_PRESETS.map((p) => (
                <option key={p.id} value={p.id}>
                  {t(`presets.${p.headlineKey}`)}
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
              <label
                htmlFor="action-saved-link"
                className="mb-1.5 block text-sm font-medium text-gray-700"
              >
                {t("savedLinks")}
              </label>
              <select
                id="action-saved-link"
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

          <SegControl
            label={t("bgMode")}
            value={state.bgMode}
            options={(["plain", "gradient", "accentBar"] as const).map((mode) => ({
              value: mode,
              label: t(`bgModes.${mode}`),
            }))}
            onChange={(bgMode) => setState({ ...state, bgMode })}
          />

          <div>
            <SegControl
              label={t("size")}
              value={state.sizeId}
              options={QR_CARD_SIZE_ORDER.map((id) => ({
                value: id,
                label: t(`sizes.${id}`),
              }))}
              onChange={(sizeId) => setState({ ...state, sizeId })}
            />
            <p className="mt-2 text-xs text-gray-500">{t("sizeTip")}</p>
          </div>

          <label className="flex min-h-11 items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={state.showUrl}
              onChange={(e) => setState({ ...state, showUrl: e.target.checked })}
            />
            {t("showUrl")}
          </label>

          <label className="flex min-h-11 items-center gap-2 text-sm">
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
            onReset={() => {
              reset({
                ...initial,
                headline: t(`presets.${first.headlineKey}`),
                ask: t(`presets.${first.askKey}`),
                deadline: t(`presets.${first.deadlineKey}`),
                cta: t(`presets.${first.ctaKey}`),
                includeBranding: themeEstablished,
                primaryColor: brandKit.primaryColor,
                secondaryColor: brandKit.secondaryColor,
              });
            }}
          />
          <div className="flex gap-3">
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
              <div className="shadow-lg">
                <div
                  ref={canvasRef}
                  className="relative flex w-full min-w-0 flex-col overflow-hidden"
                  style={canvasStyle}
                >
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
                    className={cn(
                      "flex min-h-0 min-w-0 flex-1 flex-col items-center justify-between text-center",
                      isCompact
                        ? "gap-1.5 p-2.5"
                        : isSquare
                          ? "gap-2 p-3"
                          : "gap-3 p-4 sm:p-5",
                    )}
                  >
                    <div className="w-full min-w-0 shrink-0">
                      {state.includeBranding ? (
                        <div
                          className={cn(
                            "flex justify-center",
                            isCompact ? "mb-1" : "mb-2",
                          )}
                        >
                          <BrandLogo
                            size="sm"
                            backgroundColor={state.primaryColor}
                          />
                        </div>
                      ) : null}
                      <h2
                        className={cn(
                          "font-black uppercase leading-tight tracking-tight",
                          headlineSize,
                        )}
                        style={{ color: canvasInk }}
                      >
                        {state.headline}
                      </h2>
                      {state.ask.trim() ? (
                        <p
                          className={cn(
                            "mt-1.5 leading-snug",
                            isCompact || isSquare ? "text-xs" : "text-sm",
                          )}
                          style={{ color: mutedInk }}
                        >
                          {state.ask}
                        </p>
                      ) : null}
                      {state.deadline.trim() ? (
                        <p
                          className={cn(
                            "mt-1.5 font-bold uppercase tracking-wide",
                            isCompact || isSquare ? "text-[10px]" : "text-xs",
                          )}
                          style={{ color: ctaColor }}
                        >
                          {state.deadline}
                        </p>
                      ) : null}
                    </div>

                    <div className="flex min-h-0 w-full min-w-0 flex-col items-center justify-center">
                      <div
                        className={cn(
                          "rounded-md",
                          isCompact || isSquare ? "p-1.5" : "p-2",
                        )}
                        style={{
                          width: `${qrPlatePercent}%`,
                          backgroundColor: "#FFFFFF",
                        }}
                      >
                        {qrSrc ? (
                          // eslint-disable-next-line @next/next/no-img-element -- data URL from client QR
                          <img
                            src={qrSrc}
                            alt=""
                            className="aspect-square h-auto w-full"
                          />
                        ) : (
                          <div
                            className="flex aspect-square w-full items-center justify-center text-[0.65rem]"
                            style={{
                              backgroundColor: "#F3F4F6",
                              color: "#6B7280",
                            }}
                          >
                            {t("qrPlaceholder")}
                          </div>
                        )}
                      </div>
                      {state.cta.trim() ? (
                        <p
                          className={cn(
                            "mt-1.5 font-bold uppercase tracking-wide",
                            isCompact || isSquare ? "text-[10px]" : "text-sm",
                          )}
                          style={{ color: ctaColor }}
                        >
                          {state.cta}
                        </p>
                      ) : null}
                      {state.showUrl && state.destination.trim() ? (
                        <p
                          className="mt-1 max-w-full truncate text-[10px]"
                          style={{ color: mutedInk80 }}
                        >
                          {state.destination}
                        </p>
                      ) : null}
                    </div>

                    {state.includeBranding ? (
                      <p
                        className={cn(
                          "shrink-0 font-semibold",
                          isCompact || isSquare ? "text-[10px]" : "text-xs",
                        )}
                        style={{ color: mutedInk }}
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
