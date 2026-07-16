"use client";

import { Suspense, useEffect, useRef } from "react";
import { useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { useBrandStore } from "@/store/brand-store";
import { useUndoRedo } from "@/hooks/use-undo-redo";
import { exportNodeAsPng } from "@/lib/export/image-export";
import { formatFilename, resolveLocalNumber } from "@/lib/utils";
import { getExamplePost } from "@/lib/constants/examples";
import { QuoteLayout } from "@/components/tools/graphic-layouts";
import { Button } from "@/components/ui/Button";
import { Input, Textarea } from "@/components/ui/Input";
import { Card } from "@/components/ui/Card";
import { ThemePicker } from "@/components/tools/ThemePicker";
import { UndoRedoBar } from "@/components/tools/UndoRedoBar";
import { PageShell } from "@/components/layout/PageShell";
import { ToolEditorLayout } from "@/components/tools/ToolEditorLayout";

interface QuoteState {
  quote: string;
  author: string;
  role: string;
  primaryColor: string;
  accentColor: string;
}

function QuoteCardPageContent() {
  const t = useTranslations("common");
  const tq = useTranslations("quoteCard");
  const te = useTranslations("examples");
  const brandKit = useBrandStore((s) => s.brandKit);
  const canvasRef = useRef<HTMLDivElement>(null);
  const searchParams = useSearchParams();
  const seedApplied = useRef(false);

  const initial: QuoteState = {
    quote: "We will not accept anything less than a fair deal for our members.",
    author: "Local President",
    role: "",
    primaryColor: brandKit.primaryColor,
    accentColor: brandKit.accentColor,
  };

  const { state, setState, undo, redo, canUndo, canRedo, reset } =
    useUndoRedo<QuoteState>(initial);

  useEffect(() => {
    if (seedApplied.current) return;
    const exampleId = searchParams.get("example");
    if (!exampleId) return;
    const post = getExamplePost(exampleId);
    if (!post || post.primaryTool !== "quote-card") return;
    seedApplied.current = true;
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
    }));
  }, [searchParams, setState, te, brandKit]);

  const handleExport = async () => {
    if (!canvasRef.current) return;
    await exportNodeAsPng(
      canvasRef.current,
      formatFilename("quote-card", brandKit.local.localNumber, "png"),
      { pixelRatio: 2, backgroundColor: state.primaryColor },
    );
  };

  return (
    <ToolEditorLayout
      title={tq("title")}
      description={tq("subtitle")}
      form={
        <Card density="compact" className="space-y-3">
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
          <ThemePicker
            primaryColor={state.primaryColor}
            secondaryColor={state.accentColor}
            onPrimaryChange={(c) => setState({ ...state, primaryColor: c })}
            onSecondaryChange={(c) => setState({ ...state, accentColor: c })}
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
                accentColor: brandKit.accentColor,
              })
            }
          />
          <Button onClick={handleExport}>{t("downloadPng")}</Button>
        </Card>
      }
      preview={
        /* Shadow stays outside canvasRef — box-shadow oklch from Tailwind breaks PNG capture */
        <div className="shadow-lg">
          <div
            ref={canvasRef}
            className="relative aspect-square w-full overflow-hidden"
            style={{ backgroundColor: state.primaryColor }}
          >
            <QuoteLayout
              primary={state.primaryColor}
              accent={state.accentColor}
              copy={{
                headline: state.author,
                body: state.quote,
                detail: state.role || undefined,
              }}
              localNumber={resolveLocalNumber(brandKit.local.localNumber)}
              subText={brandKit.local.subText}
              size="export"
            />
          </div>
        </div>
      }
    />
  );
}

export default function QuoteCardPage() {
  return (
    <Suspense
      fallback={
        <PageShell className="py-6 md:py-8 lg:py-10">
          <h1 className="text-3xl font-bold text-opseu-dark">Quote Card</h1>
        </PageShell>
      }
    >
      <QuoteCardPageContent />
    </Suspense>
  );
}
