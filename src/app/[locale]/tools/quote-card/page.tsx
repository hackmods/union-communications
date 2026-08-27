"use client";

import { Suspense, useRef } from "react";
import { useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { useBrandStore } from "@/store/brand-store";
import { isBrandThemeEstablished } from "@/lib/utils/brand-theme";
import { useUndoRedo } from "@/hooks/use-undo-redo";
import { useExportHandler } from "@/hooks/use-export-handler";
import { useExamplePostSeed } from "@/hooks/use-example-post-seed";
import { useOneShotBrandSeed } from "@/hooks/use-one-shot-brand-seed";
import { exportNodeAsPng } from "@/lib/export/image-export";
import { cn, formatFilename, resolveLocalNumber } from "@/lib/utils";
import {
  EXAMPLE_ASPECTS,
  aspectFromQuery,
  getExamplePost,
  graphicAspectClass,
  type ExampleAspect,
} from "@/lib/constants/examples";
import {
  DEFAULT_QUOTE_LAYOUT,
  QUOTE_LAYOUT_ORDER,
  quoteLayoutFromQuery,
  type QuoteLayoutId,
} from "@/lib/comms/quote-layouts";
import {
  QUOTE_PRESET_ORDER,
  QUOTE_PRESETS,
  isQuotePresetKey,
  type QuotePresetKey,
} from "@/lib/comms/quote-presets";
import { QuoteLayout } from "@/components/tools/graphic-layouts";
import { Button } from "@/components/ui/Button";
import { Input, Textarea } from "@/components/ui/Input";
import { Card } from "@/components/ui/Card";
import { ColorField } from "@/components/tools/ColorField";
import { ContrastChecker } from "@/components/tools/ContrastChecker";
import { UndoRedoBar } from "@/components/tools/UndoRedoBar";
import { PageShell } from "@/components/layout/PageShell";
import { Link } from "@/i18n/navigation";
import { ToolEditorLayout } from "@/components/tools/ToolEditorLayout";
import { BrandSetupPrompt } from "@/components/tools/BrandSetupPrompt";
import { WorkshopDemoPath } from "@/components/comms/WorkshopDemoPath";
import { useWorkshopDemoSession } from "@/hooks/use-workshop-demo-session";
import { ToolRelatedFooter } from "@/components/tools/ToolRelatedFooter";
import { ToolColourSection } from "@/components/tools/ToolColourSection";
import { ToolFormDetails } from "@/components/tools/ToolFormDetails";
import { ToolExportActions } from "@/components/tools/ToolExportActions";
import { SegControl } from "@/components/tools/SegControl";
import { CanvasBrandingControls } from "@/components/tools/CanvasBrandingControls";
import type { BoardLogoMode } from "@/lib/constants/board-banner-ornaments";
import {
  INITIAL_LOGO_MODE,
  defaultLogoMode,
  defaultShowLocalNumber,
} from "@/lib/comms/canvas-logo-mode";
import { pickContrastingInk } from "@/lib/utils/ink";
import { resolveCanvasTokens } from "@/lib/utils/canvas-tokens";
import { canvasSurfaceStyle } from "@/lib/utils/canvas-surface";

interface QuoteState {
  quote: string;
  author: string;
  role: string;
  layout: QuoteLayoutId;
  aspect: ExampleAspect;
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  textColor: string;
  logoMode: BoardLogoMode;
  showLocalNumber: boolean;
}

function QuoteCardPageContent() {
  const tc = useTranslations("common");
  const tq = useTranslations("quoteCard");
  const td = useTranslations("workshopDemo");
  const te = useTranslations("examples");
  const searchParams = useSearchParams();
  const brandKit = useBrandStore((s) => s.brandKit);
  const onboardingComplete = useBrandStore((s) => s.onboardingComplete);
  const hydrated = useBrandStore((s) => s.hydrated);
  const themeEstablished = isBrandThemeEstablished(brandKit, onboardingComplete);
  const inDemo = useWorkshopDemoSession(null);
  const canvasRef = useRef<HTMLDivElement>(null);
  const tokens = resolveCanvasTokens(brandKit);

  const initial: QuoteState = {
    quote: "We will not accept anything less than a fair deal for our members.",
    author: "Local President",
    role: "",
    layout: DEFAULT_QUOTE_LAYOUT,
    aspect: "square",
    primaryColor: brandKit.primaryColor,
    secondaryColor: brandKit.secondaryColor,
    accentColor: brandKit.accentColor,
    textColor: pickContrastingInk(brandKit.primaryColor),
    logoMode: INITIAL_LOGO_MODE,
    showLocalNumber: defaultShowLocalNumber(),
  };

  const { state, setState, undo, redo, canUndo, canRedo, reset } =
    useUndoRedo<QuoteState>(initial);
  const { exportError, exportSuccess, exporting, runExport } = useExportHandler();
  const surfaceStyle = canvasSurfaceStyle(tokens, {
    primary: state.primaryColor,
    secondary: state.secondaryColor,
    accent: state.accentColor,
  });

  const applyPreset = (key: QuotePresetKey) => {
    const preset = QUOTE_PRESETS[key];
    setState({
      ...state,
      quote: preset.quote,
      author: preset.author,
      role: preset.role,
      layout: preset.layout,
      aspect: preset.aspect,
    });
  };

  useExamplePostSeed((exampleId) => {
    const post = getExamplePost(exampleId);
    if (!post || post.primaryTool !== "quote-card") return false;
    const role = te.has(`posts.${post.id}.mockup.detail`)
      ? te(`posts.${post.id}.mockup.detail`)
      : "";
    setState((prev) => ({
      ...prev,
      quote: te(`posts.${post.id}.mockup.body`),
      author: te(`posts.${post.id}.mockup.headline`),
      role,
      layout: quoteLayoutFromQuery(searchParams, DEFAULT_QUOTE_LAYOUT),
      aspect: aspectFromQuery(searchParams, post.aspect),
      primaryColor: brandKit.primaryColor,
      secondaryColor: brandKit.secondaryColor,
      accentColor: brandKit.accentColor,
      textColor: pickContrastingInk(brandKit.primaryColor),
    }));
    return true;
  }, "example", hydrated);

  useOneShotBrandSeed(hydrated, () => {
    const exampleId = searchParams.get("example");
    if (exampleId) {
      const post = getExamplePost(exampleId);
      if (post?.primaryTool === "quote-card") return;
    }
    const colours = {
      primaryColor: brandKit.primaryColor,
      secondaryColor: brandKit.secondaryColor,
      accentColor: brandKit.accentColor,
      textColor: pickContrastingInk(brandKit.primaryColor),
    };
    const deepPreset = searchParams.get("preset");
    const fromDeep =
      deepPreset && isQuotePresetKey(deepPreset)
        ? QUOTE_PRESETS[deepPreset]
        : null;
    if (fromDeep) {
      reset({
        ...initial,
        ...colours,
        quote: fromDeep.quote,
        author: fromDeep.author,
        role: fromDeep.role,
        layout: quoteLayoutFromQuery(searchParams, fromDeep.layout),
        aspect: aspectFromQuery(searchParams, fromDeep.aspect),
      });
      return;
    }
    reset({
      ...initial,
      ...colours,
      logoMode: defaultLogoMode(themeEstablished),
      showLocalNumber: defaultShowLocalNumber(),
      layout: quoteLayoutFromQuery(searchParams, initial.layout),
      aspect: aspectFromQuery(searchParams, initial.aspect),
    });
  });

  const handleExport = async () => {
    if (!canvasRef.current) return;
    await runExport(async () => {
      await exportNodeAsPng(
        canvasRef.current!,
        formatFilename(
          `quote-card-${state.layout}-${state.aspect}`,
          brandKit.local.localNumber,
          "png",
        ),
        { pixelRatio: 2, backgroundColor: state.primaryColor },
      );
    });
  };

  const exportActions = (
    <ToolExportActions
      exporting={exporting}
      onPng={() => void handleExport()}
    />
  );

  return (
    <ToolEditorLayout
      title={tq("title")}
      eyebrow={inDemo ? <WorkshopDemoPath variant="trail" /> : undefined}
      description={tq("subtitle")}
      purposeHint={inDemo ? undefined : tq("whenToUse")}
      previewAccessibleName={tq("previewAccessibleName")}
      toolbar={
        <div className="space-y-3">
          {!themeEstablished ? (
            <BrandSetupPrompt themeEstablished={themeEstablished} />
          ) : null}
          <div className="flex flex-wrap gap-2">
            {QUOTE_PRESET_ORDER.map((key) => (
              <Button
                key={key}
                size="sm"
                variant="outline"
                onClick={() => applyPreset(key)}
              >
                {tq(`presets.${key}`)}
              </Button>
            ))}
          </div>
        </div>
      }
      exportError={exportError}
      exportSuccess={
        exportSuccess && inDemo ? (
          <>
            {exportSuccess}{" "}
            <Link
              href="/tools/website-template"
              className="font-semibold underline underline-offset-2"
            >
              {td("nextWebsite")}
            </Link>
          </>
        ) : (
          exportSuccess
        )
      }
      footer={<ToolRelatedFooter toolSlug="quote-card" />}
      form={
        <Card density="compact" className="space-y-5">
          <section className="space-y-3">
          <Textarea
            label={tq("quote")}
            value={state.quote}
            onChange={(e) => setState({ ...state, quote: e.target.value })}
            rows={4}
          />
          <Input
            label={tq("author")}
            value={state.author}
            onChange={(e) => setState({ ...state, author: e.target.value })}
          />
          <Input
            label={tq("role")}
            value={state.role}
            onChange={(e) => setState({ ...state, role: e.target.value })}
          />
          </section>

          <ToolFormDetails title={tc("sectionLayout")}>
          <SegControl
            label={tq("layout")}
            value={state.layout}
            options={QUOTE_LAYOUT_ORDER.map((id) => ({
              value: id,
              label: tq(`layouts.${id}`),
            }))}
            onChange={(layout) => setState({ ...state, layout })}
          />
          <SegControl
            label={tq("aspect")}
            value={state.aspect}
            options={EXAMPLE_ASPECTS.map((aspect) => ({
              value: aspect,
              label: tq(`aspects.${aspect}`),
            }))}
            onChange={(aspect) => setState({ ...state, aspect })}
          />
          <CanvasBrandingControls
            logoMode={state.logoMode}
            onLogoModeChange={(logoMode) => setState({ ...state, logoMode })}
            showLocalNumber={state.showLocalNumber}
            onShowLocalNumberChange={(showLocalNumber) =>
              setState({ ...state, showLocalNumber })
            }
          />
          </ToolFormDetails>
          <ToolColourSection
            primaryColor={state.primaryColor}
            secondaryColor={state.secondaryColor}
            accentColor={state.accentColor}
            onPrimaryChange={(c) =>
              setState({
                ...state,
                primaryColor: c,
                textColor: pickContrastingInk(c),
              })
            }
            onSecondaryChange={(c) =>
              setState({ ...state, secondaryColor: c })
            }
            primaryLabel={tq("primaryColor")}
            secondaryLabel={tq("secondaryColor")}
          >
            <ColorField
              label={tq("accentColor")}
              value={state.accentColor}
              onChange={(c) => setState({ ...state, accentColor: c })}
            />
            <ColorField
              label={tq("textColor")}
              value={state.textColor}
              onChange={(c) => setState({ ...state, textColor: c })}
            />
            <ContrastChecker
              foreground={state.textColor}
              background={state.primaryColor}
            />
          </ToolColourSection>
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
                secondaryColor: brandKit.secondaryColor,
                accentColor: brandKit.accentColor,
                textColor: pickContrastingInk(brandKit.primaryColor),
              })
            }
          />
          {exportActions}
          </div>
        </Card>
      }
      previewActions={exportActions}
      preview={
        /* Shadow stays outside canvasRef — box-shadow oklch from Tailwind breaks PNG capture */
        <div
          className={cn(
            "shadow-lg",
            state.aspect === "portrait" &&
              "mx-auto w-full max-w-[280px] sm:max-w-[320px]",
          )}
        >
          <div
            ref={canvasRef}
                  data-export-root=""
            className={cn(
              "relative w-full overflow-hidden",
              graphicAspectClass(state.aspect),
            )}
            style={surfaceStyle}
          >
            <QuoteLayout
              primary={state.primaryColor}
              accent={state.accentColor}
              secondary={state.secondaryColor}
              textColor={state.textColor}
              copy={{
                headline: state.author,
                body: state.quote,
                detail: state.role || undefined,
              }}
              localNumber={resolveLocalNumber(brandKit.local.localNumber)}
              subText={brandKit.local.subText}
              size="export"
              aspect={state.aspect}
              layout={state.layout}
              tokens={tokens}
              logoMode={state.logoMode}
              showLocalNumber={state.showLocalNumber}
            />
          </div>
        </div>
      }
    />
  );
}

function QuoteCardSuspenseFallback() {
  const t = useTranslations("common");
  return (
    <PageShell className="py-6 md:py-8 lg:py-10">
      <p className="text-gray-600" aria-busy="true">
        {t("loading")}
      </p>
    </PageShell>
  );
}

export default function QuoteCardPage() {
  return (
    <Suspense fallback={<QuoteCardSuspenseFallback />}>
      <QuoteCardPageContent />
    </Suspense>
  );
}
