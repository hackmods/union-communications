"use client";

import { Suspense, useRef } from "react";
import { useTranslations } from "next-intl";
import { useBrandStore } from "@/store/brand-store";
import { isBrandThemeEstablished } from "@/lib/utils/brand-theme";
import { useUndoRedo } from "@/hooks/use-undo-redo";
import { useExportHandler } from "@/hooks/use-export-handler";
import { useExamplePostSeed } from "@/hooks/use-example-post-seed";
import { useOneShotBrandSeed } from "@/hooks/use-one-shot-brand-seed";
import { exportNodeAsPng } from "@/lib/export/image-export";
import { formatFilename, resolveLocalNumber } from "@/lib/utils";
import { getExamplePost } from "@/lib/constants/examples";
import { QuoteLayout } from "@/components/tools/graphic-layouts";
import { Button } from "@/components/ui/Button";
import { Input, Textarea } from "@/components/ui/Input";
import { Card } from "@/components/ui/Card";
import { ColorField } from "@/components/tools/ColorField";
import { ContrastChecker } from "@/components/tools/ContrastChecker";
import { ThemePicker } from "@/components/tools/ThemePicker";
import { UndoRedoBar } from "@/components/tools/UndoRedoBar";
import { PageShell } from "@/components/layout/PageShell";
import { ToolEditorLayout } from "@/components/tools/ToolEditorLayout";
import { BrandSetupPrompt } from "@/components/tools/BrandSetupPrompt";
import { WorkshopDemoPath } from "@/components/comms/WorkshopDemoPath";
import { useWorkshopDemoSession } from "@/hooks/use-workshop-demo-session";
import { ToolRelatedFooter } from "@/components/tools/ToolRelatedFooter";
import { ToolFormDetails } from "@/components/tools/ToolFormDetails";
import { pickContrastingInk } from "@/lib/utils/ink";
import { resolveCanvasTokens } from "@/lib/utils/canvas-tokens";
import { canvasSurfaceStyle } from "@/lib/utils/canvas-surface";

interface QuoteState {
  quote: string;
  author: string;
  role: string;
  primaryColor: string;
  accentColor: string;
  textColor: string;
}

function QuoteCardPageContent() {
  const t = useTranslations("common");
  const tq = useTranslations("quoteCard");
  const te = useTranslations("examples");
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
    primaryColor: brandKit.primaryColor,
    accentColor: brandKit.accentColor,
    textColor: pickContrastingInk(brandKit.primaryColor),
  };

  const { state, setState, undo, redo, canUndo, canRedo, reset } =
    useUndoRedo<QuoteState>(initial);
  const { exportError, exportSuccess, exporting, runExport } = useExportHandler();
  const surfaceStyle = canvasSurfaceStyle(tokens, {
    primary: state.primaryColor,
    secondary: brandKit.secondaryColor,
    accent: state.accentColor,
  });

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
      primaryColor: brandKit.primaryColor,
      accentColor: brandKit.accentColor,
      textColor: pickContrastingInk(brandKit.primaryColor),
    }));
    return true;
  }, "example", hydrated);

  useOneShotBrandSeed(hydrated, () => {
    const exampleId =
      typeof window !== "undefined"
        ? new URLSearchParams(window.location.search).get("example")
        : null;
    if (exampleId) {
      const post = getExamplePost(exampleId);
      if (post?.primaryTool === "quote-card") return;
    }
    reset({
      ...initial,
      primaryColor: brandKit.primaryColor,
      accentColor: brandKit.accentColor,
      textColor: pickContrastingInk(brandKit.primaryColor),
    });
  });

  const handleExport = async () => {
    if (!canvasRef.current) return;
    await runExport(async () => {
      await exportNodeAsPng(
        canvasRef.current!,
        formatFilename("quote-card", brandKit.local.localNumber, "png"),
        { pixelRatio: 2, backgroundColor: state.primaryColor },
      );
    });
  };

  return (
    <ToolEditorLayout
      title={tq("title")}
      eyebrow={inDemo ? <WorkshopDemoPath variant="trail" /> : undefined}
      description={tq("subtitle")}
      purposeHint={inDemo ? undefined : tq("whenToUse")}
      previewAccessibleName={tq("previewAccessibleName")}
      toolbar={!themeEstablished ? (
        <BrandSetupPrompt themeEstablished={themeEstablished} />
      ) : undefined}
      exportError={exportError}
      exportSuccess={exportSuccess}
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
          <ToolFormDetails title={t("sectionColours")}>
            <ThemePicker
              primaryColor={state.primaryColor}
              secondaryColor={state.accentColor}
              onPrimaryChange={(c) =>
                setState({
                  ...state,
                  primaryColor: c,
                  textColor: pickContrastingInk(c),
                })
              }
              onSecondaryChange={(c) => setState({ ...state, accentColor: c })}
              primaryLabel={tq("primaryColor")}
              secondaryLabel={tq("accentColor")}
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
                textColor: pickContrastingInk(brandKit.primaryColor),
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
        /* Shadow stays outside canvasRef — box-shadow oklch from Tailwind breaks PNG capture */
        <div className="shadow-lg">
          <div
            ref={canvasRef}
                  data-export-root=""
            className="relative aspect-square w-full overflow-hidden"
            style={surfaceStyle}
          >
            <QuoteLayout
              primary={state.primaryColor}
              accent={state.accentColor}
              textColor={state.textColor}
              copy={{
                headline: state.author,
                body: state.quote,
                detail: state.role || undefined,
              }}
              localNumber={resolveLocalNumber(brandKit.local.localNumber)}
              subText={brandKit.local.subText}
              size="export"
              tokens={tokens}
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
