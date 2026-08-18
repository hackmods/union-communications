"use client";

import { useRef, useState } from "react";
import { useBrandStore } from "@/store/brand-store";
import { useUndoRedo } from "@/hooks/use-undo-redo";
import { useOneShotBrandSeed } from "@/hooks/use-one-shot-brand-seed";
import { exportNodeAsPng, exportNodeAsSvg } from "@/lib/export/image-export";
import { formatFilename, cn } from "@/lib/utils";
import { brandPaletteHasContrastRisk } from "@/lib/utils/ink";
import { deriveAccentFromPrimary, getUnionPreset, resolvePresetLogos } from "@/lib/constants/unionPresets";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Card } from "@/components/ui/Card";
import { ThemePicker } from "@/components/tools/ThemePicker";
import { UndoRedoBar } from "@/components/tools/UndoRedoBar";
import {
  LocalLogoPlate,
  LOGO_SHAPES,
  type LogoShape,
} from "@/components/brand/LocalLogoPlate";
import { BrandContrastConfirmDialog } from "@/components/brand/BrandContrastConfirmDialog";
import {
  LogoSettings,
  brandKitPatchForLogoMode,
} from "@/components/brand/LogoSettings";
import { useTranslations } from "next-intl";
import { ToolEditorLayout } from "@/components/tools/ToolEditorLayout";
import { ToolRelatedFooter } from "@/components/tools/ToolRelatedFooter";
import { WorkshopDemoPath } from "@/components/comms/WorkshopDemoPath";
import { useWorkshopDemoSession } from "@/hooks/use-workshop-demo-session";
import { ToolFormDetails } from "@/components/tools/ToolFormDetails";
import { SegControl } from "@/components/tools/SegControl";
import { useExportHandler } from "@/hooks/use-export-handler";
import { resolveCanvasTokens } from "@/lib/utils/canvas-tokens";

interface LogoState {
  localNumber: string;
  subText: string;
  primaryColor: string;
  secondaryColor: string;
  shape: LogoShape;
}

export default function LogoBuilderPage() {
  const t = useTranslations("common");
  const tLogo = useTranslations("brandKit.logo");
  const tBuilder = useTranslations("logoBuilder");
  const brandKit = useBrandStore((s) => s.brandKit);
  const setBrandKit = useBrandStore((s) => s.setBrandKit);
  const hydrated = useBrandStore((s) => s.hydrated);
  const tokens = resolveCanvasTokens(brandKit);
  const inDemo = useWorkshopDemoSession(null);
  const canvasRef = useRef<HTMLDivElement>(null);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const { exportError, exportSuccess, runExport } = useExportHandler(tBuilder("exportError"));
  const [contrastConfirmOpen, setContrastConfirmOpen] = useState(false);
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

  useOneShotBrandSeed(hydrated, () => {
    reset({
      localNumber: brandKit.local.localNumber,
      subText: brandKit.local.subText || "Support Staff",
      primaryColor: brandKit.primaryColor,
      secondaryColor: brandKit.secondaryColor,
      shape: "circle",
    });
  });

  const persistToBrandKit = () => {
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
    setContrastConfirmOpen(false);
  };

  const handleSaveToBrandKit = () => {
    if (!hydrated) return;
    const accentColor = deriveAccentFromPrimary(state.primaryColor);
    if (
      brandPaletteHasContrastRisk({
        primary: state.primaryColor,
        secondary: state.secondaryColor,
        accent: accentColor,
      })
    ) {
      setContrastConfirmOpen(true);
      return;
    }
    persistToBrandKit();
  };

  const handleExportPng = () => {
    if (!canvasRef.current) return;
    const node = canvasRef.current;
    void runExport(async () => {
      await exportNodeAsPng(
        node,
        formatFilename(`local-logo-${state.shape}`, state.localNumber, "png"),
        {
          pixelRatio: 3,
          // Transparent so circle corners stay clear (white fill made PNGs look wrong vs SVG)
          backgroundColor: null,
        },
      );
    });
  };

  const handleExportSvg = () => {
    if (!canvasRef.current) return;
    const node = canvasRef.current;
    void runExport(async () => {
      await exportNodeAsSvg(
        node,
        formatFilename(`local-logo-${state.shape}`, state.localNumber, "svg"),
      );
    });
  };

  return (
    <ToolEditorLayout
      title={tBuilder("title")}
      eyebrow={inDemo ? <WorkshopDemoPath variant="trail" /> : undefined}
      description={tBuilder("description")}
      purposeHint={inDemo ? undefined : tBuilder("whenToUse")}
      previewAccessibleName={tBuilder("previewAccessibleName")}
      exportError={exportError}
      exportSuccess={exportSuccess}
      footer={<ToolRelatedFooter toolSlug="logo-builder" />}
      form={
        <Card density="compact" className="space-y-5">
          <section className="space-y-3">
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
          <SegControl
            label={tBuilder("shape")}
            value={state.shape}
            options={LOGO_SHAPES.map((shape) => ({
              value: shape,
              label: tBuilder(
                shape === "circle"
                  ? "shapeCircle"
                  : shape === "square"
                    ? "shapeSquare"
                    : "shapeRectangle",
              ),
            }))}
            onChange={(shape) => setState({ ...state, shape })}
          />
          <p className="text-sm leading-snug text-gray-600">
            {tBuilder(
              state.shape === "circle"
                ? "shapeCircleHint"
                : state.shape === "square"
                  ? "shapeSquareHint"
                  : "shapeRectangleHint",
            )}
          </p>
          </section>
          <ToolFormDetails title={t("sectionColours")}>
            <ThemePicker
              primaryColor={state.primaryColor}
              secondaryColor={state.secondaryColor}
              accentColor={deriveAccentFromPrimary(state.primaryColor)}
              onPrimaryChange={(c) => setState({ ...state, primaryColor: c })}
              onSecondaryChange={(c) => setState({ ...state, secondaryColor: c })}
            />
            <BrandContrastConfirmDialog
              open={contrastConfirmOpen}
              onConfirm={persistToBrandKit}
              onCancel={() => setContrastConfirmOpen(false)}
            />
          </ToolFormDetails>

          <ToolFormDetails title={tLogo("title")}>
            <p className="text-sm leading-snug text-gray-600">{tLogo("description")}</p>
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
          </ToolFormDetails>
          <div className="space-y-3 border-t border-gray-200 pt-5">
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
          </div>
        </Card>
      }
      previewActions={
        <>
          <Button variant="outline" onClick={handleExportPng}>
            {t("downloadPng")}
          </Button>
          <Button variant="outline" onClick={handleExportSvg}>
            {t("downloadSvg")}
          </Button>
        </>
      }
      preview={
        <div className="flex items-center justify-center">
          <div
            className={cn(
              "shadow-lg",
              state.shape === "circle" && "rounded-full",
            )}
          >
            <LocalLogoPlate
              ref={canvasRef}
              exportRoot
              shape={state.shape}
              primaryColor={state.primaryColor}
              secondaryColor={state.secondaryColor}
              localNumber={state.localNumber}
              subText={state.subText}
              tokens={tokens}
            />
          </div>
        </div>
      }
    />
  );
}
