"use client";

import { Suspense, useRef } from "react";
import { useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { useBrandStore } from "@/store/brand-store";
import { useUndoRedo } from "@/hooks/use-undo-redo";
import { useExportHandler } from "@/hooks/use-export-handler";
import { useOneShotBrandSeed } from "@/hooks/use-one-shot-brand-seed";
import { useExamplePostSeed } from "@/hooks/use-example-post-seed";
import { exportNodeAsPng } from "@/lib/export/image-export";
import { nodeToPdf } from "@/lib/export/pdf-export";
import { formatFilename, resolveLocalNumber } from "@/lib/utils";
import { getExamplePost } from "@/lib/constants/examples";
import { coloursFromBrandKit } from "@/lib/utils/brand-theme";
import { BrandLogo } from "@/components/brand/BrandLogo";
import { Button } from "@/components/ui/Button";
import { Input, Textarea } from "@/components/ui/Input";
import { Card } from "@/components/ui/Card";
import { UndoRedoBar } from "@/components/tools/UndoRedoBar";
import { BrandSwatchPicker } from "@/components/tools/BrandSwatchPicker";
import { ContrastChecker } from "@/components/tools/ContrastChecker";
import { pickContrastingInk } from "@/lib/utils/ink";
import { meetsWcagAA } from "@/lib/utils/contrast";
import { PageShell } from "@/components/layout/PageShell";
import { ToolEditorLayout } from "@/components/tools/ToolEditorLayout";

interface FlyerState {
  message: string;
  date: string;
  time: string;
  location: string;
  primaryColor: string;
  accentColor: string;
  secondaryColor: string;
}

function FlyerMakerPageContent() {
  const t = useTranslations("common");
  const tf = useTranslations("flyerMaker");
  const te = useTranslations("examples");
  const brandKit = useBrandStore((s) => s.brandKit);
  const hydrated = useBrandStore((s) => s.hydrated);
  const canvasRef = useRef<HTMLDivElement>(null);
  const searchParams = useSearchParams();

  const brandColors = coloursFromBrandKit(brandKit);

  const initial: FlyerState = {
    message: "PICKET LINE - ALL MEMBERS WELCOME",
    date: "Monday, March 15",
    time: "7:00 AM – 4:00 PM",
    location: "123 Main Street, Toronto",
    primaryColor: brandColors.primary,
    accentColor: brandColors.accent,
    secondaryColor: brandColors.secondary,
  };

  const { state, setState, undo, redo, canUndo, canRedo, reset } =
    useUndoRedo<FlyerState>(initial);
  const { exportError, exporting, runExport } = useExportHandler();

  useExamplePostSeed((exampleId) => {
    const post = getExamplePost(exampleId);
    if (!post || post.primaryTool !== "flyer-maker") return false;
    const colours = coloursFromBrandKit(brandKit);
    const detail = te.has(`posts.${post.id}.mockup.detail`)
      ? te(`posts.${post.id}.mockup.detail`)
      : "";
    reset({
      ...initial,
      message: te(`posts.${post.id}.mockup.headline`).toUpperCase(),
      location: te(`posts.${post.id}.mockup.body`),
      date: detail || initial.date,
      primaryColor: colours.primary,
      accentColor: colours.accent,
      secondaryColor: colours.secondary,
    });
    return true;
  }, "example", hydrated);

  useOneShotBrandSeed(hydrated, () => {
    const exampleId = searchParams.get("example");
    if (exampleId) {
      const post = getExamplePost(exampleId);
      if (post?.primaryTool === "flyer-maker") return;
    }
    const colours = coloursFromBrandKit(brandKit);
    reset({
      ...initial,
      primaryColor: colours.primary,
      accentColor: colours.accent,
      secondaryColor: colours.secondary,
    });
  });

  const handleExportPng = async () => {
    if (!canvasRef.current) return;
    await runExport(async () => {
      await exportNodeAsPng(
        canvasRef.current!,
        formatFilename("flyer", brandKit.local.localNumber, "png"),
        { pixelRatio: 2, backgroundColor: state.primaryColor },
      );
    });
  };

  const handleExportPdf = async () => {
    if (!canvasRef.current) return;
    await runExport(async () => {
      await nodeToPdf(
        canvasRef.current!,
        formatFilename("flyer", brandKit.local.localNumber, "pdf"),
        8.5,
        11,
        2,
        state.primaryColor,
      );
    });
  };

  return (
    <ToolEditorLayout
      title={tf("title")}
      description={tf("subtitle")}
      previewAccessibleName={tf("previewAccessibleName")}
      exportError={exportError}
      form={
        <Card density="compact" className="space-y-3">
          <Textarea
            label={tf("message")}
            value={state.message}
            onChange={(e) => setState({ ...state, message: e.target.value })}
            rows={2}
          />
          <Input
            label={tf("date")}
            value={state.date}
            onChange={(e) => setState({ ...state, date: e.target.value })}
          />
          <Input
            label={tf("time")}
            value={state.time}
            onChange={(e) => setState({ ...state, time: e.target.value })}
          />
          <Input
            label={tf("location")}
            value={state.location}
            onChange={(e) => setState({ ...state, location: e.target.value })}
          />
          <BrandSwatchPicker
            label={tf("primaryColor")}
            value={state.primaryColor}
            onChange={(c) => setState({ ...state, primaryColor: c })}
            colors={brandColors}
          />
          <BrandSwatchPicker
            label={tf("accentColor")}
            value={state.accentColor}
            onChange={(c) => setState({ ...state, accentColor: c })}
            colors={brandColors}
          />
          <BrandSwatchPicker
            label={tf("secondaryColor")}
            value={state.secondaryColor}
            onChange={(c) => setState({ ...state, secondaryColor: c })}
            colors={brandColors}
          />
          <ContrastChecker
            foreground={pickContrastingInk(state.primaryColor)}
            background={state.primaryColor}
          />
          <UndoRedoBar
            canUndo={canUndo}
            canRedo={canRedo}
            onUndo={undo}
            onRedo={redo}
            onReset={() => {
              const colours = coloursFromBrandKit(brandKit);
              reset({
                ...initial,
                primaryColor: colours.primary,
                accentColor: colours.accent,
                secondaryColor: colours.secondary,
              });
            }}
          />
          <div className="flex gap-3">
            <Button onClick={handleExportPng} disabled={exporting}>
              {exporting ? t("exporting") : t("downloadPng")}
            </Button>
            <Button
              variant="outline"
              onClick={handleExportPdf}
              disabled={exporting}
            >
              {t("downloadPdf")}
            </Button>
          </div>
        </Card>
      }
      previewActions={
        <>
          <Button onClick={handleExportPng} disabled={exporting}>
            {exporting ? t("exporting") : t("downloadPng")}
          </Button>
          <Button
            variant="outline"
            onClick={handleExportPdf}
            disabled={exporting}
          >
            {t("downloadPdf")}
          </Button>
        </>
      }
      preview={
        /* Shadow stays outside canvasRef — box-shadow oklch from Tailwind breaks PNG capture */
        <div className="shadow-lg">
          <div
            ref={canvasRef}
            className="flex aspect-[8.5/11] w-full flex-col justify-between p-10"
            style={{
              backgroundColor: state.primaryColor,
              color: pickContrastingInk(state.primaryColor),
            }}
          >
            <div>
              <BrandLogo
                size="md"
                backgroundColor={state.primaryColor}
                className="mb-3"
              />
              <p
                className="text-sm font-bold uppercase tracking-widest"
                style={{
                  color: meetsWcagAA(
                    state.accentColor,
                    state.primaryColor,
                    true,
                  )
                    ? state.accentColor
                    : pickContrastingInk(state.primaryColor),
                }}
              >
                Local {resolveLocalNumber(brandKit.local.localNumber)}  - {" "}
                {brandKit.local.subText}
              </p>
            </div>
            <div className="text-center">
              <h2
                className="text-3xl font-black uppercase leading-tight"
                style={{ color: pickContrastingInk(state.primaryColor) }}
              >
                {state.message}
              </h2>
              {state.secondaryColor !== state.primaryColor ? (
                <div
                  className="mx-auto mt-4 h-1 w-24"
                  style={{ backgroundColor: state.secondaryColor }}
                  aria-hidden
                />
              ) : null}
            </div>
            <div className="space-y-2 text-lg">
              <p>
                <strong>{tf("date")}:</strong> {state.date}
              </p>
              <p>
                <strong>{tf("time")}:</strong> {state.time}
              </p>
              <p>
                <strong>{tf("location")}:</strong> {state.location}
              </p>
            </div>
          </div>
        </div>
      }
    />
  );
}

function FlyerMakerSuspenseFallback() {
  const t = useTranslations("common");
  return (
    <PageShell className="py-6 md:py-8 lg:py-10">
      <p className="text-gray-600" aria-busy="true">
        {t("loading")}
      </p>
    </PageShell>
  );
}

export default function FlyerMakerPage() {
  return (
    <Suspense fallback={<FlyerMakerSuspenseFallback />}>
      <FlyerMakerPageContent />
    </Suspense>
  );
}
