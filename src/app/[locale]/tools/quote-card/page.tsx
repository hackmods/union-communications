"use client";

import { useRef } from "react";
import { useBrandStore } from "@/store/brand-store";
import { useUndoRedo } from "@/hooks/use-undo-redo";
import { exportNodeAsPng } from "@/lib/export/image-export";
import { formatFilename, resolveLocalNumber } from "@/lib/utils";
import { Button } from "@/components/ui/Button";
import { Input, Textarea } from "@/components/ui/Input";
import { Card } from "@/components/ui/Card";
import { ThemePicker } from "@/components/tools/ThemePicker";
import { UndoRedoBar } from "@/components/tools/UndoRedoBar";
import { useTranslations } from "next-intl";

interface QuoteState {
  quote: string;
  author: string;
  primaryColor: string;
  secondaryColor: string;
}

export default function QuoteCardPage() {
  const t = useTranslations("common");
  const brandKit = useBrandStore((s) => s.brandKit);
  const canvasRef = useRef<HTMLDivElement>(null);

  const initial: QuoteState = {
    quote: "We will not accept anything less than a fair deal for our members.",
    author: "Local President",
    primaryColor: brandKit.primaryColor,
    secondaryColor: brandKit.secondaryColor,
  };

  const { state, setState, undo, redo, canUndo, canRedo, reset } =
    useUndoRedo<QuoteState>(initial);

  const handleExport = async () => {
    if (!canvasRef.current) return;
    await exportNodeAsPng(
      canvasRef.current,
      formatFilename("quote-card", brandKit.local.localNumber, "png"),
      { pixelRatio: 2 },
    );
  };

  return (
    <div className="mx-auto max-w-5xl px-4 py-12">
      <h1 className="text-3xl font-bold text-opseu-dark">Quote Card Generator</h1>

      <div className="mt-8 grid gap-8 lg:grid-cols-2">
        <Card className="space-y-4">
          <Textarea
            label="Quote"
            value={state.quote}
            onChange={(e) => setState({ ...state, quote: e.target.value })}
            rows={4}
          />
          <Input
            label="Author"
            value={state.author}
            onChange={(e) => setState({ ...state, author: e.target.value })}
          />
          <ThemePicker
            primaryColor={state.primaryColor}
            secondaryColor={state.secondaryColor}
            onPrimaryChange={(c) => setState({ ...state, primaryColor: c })}
            onSecondaryChange={(c) => setState({ ...state, secondaryColor: c })}
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
          className="flex aspect-square w-full flex-col items-center justify-center p-12 text-center shadow-lg"
          style={{ backgroundColor: state.primaryColor }}
        >
          <span
            className="text-6xl leading-none"
            style={{ color: state.secondaryColor }}
            aria-hidden="true"
          >
            &ldquo;
          </span>
          <p className="mt-4 text-xl font-medium leading-relaxed text-white">
            {state.quote}
          </p>
          <p className="mt-6 text-lg font-bold" style={{ color: state.secondaryColor }}>
            — {state.author}
          </p>
          <p className="mt-4 text-sm text-white/70">
            Local {resolveLocalNumber(brandKit.local.localNumber)}
          </p>
        </div>
      </div>
    </div>
  );
}
