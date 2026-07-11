"use client";

import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useBrandStore } from "@/store/brand-store";
import { useUndoRedo } from "@/hooks/use-undo-redo";
import { exportNodeAsPng } from "@/lib/export/image-export";
import { formatFilename, resolveLocalNumber } from "@/lib/utils";
import { hexToRgba } from "@/lib/utils/contrast";
import { TOOL_PRESETS, type ToolPresetKey } from "@/lib/constants/presets";
import { BRAND_COLORS } from "@/lib/constants/brand";
import { Button } from "@/components/ui/Button";
import { Input, Textarea } from "@/components/ui/Input";
import { Card } from "@/components/ui/Card";
import { ImageUpload } from "@/components/tools/ImageUpload";
import { ConsentModal } from "@/components/tools/ConsentModal";
import { UndoRedoBar } from "@/components/tools/UndoRedoBar";
import { BrandSwatchPicker } from "@/components/tools/BrandSwatchPicker";
import { ContrastChecker } from "@/components/tools/ContrastChecker";
import { BrandLogo } from "@/components/brand/BrandLogo";
import { useTranslations } from "next-intl";
import Image from "next/image";

function isToolPresetKey(value: string): value is ToolPresetKey {
  return value in TOOL_PRESETS;
}

type FillMode = "solid" | "gradient";

interface GraphicState {
  headline: string;
  subheadline: string;
  photoUrl?: string;
  photoScale: number;
  fillMode: FillMode;
  /** Solid fill, or gradient start */
  backgroundColor: string;
  /** Gradient end, and bottom fade colour in solid mode */
  gradientColor: string;
}

export default function GraphicMakerPage() {
  const t = useTranslations("common");
  const tg = useTranslations("graphicMaker");
  const searchParams = useSearchParams();
  const brandKit = useBrandStore((s) => s.brandKit);
  const canvasRef = useRef<HTMLDivElement>(null);
  const [consentOpen, setConsentOpen] = useState(false);
  const [pendingPhoto, setPendingPhoto] = useState<string | null>(null);
  const presetApplied = useRef(false);

  const brandColors = {
    primary: brandKit.primaryColor,
    accent: brandKit.accentColor,
    secondary: brandKit.secondaryColor,
  };

  const initial: GraphicState = {
    headline: "Member Spotlight",
    subheadline: "Celebrating our union family",
    photoScale: 1,
    fillMode: "solid",
    backgroundColor: brandKit.primaryColor,
    gradientColor: BRAND_COLORS.black,
  };

  const { state, setState, undo, redo, canUndo, canRedo, reset } =
    useUndoRedo<GraphicState>(initial);

  const applyPreset = (key: ToolPresetKey) => {
    const preset = TOOL_PRESETS[key];
    setState({
      ...state,
      headline: preset.headline,
      subheadline: preset.subheadline,
    });
  };

  useEffect(() => {
    if (presetApplied.current) return;
    const raw = searchParams.get("preset");
    if (!raw || !isToolPresetKey(raw)) return;
    presetApplied.current = true;
    const preset = TOOL_PRESETS[raw];
    setState((prev) => ({
      ...prev,
      headline: preset.headline,
      subheadline: preset.subheadline,
    }));
  }, [searchParams, setState]);

  const handlePhotoUpload = (url: string) => {
    setPendingPhoto(url);
    setConsentOpen(true);
  };

  const handleConsent = () => {
    if (pendingPhoto) {
      setState({ ...state, photoUrl: pendingPhoto });
    }
    setPendingPhoto(null);
    setConsentOpen(false);
  };

  const handleExport = async () => {
    if (!canvasRef.current) return;
    await exportNodeAsPng(
      canvasRef.current,
      formatFilename("graphic", brandKit.local.localNumber, "png"),
      { pixelRatio: 2 },
    );
  };

  // Solid mode: gradient swatch drives the bottom fade. Gradient fill keeps a dark fade for text.
  const fadeHex =
    state.fillMode === "solid" ? state.gradientColor : BRAND_COLORS.black;
  const fade = hexToRgba(fadeHex, 0.7) ?? "rgba(0,0,0,0.7)";
  const canvasStyle =
    state.fillMode === "solid"
      ? { backgroundColor: state.backgroundColor }
      : {
          backgroundImage: `linear-gradient(135deg, ${state.backgroundColor}, ${state.gradientColor})`,
        };

  return (
    <div className="mx-auto max-w-5xl px-4 py-12">
      <h1 className="text-3xl font-bold text-opseu-dark">{tg("title")}</h1>

      <div className="mt-4 flex flex-wrap gap-2">
        {(Object.keys(TOOL_PRESETS) as ToolPresetKey[]).map((key) => (
          <Button key={key} size="sm" variant="outline" onClick={() => applyPreset(key)}>
            {TOOL_PRESETS[key].headline}
          </Button>
        ))}
      </div>

      <div className="mt-8 grid gap-8 lg:grid-cols-2">
        <Card className="space-y-4">
          <Input
            label={tg("headline")}
            value={state.headline}
            onChange={(e) => setState({ ...state, headline: e.target.value })}
          />
          <Textarea
            label={tg("subheadline")}
            value={state.subheadline}
            onChange={(e) => setState({ ...state, subheadline: e.target.value })}
            rows={2}
          />
          <ImageUpload
            label={tg("photo")}
            preview={state.photoUrl}
            onUpload={handlePhotoUpload}
            onClear={() => setState({ ...state, photoUrl: undefined })}
          />
          <Input
            label={tg("photoZoom")}
            type="range"
            min="0.5"
            max="2"
            step="0.1"
            value={state.photoScale}
            onChange={(e) =>
              setState({ ...state, photoScale: parseFloat(e.target.value) })
            }
          />

          <fieldset className="space-y-2">
            <legend className="text-sm font-medium text-gray-700">{tg("fillMode")}</legend>
            <div className="flex flex-wrap gap-2">
              {(["solid", "gradient"] as const).map((mode) => (
                <Button
                  key={mode}
                  size="sm"
                  variant={state.fillMode === mode ? "primary" : "outline"}
                  onClick={() => setState({ ...state, fillMode: mode })}
                >
                  {tg(mode === "solid" ? "fillSolid" : "fillGradient")}
                </Button>
              ))}
            </div>
          </fieldset>

          <BrandSwatchPicker
            label={
              state.fillMode === "solid"
                ? tg("backgroundColor")
                : tg("gradientFrom")
            }
            value={state.backgroundColor}
            onChange={(c) => setState({ ...state, backgroundColor: c })}
            colors={brandColors}
          />
          <BrandSwatchPicker
            label={
              state.fillMode === "solid"
                ? tg("gradientColor")
                : tg("gradientTo")
            }
            value={state.gradientColor}
            onChange={(c) => setState({ ...state, gradientColor: c })}
            colors={brandColors}
          />
          <ContrastChecker foreground="#FFFFFF" background={state.backgroundColor} />

          <UndoRedoBar
            canUndo={canUndo}
            canRedo={canRedo}
            onUndo={undo}
            onRedo={redo}
            onReset={() => reset(initial)}
          />
          <Button onClick={handleExport}>{t("downloadPng")}</Button>
        </Card>

        <div
          ref={canvasRef}
          className="relative aspect-[1200/630] w-full overflow-hidden rounded-lg shadow-lg"
          style={canvasStyle}
        >
          {state.photoUrl && (
            <Image
              src={state.photoUrl}
              alt=""
              fill
              unoptimized
              className="object-cover opacity-40"
              style={{ transform: `scale(${state.photoScale})` }}
            />
          )}
          <div
            className="absolute inset-0"
            style={{
              backgroundImage: `linear-gradient(to top, ${fade}, transparent)`,
            }}
          />
          <div className="absolute bottom-0 left-0 right-0 p-8">
            <BrandLogo size="md" onDark className="mb-4" />
            <h2 className="text-3xl font-bold text-white">{state.headline}</h2>
            <p className="mt-2 text-lg text-white/90">{state.subheadline}</p>
            <p className="mt-4 text-sm text-white/70">
              Local {resolveLocalNumber(brandKit.local.localNumber)} — {brandKit.local.subText}
            </p>
          </div>
        </div>
      </div>

      <ConsentModal
        open={consentOpen}
        onConfirm={handleConsent}
        onCancel={() => {
          setPendingPhoto(null);
          setConsentOpen(false);
        }}
      />
    </div>
  );
}
