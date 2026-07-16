"use client";

import Image from "next/image";
import { useEffect, useRef, useState, type Ref } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { useBrandStore } from "@/store/brand-store";
import { useUndoRedo } from "@/hooks/use-undo-redo";
import {
  exportNodeAsBlob,
  exportNodeAsPng,
  downloadZip,
} from "@/lib/export/image-export";
import { formatFilename, cn } from "@/lib/utils";
import { isBrandThemeEstablished } from "@/lib/utils/brand-theme";
import { pickContrastingInk } from "@/lib/utils/ink";
import {
  DEFAULT_CUSTOM_HEIGHT,
  DEFAULT_CUSTOM_WIDTH,
  DEFAULT_RESIZER_FORMAT,
  platformResizerFormats,
  resolveResizerFormat,
  exportPixelRatio,
  clampCustomSize,
  type ResizerFormat,
  type ResizerFormatId,
} from "@/lib/constants/resizer-formats";
import {
  logoContainPlacementBox,
  placementToFlexClass,
  placementToObjectPosition,
  RESIZER_PLACEMENTS,
  type ResizerPlacement,
} from "@/lib/utils/resizer-layout";
import {
  LocalLogoPlate,
  type LogoShape,
} from "@/components/brand/LocalLogoPlate";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Card } from "@/components/ui/Card";
import { ThemePicker } from "@/components/tools/ThemePicker";
import { UndoRedoBar } from "@/components/tools/UndoRedoBar";
import { ImageUpload } from "@/components/tools/ImageUpload";
import { ToolEditorLayout } from "@/components/tools/ToolEditorLayout";

type SourceMode = "logo" | "upload";
type FitMode = "contain" | "cover";

interface ResizerState {
  sourceMode: SourceMode;
  shape: LogoShape;
  fit: FitMode;
  placement: ResizerPlacement;
  overlayText: string;
  showSafeZones: boolean;
  primaryColor: string;
  secondaryColor: string;
  formatId: ResizerFormatId;
  customWidth: number;
  customHeight: number;
}

const SHAPES: LogoShape[] = ["circle", "square", "rectangle"];
const PRESET_IDS: ResizerFormatId[] = [
  "facebookCover",
  "facebookPost",
  "instagramSquare",
  "instagramStory",
  "youtubeBanner",
  "custom",
];

const PLACEMENT_LABEL_KEY: Record<
  ResizerPlacement,
  | "placementTopLeft"
  | "placementTopCenter"
  | "placementTopRight"
  | "placementMiddleLeft"
  | "placementCenter"
  | "placementMiddleRight"
  | "placementBottomLeft"
  | "placementBottomCenter"
  | "placementBottomRight"
> = {
  "top-left": "placementTopLeft",
  "top-center": "placementTopCenter",
  "top-right": "placementTopRight",
  "middle-left": "placementMiddleLeft",
  center: "placementCenter",
  "middle-right": "placementMiddleRight",
  "bottom-left": "placementBottomLeft",
  "bottom-center": "placementBottomCenter",
  "bottom-right": "placementBottomRight",
};

function FormatCanvasContent({
  state,
  format,
  imageUrl,
  localNumber,
  subText,
  uploadPrompt,
}: {
  state: ResizerState;
  format: ResizerFormat;
  imageUrl?: string;
  localNumber: string;
  subText: string;
  uploadPrompt?: string;
}) {
  const overlayBg = "rgba(0,0,0,0.6)";
  const objectPosition = placementToObjectPosition(state.placement);
  const coverFlex = placementToFlexClass(state.placement);
  const containBox =
    state.sourceMode === "logo" && state.fit === "contain"
      ? logoContainPlacementBox(
          format.width,
          format.height,
          state.shape,
          state.placement,
        )
      : null;

  return (
    <>
      {state.sourceMode === "logo" ? (
        state.fit === "contain" && containBox ? (
          <div
            className="absolute inset-0 overflow-hidden"
            style={{ backgroundColor: state.primaryColor }}
          >
            <div
              className="absolute overflow-hidden"
              style={{
                left: `${containBox.leftPct}%`,
                top: `${containBox.topPct}%`,
                width: `${containBox.widthPct}%`,
                height: `${containBox.heightPct}%`,
              }}
            >
              <LocalLogoPlate
                size="fluid"
                shape={state.shape}
                primaryColor={state.primaryColor}
                secondaryColor={state.secondaryColor}
                localNumber={localNumber}
                subText={subText}
                className="!h-full !w-full !max-h-none !max-w-none"
              />
            </div>
          </div>
        ) : (
          <div
            className={cn(
              "absolute inset-0 flex overflow-hidden",
              coverFlex,
            )}
            style={{ backgroundColor: state.primaryColor }}
          >
            <div className="min-h-full min-w-full">
              <LocalLogoPlate
                size="fluid"
                shape={state.shape}
                primaryColor={state.primaryColor}
                secondaryColor={state.secondaryColor}
                localNumber={localNumber}
                subText={subText}
                className={cn(
                  state.shape === "rectangle"
                    ? "!max-h-none !max-w-none h-full min-h-full w-auto min-w-full"
                    : "!max-h-none !max-w-none min-h-full min-w-full",
                )}
              />
            </div>
          </div>
        )
      ) : imageUrl ? (
        <div
          className="absolute inset-0 overflow-hidden"
          style={{ backgroundColor: state.primaryColor }}
        >
          <Image
            src={imageUrl}
            alt=""
            fill
            unoptimized
            className={
              state.fit === "cover" ? "object-cover" : "object-contain"
            }
            style={{ objectPosition }}
          />
        </div>
      ) : (
        <div
          className="absolute inset-0 flex items-center justify-center"
          style={{ backgroundColor: state.primaryColor }}
        >
          {uploadPrompt ? (
            <p
              className="px-4 text-center text-sm"
              style={{ color: pickContrastingInk(state.primaryColor) }}
            >
              {uploadPrompt}
            </p>
          ) : null}
        </div>
      )}

      {state.overlayText ? (
        <div
          className="absolute bottom-0 left-0 right-0 p-2 text-center text-xs font-medium md:text-sm"
          style={{ backgroundColor: overlayBg, color: "#ffffff" }}
        >
          {state.overlayText}
        </div>
      ) : null}
    </>
  );
}

/** Preview-only — must stay outside capture nodes (canvasRef / ZIP frames). */
function SafeZoneOverlay() {
  return (
    <div
      className="pointer-events-none absolute inset-[10%] border-2 border-dashed"
      style={{ borderColor: "rgba(250, 204, 21, 0.8)" }}
      aria-hidden="true"
    />
  );
}

function FormatFrame({
  format,
  state,
  imageUrl,
  localNumber,
  subText,
  uploadPrompt,
  dataFormat,
  frameRef,
  className,
}: {
  format: ResizerFormat;
  state: ResizerState;
  imageUrl?: string;
  localNumber: string;
  subText: string;
  uploadPrompt?: string;
  dataFormat?: string;
  frameRef?: Ref<HTMLDivElement>;
  className?: string;
}) {
  return (
    <div
      ref={frameRef}
      data-format={dataFormat}
      className={cn("relative w-full overflow-hidden", className)}
      style={{
        aspectRatio: `${format.width}/${format.height}`,
        backgroundColor: state.primaryColor,
      }}
    >
      <FormatCanvasContent
        state={state}
        format={format}
        imageUrl={imageUrl}
        localNumber={localNumber}
        subText={subText}
        uploadPrompt={uploadPrompt}
      />
    </div>
  );
}

export default function ResizerPage() {
  const t = useTranslations("resizer");
  const tc = useTranslations("common");
  const brandKit = useBrandStore((s) => s.brandKit);
  const onboardingComplete = useBrandStore((s) => s.onboardingComplete);
  const hydrated = useBrandStore((s) => s.hydrated);

  const canvasRef = useRef<HTMLDivElement>(null);
  const zipRootRef = useRef<HTMLDivElement>(null);
  const themeSeeded = useRef(false);

  const [imageUrl, setImageUrl] = useState<string | undefined>();
  const [exporting, setExporting] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);

  const themeEstablished = isBrandThemeEstablished(brandKit, onboardingComplete);

  const initial: ResizerState = {
    sourceMode: "logo",
    shape: "square",
    fit: "contain",
    placement: "center",
    overlayText: "",
    showSafeZones: true,
    primaryColor: brandKit.primaryColor,
    secondaryColor: brandKit.secondaryColor,
    formatId: DEFAULT_RESIZER_FORMAT,
    customWidth: DEFAULT_CUSTOM_WIDTH,
    customHeight: DEFAULT_CUSTOM_HEIGHT,
  };

  const { state, setState, undo, redo, canUndo, canRedo, reset } =
    useUndoRedo<ResizerState>(initial);

  useEffect(() => {
    if (!hydrated || themeSeeded.current) return;
    themeSeeded.current = true;
    reset({
      ...initial,
      primaryColor: brandKit.primaryColor,
      secondaryColor: brandKit.secondaryColor,
      fit: "contain",
      placement: "center",
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- one-shot after hydrate
  }, [hydrated]);

  const format = resolveResizerFormat(
    state.formatId,
    state.customWidth,
    state.customHeight,
  );

  const localNumber = brandKit.local.localNumber;
  const subText = brandKit.local.subText || t("defaultSubText");
  const canExport =
    state.sourceMode === "logo" || Boolean(imageUrl?.trim());

  const shapeLabel = (shape: LogoShape) =>
    t(
      shape === "circle"
        ? "shapeCircle"
        : shape === "square"
          ? "shapeSquare"
          : "shapeRectangle",
    );

  const handleExportPng = async () => {
    if (!canvasRef.current || !canExport) return;
    setExportError(null);
    setExporting(true);
    try {
      await exportNodeAsPng(
        canvasRef.current,
        formatFilename(
          `${format.filenameStem}-${format.width}x${format.height}`,
          brandKit.local.localNumber,
          "png",
        ),
        {
          pixelRatio: exportPixelRatio(canvasRef.current, format),
          backgroundColor: state.primaryColor,
        },
      );
    } catch {
      setExportError(t("exportError"));
    } finally {
      setExporting(false);
    }
  };

  const handleExportZip = async () => {
    if (!canExport) return;
    setExportError(null);
    setExporting(true);
    try {
      const files: { name: string; blob: Blob }[] = [];
      const presets = platformResizerFormats();
      const zipRoot = zipRootRef.current;

      for (const preset of presets) {
        const node = zipRoot?.querySelector(
          `[data-format="${preset.id}"]`,
        ) as HTMLDivElement | null;
        if (!node) continue;
        const blob = await exportNodeAsBlob(node, {
          pixelRatio: exportPixelRatio(node, preset),
          backgroundColor: state.primaryColor,
        });
        files.push({
          name: `${preset.filenameStem}-${preset.width}x${preset.height}.png`,
          blob,
        });
      }

      if (state.formatId === "custom" && canvasRef.current) {
        const custom = resolveResizerFormat(
          "custom",
          state.customWidth,
          state.customHeight,
        );
        const blob = await exportNodeAsBlob(canvasRef.current, {
          pixelRatio: exportPixelRatio(canvasRef.current, custom),
          backgroundColor: state.primaryColor,
        });
        files.push({
          name: `custom-${custom.width}x${custom.height}.png`,
          blob,
        });
      }

      await downloadZip(
        files,
        formatFilename("social-assets", brandKit.local.localNumber, "zip"),
      );
    } catch {
      setExportError(t("exportError"));
    } finally {
      setExporting(false);
    }
  };

  const setFormatId = (id: ResizerFormatId) => {
    setState({ ...state, formatId: id });
  };

  const uploadPrompt =
    state.sourceMode === "upload" && !imageUrl ? t("uploadPrompt") : undefined;

  const sharedFrameProps = {
    state,
    imageUrl,
    localNumber,
    subText,
    uploadPrompt,
  };

  return (
    <>
      <ToolEditorLayout
        title={t("title")}
        description={t("subtitle")}
        toolbar={
          !themeEstablished ? (
            <p className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950">
              {t("setupBrandPrompt")}{" "}
              <Link href="/onboarding" className="font-medium underline">
                {t("setupBrandLink")}
              </Link>
            </p>
          ) : null
        }
        form={
          <Card density="compact" className="space-y-3">
            <div className="space-y-2">
              <p className="text-sm font-medium text-opseu-dark">{t("source")}</p>
              <div
                className="flex flex-wrap gap-2"
                role="radiogroup"
                aria-label={t("source")}
              >
                {(["logo", "upload"] as const).map((mode) => {
                  const selected = state.sourceMode === mode;
                  return (
                    <Button
                      key={mode}
                      type="button"
                      size="sm"
                      role="radio"
                      aria-checked={selected}
                      variant={selected ? "primary" : "outline"}
                      onClick={() =>
                        setState({
                          ...state,
                          sourceMode: mode,
                          fit: mode === "logo" ? "contain" : "cover",
                        })
                      }
                    >
                      {mode === "logo" ? t("sourceLogo") : t("sourceUpload")}
                    </Button>
                  );
                })}
              </div>
            </div>

            {state.sourceMode === "logo" ? (
              <div className="space-y-2">
                <p className="text-sm font-medium text-opseu-dark">{t("shape")}</p>
                <div
                  className="flex flex-wrap gap-2"
                  role="radiogroup"
                  aria-label={t("shape")}
                >
                  {SHAPES.map((shape) => {
                    const selected = state.shape === shape;
                    return (
                      <Button
                        key={shape}
                        type="button"
                        size="sm"
                        role="radio"
                        aria-checked={selected}
                        variant={selected ? "primary" : "outline"}
                        onClick={() => setState({ ...state, shape })}
                      >
                        {shapeLabel(shape)}
                      </Button>
                    );
                  })}
                </div>
                <p className="text-sm text-gray-600">
                  {t(
                    state.shape === "circle"
                      ? "shapeCircleHint"
                      : state.shape === "square"
                        ? "shapeSquareHint"
                        : "shapeRectangleHint",
                  )}
                </p>
              </div>
            ) : (
              <ImageUpload
                label={t("uploadLabel")}
                hint={t("uploadHint")}
                preview={imageUrl}
                onUpload={setImageUrl}
                onClear={() => setImageUrl(undefined)}
              />
            )}

            <div className="space-y-2">
              <p className="text-sm font-medium text-opseu-dark">{t("fit")}</p>
              <div
                className="flex flex-wrap gap-2"
                role="radiogroup"
                aria-label={t("fit")}
              >
                {(["contain", "cover"] as const).map((fit) => {
                  const selected = state.fit === fit;
                  return (
                    <Button
                      key={fit}
                      type="button"
                      size="sm"
                      role="radio"
                      aria-checked={selected}
                      variant={selected ? "primary" : "outline"}
                      onClick={() => setState({ ...state, fit })}
                    >
                      {fit === "contain" ? t("fitContain") : t("fitCover")}
                    </Button>
                  );
                })}
              </div>
              <p className="text-sm text-gray-600">
                {state.fit === "contain" ? t("fitContainHint") : t("fitCoverHint")}
              </p>
            </div>

            <div className="space-y-2">
              <p className="text-sm font-medium text-opseu-dark">
                {t("placement")}
              </p>
              <div
                className="grid w-fit grid-cols-3 gap-1.5"
                role="radiogroup"
                aria-label={t("placement")}
              >
                {RESIZER_PLACEMENTS.map((placement) => {
                  const selected = state.placement === placement;
                  return (
                    <button
                      key={placement}
                      type="button"
                      role="radio"
                      aria-checked={selected}
                      aria-label={t(PLACEMENT_LABEL_KEY[placement])}
                      title={t(PLACEMENT_LABEL_KEY[placement])}
                      onClick={() => setState({ ...state, placement })}
                      className={cn(
                        "flex h-9 w-9 items-center justify-center rounded border transition-colors",
                        selected
                          ? "border-opseu-blue bg-opseu-blue text-white"
                          : "border-gray-300 bg-white text-gray-500 hover:border-opseu-blue/60",
                      )}
                    >
                      <span
                        className={cn(
                          "h-2 w-2 rounded-sm",
                          selected ? "bg-white" : "bg-current",
                        )}
                        aria-hidden="true"
                      />
                    </button>
                  );
                })}
              </div>
              <p className="text-sm text-gray-600">{t("placementHint")}</p>
            </div>

            <Input
              label={t("overlayText")}
              value={state.overlayText}
              onChange={(e) =>
                setState({ ...state, overlayText: e.target.value })
              }
            />

            <label className="flex items-center gap-2 text-sm text-gray-700">
              <input
                type="checkbox"
                checked={state.showSafeZones}
                onChange={(e) =>
                  setState({ ...state, showSafeZones: e.target.checked })
                }
              />
              {t("showSafeZones")}
            </label>

            <div className="space-y-2">
              <p className="text-sm font-medium text-opseu-dark">{t("outputSize")}</p>
              <div
                className="flex flex-wrap gap-2"
                role="radiogroup"
                aria-label={t("outputSize")}
              >
                {PRESET_IDS.map((id) => {
                  const selected = state.formatId === id;
                  const label =
                    id === "custom"
                      ? t("formatCustom")
                      : t(
                          resolveResizerFormat(id, 0, 0)
                            .labelKey as
                            | "formatFacebookCover"
                            | "formatFacebookPost"
                            | "formatInstagramSquare"
                            | "formatInstagramStory"
                            | "formatYoutubeBanner",
                        );
                  return (
                    <Button
                      key={id}
                      type="button"
                      size="sm"
                      role="radio"
                      aria-checked={selected}
                      variant={selected ? "primary" : "outline"}
                      onClick={() => setFormatId(id)}
                    >
                      {label}
                    </Button>
                  );
                })}
              </div>
            </div>

            {state.formatId === "custom" ? (
              <div className="grid grid-cols-2 gap-3">
                <Input
                  label={t("customWidth")}
                  type="number"
                  min={64}
                  max={4096}
                  value={String(state.customWidth)}
                  onChange={(e) =>
                    setState({
                      ...state,
                      customWidth: clampCustomSize(Number(e.target.value)),
                    })
                  }
                />
                <Input
                  label={t("customHeight")}
                  type="number"
                  min={64}
                  max={4096}
                  value={String(state.customHeight)}
                  onChange={(e) =>
                    setState({
                      ...state,
                      customHeight: clampCustomSize(Number(e.target.value)),
                    })
                  }
                />
              </div>
            ) : null}

            <p className="text-sm text-gray-600">
              {t("previewSize", {
                label: t(format.labelKey),
                width: format.width,
                height: format.height,
              })}
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
              onReset={() =>
                reset({
                  ...initial,
                  primaryColor: brandKit.primaryColor,
                  secondaryColor: brandKit.secondaryColor,
                })
              }
            />

            {exportError ? (
              <p className="text-sm text-red-700" role="alert">
                {exportError}
              </p>
            ) : null}

            <div className="flex flex-wrap gap-3">
              <Button
                onClick={handleExportPng}
                disabled={!canExport || exporting}
              >
                {exporting ? tc("loading") : tc("downloadPng")}
              </Button>
              <Button
                variant="outline"
                onClick={handleExportZip}
                disabled={!canExport || exporting}
              >
                {exporting ? tc("loading") : tc("downloadZip")}
              </Button>
            </div>
          </Card>
        }
        preview={
          <div className="space-y-3">
            <p className="text-sm font-medium text-opseu-dark">
              {t("preview")} ({format.width}×{format.height})
            </p>
            {/* Shadow + safe-zone overlay outside capture node */}
            <div className="relative shadow-lg">
              <FormatFrame
                format={format}
                frameRef={canvasRef}
                {...sharedFrameProps}
              />
              {state.showSafeZones ? <SafeZoneOverlay /> : null}
            </div>
          </div>
        }
        belowGrid={
          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-opseu-dark">
              {t("allFormats")}
            </h2>
            <div className="grid gap-6 sm:grid-cols-2">
              {platformResizerFormats().map((preset) => (
                <button
                  key={preset.id}
                  type="button"
                  className={cn(
                    "text-left",
                    state.formatId === preset.id &&
                      "ring-2 ring-opseu-blue ring-offset-2",
                  )}
                  onClick={() => setFormatId(preset.id)}
                >
                  <p className="mb-2 text-sm font-medium">
                    {t(preset.labelKey)} ({preset.width}×{preset.height})
                  </p>
                  <div className="relative overflow-hidden rounded-lg border bg-gray-100 shadow-sm">
                    <FormatFrame format={preset} {...sharedFrameProps} />
                    {state.showSafeZones ? <SafeZoneOverlay /> : null}
                  </div>
                </button>
              ))}
            </div>
          </div>
        }
      />

      {/* Offscreen platform frames for true-pixel ZIP export */}
      <div
        ref={zipRootRef}
        className="pointer-events-none absolute -left-[9999px] top-0 w-[540px] space-y-4 opacity-0"
        aria-hidden="true"
      >
        {platformResizerFormats().map((preset) => (
          <FormatFrame
            key={preset.id}
            format={preset}
            dataFormat={preset.id}
            {...sharedFrameProps}
          />
        ))}
      </div>
    </>
  );
}
