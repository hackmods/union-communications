"use client";

import { useRef, useState } from "react";
import { useBrandStore } from "@/store/brand-store";
import { useUndoRedo } from "@/hooks/use-undo-redo";
import { exportNodeAsPng, exportNodeAsSvg } from "@/lib/export/image-export";
import { formatFilename, resolveLocalNumber, cn } from "@/lib/utils";
import { deriveAccentFromPrimary, getUnionPreset, resolvePresetLogos } from "@/lib/constants/unionPresets";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Card } from "@/components/ui/Card";
import { ThemePicker } from "@/components/tools/ThemePicker";
import { UndoRedoBar } from "@/components/tools/UndoRedoBar";
import { BrandLogo } from "@/components/brand/BrandLogo";
import {
  LogoSettings,
  brandKitPatchForLogoMode,
} from "@/components/brand/LogoSettings";
import { useTranslations } from "next-intl";

export type LogoShape = "circle" | "square" | "rectangle";

interface LogoState {
  localNumber: string;
  subText: string;
  primaryColor: string;
  secondaryColor: string;
  shape: LogoShape;
}

const SHAPES: LogoShape[] = ["circle", "square", "rectangle"];

export default function LogoBuilderPage() {
  const t = useTranslations("common");
  const tLogo = useTranslations("brandKit.logo");
  const tBuilder = useTranslations("logoBuilder");
  const brandKit = useBrandStore((s) => s.brandKit);
  const setBrandKit = useBrandStore((s) => s.setBrandKit);
  const canvasRef = useRef<HTMLDivElement>(null);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [exportError, setExportError] = useState<string | null>(null);
  const presetLogos = brandKit.unionPresetId
    ? resolvePresetLogos(getUnionPreset(brandKit.unionPresetId)?.logos)
    : null;

  const initial: LogoState = {
    localNumber: brandKit.local.localNumber,
    subText: brandKit.local.subText || "Support Staff",
    primaryColor: brandKit.primaryColor,
    secondaryColor: brandKit.secondaryColor,
    shape: "circle",
  };

  const { state, setState, undo, redo, canUndo, canRedo, reset } =
    useUndoRedo<LogoState>(initial);

  const handleSaveToBrandKit = () => {
    setBrandKit({
      local: {
        ...brandKit.local,
        localNumber: state.localNumber,
        subText: state.subText,
      },
      primaryColor: state.primaryColor,
      secondaryColor: state.secondaryColor,
      accentColor: deriveAccentFromPrimary(state.primaryColor),
    });
    setSaveMessage(tBuilder("saveSuccess"));
  };

  const handleExportPng = async () => {
    if (!canvasRef.current) return;
    setExportError(null);
    try {
      await exportNodeAsPng(
        canvasRef.current,
        formatFilename(`local-logo-${state.shape}`, state.localNumber, "png"),
        {
          pixelRatio: 3,
          // Transparent so circle corners stay clear (white fill made PNGs look wrong vs SVG)
          backgroundColor: null,
        },
      );
    } catch {
      setExportError(tBuilder("exportError"));
    }
  };

  const handleExportSvg = async () => {
    if (!canvasRef.current) return;
    setExportError(null);
    try {
      await exportNodeAsSvg(
        canvasRef.current,
        formatFilename(`local-logo-${state.shape}`, state.localNumber, "svg"),
      );
    } catch {
      setExportError(tBuilder("exportError"));
    }
  };

  const isRectangle = state.shape === "rectangle";
  const localLabel = `Local ${resolveLocalNumber(state.localNumber)}`;

  return (
    <div className="mx-auto max-w-5xl px-4 py-12">
      <h1 className="text-3xl font-bold text-opseu-dark">{tBuilder("title")}</h1>
      <p className="mt-2 text-gray-600">{tBuilder("description")}</p>

      <div className="mt-8 grid gap-8 lg:grid-cols-2">
        <Card className="space-y-4">
          <Input
            label={tBuilder("localNumber")}
            value={state.localNumber}
            onChange={(e) => setState({ ...state, localNumber: e.target.value })}
          />
          <Input
            label={tBuilder("subText")}
            value={state.subText}
            onChange={(e) => setState({ ...state, subText: e.target.value })}
          />
          <ThemePicker
            primaryColor={state.primaryColor}
            secondaryColor={state.secondaryColor}
            onPrimaryChange={(c) => setState({ ...state, primaryColor: c })}
            onSecondaryChange={(c) => setState({ ...state, secondaryColor: c })}
          />

          <div className="space-y-2">
            <p className="text-sm font-medium text-opseu-dark">{tBuilder("shape")}</p>
            <div
              className="flex flex-wrap gap-2"
              role="radiogroup"
              aria-label={tBuilder("shape")}
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
                    {tBuilder(
                      shape === "circle"
                        ? "shapeCircle"
                        : shape === "square"
                          ? "shapeSquare"
                          : "shapeRectangle",
                    )}
                  </Button>
                );
              })}
            </div>
            <p className="text-sm text-gray-600">
              {tBuilder(
                state.shape === "circle"
                  ? "shapeCircleHint"
                  : state.shape === "square"
                    ? "shapeSquareHint"
                    : "shapeRectangleHint",
              )}
            </p>
          </div>

          <div className="space-y-2 border-t border-gray-100 pt-4">
            <h2 className="font-semibold text-opseu-dark">{tLogo("title")}</h2>
            <p className="text-sm text-gray-600">{tLogo("description")}</p>
            <LogoSettings
              useOfficialLogo={brandKit.useOfficialLogo}
              officialLogoVariant={brandKit.officialLogoVariant}
              customLogoDataUrl={brandKit.customLogoDataUrl}
              logoText={brandKit.logoText}
              unionPresetId={brandKit.unionPresetId}
              primaryColor={state.primaryColor}
              secondaryColor={state.secondaryColor}
              onModeChange={(mode) => {
                setBrandKit(
                  brandKitPatchForLogoMode(
                    mode,
                    brandKit.logoText,
                    brandKit.customLogoDataUrl,
                    presetLogos,
                  ),
                );
              }}
              onCustomLogoUpload={(url) =>
                setBrandKit({ useOfficialLogo: false, customLogoDataUrl: url })
              }
              onCustomLogoClear={() =>
                setBrandKit({ customLogoDataUrl: "" })
              }
              onLogoTextChange={(text) => setBrandKit({ logoText: text })}
            />
          </div>
          <UndoRedoBar
            canUndo={canUndo}
            canRedo={canRedo}
            onUndo={undo}
            onRedo={redo}
            onReset={() => reset(initial)}
          />
          {saveMessage ? (
            <p className="text-sm text-green-700" role="status">
              {saveMessage}
            </p>
          ) : null}
          {exportError ? (
            <p className="text-sm text-red-700" role="alert">
              {exportError}
            </p>
          ) : null}
          <div className="flex flex-wrap gap-3">
            <Button onClick={handleSaveToBrandKit}>{tBuilder("save")}</Button>
            <Button variant="outline" onClick={handleExportPng}>
              {t("downloadPng")}
            </Button>
            <Button variant="outline" onClick={handleExportSvg}>
              {t("downloadSvg")}
            </Button>
          </div>
        </Card>

        <div className="flex items-center justify-center">
          {/* Shadow lives on the wrapper so it is not baked into exports */}
          <div
            className={cn(
              "shadow-lg",
              state.shape === "circle" && "rounded-full",
            )}
          >
            <div
              ref={canvasRef}
              className={cn(
                "flex items-center justify-center overflow-hidden",
                state.shape === "circle" &&
                  "h-80 w-80 flex-col rounded-full",
                state.shape === "square" && "h-80 w-80 flex-col",
                state.shape === "rectangle" &&
                  "h-44 w-[28rem] max-w-full flex-row gap-5 px-8",
              )}
              style={{ backgroundColor: state.primaryColor }}
            >
              <BrandLogo
                size={isRectangle ? "md" : "lg"}
                className={isRectangle ? "shrink-0" : "mb-2"}
                onDark
              />
              <div
                className={cn(
                  "text-center",
                  isRectangle && "min-w-0 flex-1 text-left",
                )}
              >
                <p
                  className={cn(
                    "font-bold",
                    isRectangle ? "text-2xl leading-tight" : "text-4xl",
                  )}
                  style={{ color: state.secondaryColor }}
                >
                  {localLabel}
                </p>
                <p
                  className={cn(
                    isRectangle ? "mt-0.5 text-base" : "mt-1 text-lg",
                  )}
                  style={{ color: "#FFFFFF" }}
                >
                  {state.subText}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
