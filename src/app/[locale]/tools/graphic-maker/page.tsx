"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { useBrandStore } from "@/store/brand-store";
import { isBrandThemeEstablished } from "@/lib/utils/brand-theme";
import { useUndoRedo } from "@/hooks/use-undo-redo";
import { useExportHandler } from "@/hooks/use-export-handler";
import { useExamplePostSeed } from "@/hooks/use-example-post-seed";
import { exportNodeAsPng } from "@/lib/export/image-export";
import { formatFilename, resolveLocalNumber } from "@/lib/utils";
import { TOOL_PRESETS, type ToolPresetKey } from "@/lib/constants/presets";
import {
  getExamplePost,
  layoutSupportsPhoto,
  type ExampleAspect,
} from "@/lib/constants/examples";
import {
  GRAPHIC_LAYOUT_ORDER,
  GraphicLayoutCanvas,
  type GraphicLayoutId,
} from "@/components/tools/graphic-layouts";
import { Button } from "@/components/ui/Button";
import { Input, Textarea } from "@/components/ui/Input";
import { Card } from "@/components/ui/Card";
import { ImageUpload } from "@/components/tools/ImageUpload";
import { ConsentModal } from "@/components/tools/ConsentModal";
import { UndoRedoBar } from "@/components/tools/UndoRedoBar";
import { BrandSwatchPicker } from "@/components/tools/BrandSwatchPicker";
import { ContrastChecker } from "@/components/tools/ContrastChecker";
import { ToolEditorLayout } from "@/components/tools/ToolEditorLayout";
import { BrandSetupPrompt } from "@/components/tools/BrandSetupPrompt";
import { ToolRelatedFooter } from "@/components/tools/ToolRelatedFooter";
import { ToolFormDetails } from "@/components/tools/ToolFormDetails";
import { SegControl } from "@/components/tools/SegControl";
import { PageShell } from "@/components/layout/PageShell";
import { InviteEmailPanel } from "@/components/tools/InviteEmailPanel";
import { pickContrastingInk } from "@/lib/utils/ink";
import { resolveCanvasTokens } from "@/lib/utils/canvas-tokens";
import type { EventEmailFields } from "@/lib/comms/event-email";

function isToolPresetKey(value: string): value is ToolPresetKey {
  return value in TOOL_PRESETS;
}

function isGraphicLayoutId(value: string): value is GraphicLayoutId {
  return (GRAPHIC_LAYOUT_ORDER as readonly string[]).includes(value);
}

interface GraphicState {
  layout: GraphicLayoutId;
  aspect: ExampleAspect;
  headline: string;
  subheadline: string;
  detail: string;
  initials: string;
  photoUrl?: string;
  photoScale: number;
  primaryColor: string;
  accentColor: string;
  secondaryColor: string;
}

function GraphicMakerPageContent() {
  const t = useTranslations("common");
  const tg = useTranslations("graphicMaker");
  const te = useTranslations("examples");
  const searchParams = useSearchParams();
  const brandKit = useBrandStore((s) => s.brandKit);
  const onboardingComplete = useBrandStore((s) => s.onboardingComplete);
  const themeEstablished = isBrandThemeEstablished(brandKit, onboardingComplete);
  const canvasRef = useRef<HTMLDivElement>(null);
  const [consentOpen, setConsentOpen] = useState(false);
  const [pendingPhoto, setPendingPhoto] = useState<string | null>(null);
  const [canvasSize, setCanvasSize] = useState<"preview" | "export">("preview");
  const presetApplied = useRef(false);

  const brandColors = {
    primary: brandKit.primaryColor,
    accent: brandKit.accentColor,
    secondary: brandKit.secondaryColor,
  };

  const initial: GraphicState = {
    layout: "solidarity",
    aspect: "landscape",
    headline: "Member Spotlight",
    subheadline: "Celebrating our union family",
    detail: "",
    initials: "M",
    photoScale: 1,
    primaryColor: brandKit.primaryColor,
    accentColor: brandKit.accentColor,
    secondaryColor: brandKit.secondaryColor,
  };

  const { state, setState, undo, redo, canUndo, canRedo, reset } =
    useUndoRedo<GraphicState>(initial);
  const { exportError, exportSuccess, exporting, runExport } =
    useExportHandler();

  const applyPreset = (key: ToolPresetKey) => {
    const preset = TOOL_PRESETS[key];
    const layout: GraphicLayoutId =
      key === "memberSpotlight"
        ? "spotlight"
        : key === "agmNotice" || key === "bargainingUpdate"
          ? "notice"
          : "solidarity";
    setState({
      ...state,
      layout,
      aspect: key === "memberSpotlight" ? "square" : "landscape",
      headline: preset.headline,
      subheadline: preset.subheadline,
      detail:
        key === "agmNotice"
          ? "AGM"
          : key === "bargainingUpdate"
            ? "Update"
            : key === "strikeAction"
              ? "Strike"
              : "",
    });
  };

  useExamplePostSeed((exampleId) => {
    const post = getExamplePost(exampleId);
    if (!post || post.primaryTool !== "graphic-maker") return false;
    if (!isGraphicLayoutId(post.layout)) return false;
    const detail = te.has(`posts.${post.id}.mockup.detail`)
      ? te(`posts.${post.id}.mockup.detail`)
      : "";
    const initials = te.has(`posts.${post.id}.mockup.initials`)
      ? te(`posts.${post.id}.mockup.initials`)
      : "M";
    setState((prev) => ({
      ...prev,
      layout: post.layout as GraphicLayoutId,
      aspect: post.aspect,
      headline: te(`posts.${post.id}.mockup.headline`),
      subheadline: te(`posts.${post.id}.mockup.body`),
      detail,
      initials,
      primaryColor: brandKit.primaryColor,
      accentColor: brandKit.accentColor,
      secondaryColor: brandKit.secondaryColor,
    }));
    return true;
  });

  useEffect(() => {
    if (presetApplied.current) return;
    const exampleId = searchParams.get("example");
    if (exampleId) {
      const post = getExamplePost(exampleId);
      if (
        post &&
        post.primaryTool === "graphic-maker" &&
        isGraphicLayoutId(post.layout)
      ) {
        return;
      }
    }
    const presetRaw = searchParams.get("preset");

    if (presetRaw && isToolPresetKey(presetRaw)) {
      presetApplied.current = true;
      const preset = TOOL_PRESETS[presetRaw];
      const layout: GraphicLayoutId =
        presetRaw === "memberSpotlight"
          ? "spotlight"
          : presetRaw === "agmNotice" || presetRaw === "bargainingUpdate"
            ? "notice"
            : "solidarity";
      setState((prev) => ({
        ...prev,
        layout,
        aspect: presetRaw === "memberSpotlight" ? "square" : "landscape",
        headline: preset.headline,
        subheadline: preset.subheadline,
        detail:
          presetRaw === "agmNotice"
            ? "AGM"
            : presetRaw === "bargainingUpdate"
              ? "Update"
              : presetRaw === "strikeAction"
                ? "Strike"
                : "",
      }));
    }
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
    setCanvasSize("export");
    await new Promise<void>((resolve) => {
      requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
    });
    try {
      await runExport(async () => {
        await exportNodeAsPng(
          canvasRef.current!,
          formatFilename("graphic", brandKit.local.localNumber, "png"),
          { pixelRatio: 2, backgroundColor: state.primaryColor },
        );
      });
    } finally {
      setCanvasSize("preview");
    }
  };

  const showPhoto = layoutSupportsPhoto(state.layout);
  const showDetail =
    state.layout === "notice" ||
    state.layout === "results" ||
    state.layout === "solidarity" ||
    state.layout === "thanks";
  const showInitials = state.layout === "spotlight" && !state.photoUrl;

  return (
    <>
      <ToolEditorLayout
        title={tg("title")}
        description={tg("subtitle")}
        purposeHint={tg("whenToUse")}
        previewAccessibleName={tg("previewAccessibleName")}
        exportError={exportError}
        exportSuccess={exportSuccess}
        toolbar={
          <div className="space-y-3">
            {!themeEstablished ? (
              <BrandSetupPrompt themeEstablished={themeEstablished} />
            ) : null}
            <div className="flex flex-wrap gap-2">
              {(Object.keys(TOOL_PRESETS) as ToolPresetKey[]).map((key) => (
                <Button
                  key={key}
                  size="sm"
                  variant="outline"
                  onClick={() => applyPreset(key)}
                >
                  {TOOL_PRESETS[key].headline}
                </Button>
              ))}
            </div>
          </div>
        }
        form={
          <Card density="compact" className="space-y-5">
            <section className="space-y-3">
            <SegControl
              label={tg("layout")}
              value={state.layout}
              options={GRAPHIC_LAYOUT_ORDER.map((id) => ({
                value: id,
                label: tg(`layouts.${id}`),
              }))}
              onChange={(id) =>
                setState({
                  ...state,
                  layout: id,
                  aspect:
                    id === "spotlight" || id === "results"
                      ? "square"
                      : state.aspect,
                })
              }
            />

            <SegControl
              label={tg("aspect")}
              value={state.aspect}
              options={(["landscape", "square"] as const).map((aspect) => ({
                value: aspect,
                label: tg(`aspects.${aspect}`),
              }))}
              onChange={(aspect) => setState({ ...state, aspect })}
            />

            <Input
              label={tg("headline")}
              value={state.headline}
              onChange={(e) => setState({ ...state, headline: e.target.value })}
            />
            <Textarea
              label={tg("subheadline")}
              value={state.subheadline}
              onChange={(e) =>
                setState({ ...state, subheadline: e.target.value })
              }
              rows={2}
            />
            {showDetail ? (
              <Input
                label={tg("detail")}
                value={state.detail}
                onChange={(e) => setState({ ...state, detail: e.target.value })}
              />
            ) : null}
            {showInitials ? (
              <Input
                label={tg("initials")}
                value={state.initials}
                onChange={(e) =>
                  setState({ ...state, initials: e.target.value })
                }
                maxLength={3}
              />
            ) : null}

            {showPhoto ? (
              <>
                <ImageUpload
                  label={tg("photo")}
                  preview={state.photoUrl}
                  onUpload={handlePhotoUpload}
                  onClear={() => setState({ ...state, photoUrl: undefined })}
                />
                <p className="text-sm leading-snug text-gray-600">
                  <Link
                    href="/guide/photo-consent"
                    className="text-opseu-blue underline"
                  >
                    {tg("photoConsentLink")}
                  </Link>
                </p>
                <Input
                  label={tg("photoZoom")}
                  type="range"
                  min="0.5"
                  max="2"
                  step="0.1"
                  value={state.photoScale}
                  onChange={(e) =>
                    setState({
                      ...state,
                      photoScale: parseFloat(e.target.value),
                    })
                  }
                />
              </>
            ) : null}
            </section>

            <ToolFormDetails title={t("sectionColours")}>
              <BrandSwatchPicker
                label={tg("primaryColor")}
                value={state.primaryColor}
                onChange={(c) => setState({ ...state, primaryColor: c })}
                colors={brandColors}
              />
              <BrandSwatchPicker
                label={tg("accentColor")}
                value={state.accentColor}
                onChange={(c) => setState({ ...state, accentColor: c })}
                colors={brandColors}
              />
              <BrandSwatchPicker
                label={tg("secondaryColor")}
                value={state.secondaryColor}
                onChange={(c) => setState({ ...state, secondaryColor: c })}
                colors={brandColors}
              />
              <ContrastChecker
                foreground={pickContrastingInk(state.primaryColor)}
                background={state.primaryColor}
              />
            </ToolFormDetails>

            <div className="space-y-3 border-t border-gray-200 pt-5">
            <UndoRedoBar
              canUndo={canUndo}
              canRedo={canRedo}
              onUndo={undo}
              onRedo={redo}
              onReset={() =>
                reset({
                  ...initial,
                  primaryColor: brandKit.primaryColor,
                  accentColor: brandKit.accentColor,
                  secondaryColor: brandKit.secondaryColor,
                })
              }
            />
            <Button onClick={handleExport} disabled={exporting}>
              {exporting ? t("exporting") : t("downloadPng")}
            </Button>
            </div>
          </Card>
        }
        previewActions={
          <Button onClick={handleExport} disabled={exporting}>
            {exporting ? t("exporting") : t("downloadPng")}
          </Button>
        }
        preview={
          <div className="overflow-hidden rounded-lg shadow-lg">
            <div ref={canvasRef}>
              <GraphicLayoutCanvas
                layout={state.layout}
                aspect={state.aspect}
                copy={{
                  headline: state.headline,
                  body: state.subheadline,
                  detail: state.detail || undefined,
                  initials: state.initials,
                }}
                colors={{
                  primary: state.primaryColor,
                  accent: state.accentColor,
                  secondary: state.secondaryColor,
                }}
                localNumber={resolveLocalNumber(brandKit.local.localNumber)}
                subText={brandKit.local.subText}
                photoUrl={showPhoto ? state.photoUrl : undefined}
                photoScale={state.photoScale}
                size={canvasSize}
                tokens={resolveCanvasTokens(brandKit)}
              />
            </div>
          </div>
        }
        footer={
          <div className="space-y-6">
            {state.layout === "notice" ? (
              <InviteEmailPanel
                messagesNamespace="graphicMaker"
                localNumber={resolveLocalNumber(brandKit.local.localNumber)}
                fields={
                  {
                    title: state.headline,
                    subtitle: state.subheadline,
                    location: state.detail || undefined,
                  } satisfies EventEmailFields
                }
              />
            ) : null}
            <ToolRelatedFooter toolSlug="graphic-maker" />
          </div>
        }
      />
      <ConsentModal
        open={consentOpen}
        onConfirm={handleConsent}
        onCancel={() => {
          setPendingPhoto(null);
          setConsentOpen(false);
        }}
      />
    </>
  );
}

function GraphicMakerSuspenseFallback() {
  const t = useTranslations("common");
  return (
    <PageShell className="py-6 md:py-8 lg:py-10">
      <p className="text-gray-600" aria-busy="true">
        {t("loading")}
      </p>
    </PageShell>
  );
}

export default function GraphicMakerPage() {
  return (
    <Suspense fallback={<GraphicMakerSuspenseFallback />}>
      <GraphicMakerPageContent />
    </Suspense>
  );
}
