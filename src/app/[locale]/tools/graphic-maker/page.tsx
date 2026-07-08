"use client";

import { useRef, useState } from "react";
import { useBrandStore } from "@/store/brand-store";
import { useUndoRedo } from "@/hooks/use-undo-redo";
import { exportNodeAsPng } from "@/lib/export/image-export";
import { formatFilename, resolveLocalNumber } from "@/lib/utils";
import { TOOL_PRESETS, type ToolPresetKey } from "@/lib/constants/presets";
import { Button } from "@/components/ui/Button";
import { Input, Textarea } from "@/components/ui/Input";
import { Card } from "@/components/ui/Card";
import { ImageUpload } from "@/components/tools/ImageUpload";
import { ConsentModal } from "@/components/tools/ConsentModal";
import { UndoRedoBar } from "@/components/tools/UndoRedoBar";
import { useTranslations } from "next-intl";
import Image from "next/image";

interface GraphicState {
  headline: string;
  subheadline: string;
  photoUrl?: string;
  photoScale: number;
}

export default function GraphicMakerPage() {
  const t = useTranslations("common");
  const brandKit = useBrandStore((s) => s.brandKit);
  const canvasRef = useRef<HTMLDivElement>(null);
  const [consentOpen, setConsentOpen] = useState(false);
  const [pendingPhoto, setPendingPhoto] = useState<string | null>(null);

  const initial: GraphicState = {
    headline: "Member Spotlight",
    subheadline: "Celebrating our union family",
    photoScale: 1,
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

  return (
    <div className="mx-auto max-w-5xl px-4 py-12">
      <h1 className="text-3xl font-bold text-opseu-dark">News & Event Graphic Maker</h1>

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
            label="Headline"
            value={state.headline}
            onChange={(e) => setState({ ...state, headline: e.target.value })}
          />
          <Textarea
            label="Subheadline"
            value={state.subheadline}
            onChange={(e) => setState({ ...state, subheadline: e.target.value })}
            rows={2}
          />
          <ImageUpload
            label="Photo"
            preview={state.photoUrl}
            onUpload={handlePhotoUpload}
            onClear={() => setState({ ...state, photoUrl: undefined })}
          />
          <Input
            label="Photo zoom"
            type="range"
            min="0.5"
            max="2"
            step="0.1"
            value={state.photoScale}
            onChange={(e) =>
              setState({ ...state, photoScale: parseFloat(e.target.value) })
            }
          />
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
          style={{ backgroundColor: brandKit.primaryColor }}
        >
          {state.photoUrl && (
            <img
              src={state.photoUrl}
              alt=""
              className="absolute inset-0 h-full w-full object-cover opacity-40"
              style={{ transform: `scale(${state.photoScale})` }}
            />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent" />
          <div className="absolute bottom-0 left-0 right-0 p-8">
            <Image
              src="/assets/caat-opseu/logo-primary.svg"
              alt=""
              width={60}
              height={60}
              className="mb-4"
            />
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
