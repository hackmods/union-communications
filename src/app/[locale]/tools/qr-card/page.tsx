"use client";

import { useEffect, useRef, useState, type CSSProperties } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { useBrandStore } from "@/store/brand-store";
import { useUndoRedo } from "@/hooks/use-undo-redo";
import { exportNodeAsPng } from "@/lib/export/image-export";
import { nodeToPdf } from "@/lib/export/pdf-export";
import { qrDataUrl } from "@/lib/export/qr";
import { formatFilename, resolveLocalNumber, cn } from "@/lib/utils";
import { isBrandThemeEstablished } from "@/lib/utils/brand-theme";
import {
  listSavedLinks,
  resolvePresetDestination,
} from "@/lib/utils/local-links";
import {
  DEFAULT_QR_CARD_SIZE,
  QR_CARD_SIZE_ORDER,
  QR_CARD_SIZES,
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
import { ThemePicker } from "@/components/tools/ThemePicker";
import { UndoRedoBar } from "@/components/tools/UndoRedoBar";

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
  const t = useTranslations("qrCard");
  const tc = useTranslations("common");
  const brandKit = useBrandStore((s) => s.brandKit);
  const onboardingComplete = useBrandStore((s) => s.onboardingComplete);
  const hydrated = useBrandStore((s) => s.hydrated);
  const canvasRef = useRef<HTMLDivElement>(null);
  const [qrSrc, setQrSrc] = useState<string | null>(null);
  const seeded = useRef(false);

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

  useEffect(() => {
    if (!hydrated || seeded.current) return;
    seeded.current = true;
    const origin = typeof window !== "undefined" ? window.location.origin : "";
    reset({
      presetId: first.id,
      destination: resolvePresetDestination(first.id, brandKit, origin),
      title: t(`presets.${first.titleKey}`),
      description: t(`presets.${first.descriptionKey}`),
      tagline: t(`presets.${first.taglineKey}`),
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
  const savedLinks = listSavedLinks(brandKit, {
    website: t("savedWebsite"),
    facebook: t("savedFacebook"),
  });

  useEffect(() => {
    let cancelled = false;
    if (!state.destination.trim()) {
      setQrSrc(null);
      return;
    }
    void qrDataUrl(state.destination, { width: size.qrPixels }).then((url) => {
      if (!cancelled) setQrSrc(url);
    });
    return () => {
      cancelled = true;
    };
  }, [state.destination, size.qrPixels]);

  const applyPreset = (id: string) => {
    const preset = getQrCardPreset(id);
    if (!preset) return;
    const origin = typeof window !== "undefined" ? window.location.origin : "";
    const fromPreset = preset.defaultUrl.trim();
    setState({
      ...state,
      presetId: preset.id,
      destination:
        fromPreset || resolvePresetDestination(preset.id, brandKit, origin),
      title: t(`presets.${preset.titleKey}`),
      description: t(`presets.${preset.descriptionKey}`),
      tagline: t(`presets.${preset.taglineKey}`),
      bgMode: preset.bgMode,
    });
  };

  const localLabel = brandKit.local.subText
    ? `Local ${resolveLocalNumber(brandKit.local.localNumber)} — ${brandKit.local.subText}`
    : `Local ${resolveLocalNumber(brandKit.local.localNumber)}`;

  const canvasStyle: CSSProperties = (() => {
    if (state.bgMode === "gradient") {
      return {
        backgroundImage: `linear-gradient(160deg, ${state.primaryColor} 0%, ${state.secondaryColor} 100%)`,
        color: "#FFFFFF",
      };
    }
    return {
      backgroundColor: state.primaryColor,
      color: "#FFFFFF",
    };
  })();

  const handleExportPng = async () => {
    if (!canvasRef.current) return;
    await exportNodeAsPng(
      canvasRef.current,
      formatFilename(`qr-card-${state.sizeId}`, brandKit.local.localNumber, "png"),
      { pixelRatio: 2 },
    );
  };

  const handleExportPdf = async () => {
    if (!canvasRef.current) return;
    await nodeToPdf(
      canvasRef.current,
      formatFilename(`qr-card-${state.sizeId}`, brandKit.local.localNumber, "pdf"),
      size.widthInches,
      size.heightInches,
    );
  };

  const titleSize =
    state.sizeId === "letter"
      ? "text-4xl md:text-5xl"
      : state.sizeId === "half"
        ? "text-3xl md:text-4xl"
        : state.sizeId === "square4"
          ? "text-xl md:text-2xl"
          : "text-2xl md:text-3xl";

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
            <label htmlFor="qr-preset" className="mb-1 block text-sm font-medium">
              {t("preset")}
            </label>
            <select
              id="qr-preset"
              value={state.presetId}
              onChange={(e) => applyPreset(e.target.value)}
              className="w-full rounded-md border border-gray-300 px-3 py-2"
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
              <label htmlFor="qr-saved-link" className="mb-1 block text-sm font-medium">
                {t("savedLinks")}
              </label>
              <select
                id="qr-saved-link"
                value=""
                onChange={(e) => {
                  const url = e.target.value;
                  if (url) setState({ ...state, destination: url });
                }}
                className="w-full rounded-md border border-gray-300 px-3 py-2"
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
            rows={2}
          />
          <Input
            label={t("tagline")}
            value={state.tagline}
            onChange={(e) => setState({ ...state, tagline: e.target.value })}
          />

          <div>
            <p className="mb-2 text-sm font-medium">{t("bgMode")}</p>
            <div className="flex flex-wrap gap-2">
              {(["plain", "gradient", "accentBar"] as const).map((mode) => (
                <button
                  key={mode}
                  type="button"
                  onClick={() => setState({ ...state, bgMode: mode })}
                  className={cn(
                    "rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
                    state.bgMode === mode
                      ? "bg-opseu-blue text-white"
                      : "bg-gray-100 text-gray-700 hover:bg-gray-200",
                  )}
                >
                  {t(`bgModes.${mode}`)}
                </button>
              ))}
            </div>
          </div>

          <div>
            <p className="mb-2 text-sm font-medium">{t("size")}</p>
            <div className="flex flex-wrap gap-2">
              {QR_CARD_SIZE_ORDER.map((id) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => setState({ ...state, sizeId: id })}
                  className={cn(
                    "rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
                    state.sizeId === id
                      ? "bg-opseu-blue text-white"
                      : "bg-gray-100 text-gray-700 hover:bg-gray-200",
                  )}
                >
                  {t(`sizes.${id}`)}
                </button>
              ))}
            </div>
            <p className="mt-2 text-xs text-gray-500">{t("sizeTip")}</p>
          </div>

          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={state.showUrl}
              onChange={(e) => setState({ ...state, showUrl: e.target.checked })}
            />
            {t("showUrl")}
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
          <div className="flex gap-3">
            <Button onClick={handleExportPng}>{tc("downloadPng")}</Button>
            <Button variant="outline" onClick={handleExportPdf}>
              {tc("downloadPdf")}
            </Button>
          </div>
        </Card>

        <div className="flex justify-center lg:justify-start">
          <div
            ref={canvasRef}
            className={cn(
              "relative flex w-full max-w-md flex-col overflow-hidden shadow-lg",
              size.aspect,
            )}
            style={canvasStyle}
          >
            {state.bgMode === "accentBar" ? (
              <div
                className="h-3 w-full shrink-0 sm:h-4"
                style={{ backgroundColor: state.secondaryColor }}
              />
            ) : null}

            <div className="flex flex-1 flex-col items-center justify-between p-4 text-center sm:p-6">
              <div className="w-full">
                {state.includeBranding ? (
                  <div className="mb-3 flex justify-center">
                    <BrandLogo size="sm" onDark />
                  </div>
                ) : null}
                <h2 className={cn("font-black uppercase leading-tight tracking-tight", titleSize)}>
                  {state.title}
                </h2>
                {state.description.trim() ? (
                  <p className="mt-2 text-sm leading-snug opacity-90 sm:text-base">
                    {state.description}
                  </p>
                ) : null}
              </div>

              <div className="my-3 flex flex-col items-center">
                <div className="rounded-md bg-white p-2 shadow-sm sm:p-3">
                  {qrSrc ? (
                    // eslint-disable-next-line @next/next/no-img-element -- data URL from client QR
                    <img
                      src={qrSrc}
                      alt=""
                      width={size.qrPixels}
                      height={size.qrPixels}
                      className="h-auto w-[42%] min-w-[7rem] max-w-[11rem] sm:w-[48%]"
                    />
                  ) : (
                    <div className="flex h-28 w-28 items-center justify-center bg-gray-100 text-xs text-gray-500">
                      {t("qrPlaceholder")}
                    </div>
                  )}
                </div>
                {state.tagline.trim() ? (
                  <p
                    className="mt-3 text-sm font-bold uppercase tracking-wide sm:text-base"
                    style={{ color: state.bgMode === "plain" ? state.secondaryColor : "#FFFFFF" }}
                  >
                    {state.tagline}
                  </p>
                ) : null}
                {state.showUrl && state.destination.trim() ? (
                  <p className="mt-1 max-w-full truncate text-[10px] opacity-80 sm:text-xs">
                    {state.destination}
                  </p>
                ) : null}
              </div>

              {state.includeBranding ? (
                <p className="text-xs font-semibold opacity-90">{localLabel}</p>
              ) : (
                <span className="h-4" />
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
