"use client";

import { useRef } from "react";
import { useBrandStore } from "@/store/brand-store";
import { useUndoRedo } from "@/hooks/use-undo-redo";
import { exportNodeAsPng, exportNodeAsSvg } from "@/lib/export/image-export";
import { formatFilename, resolveLocalNumber } from "@/lib/utils";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Card } from "@/components/ui/Card";
import { ThemePicker } from "@/components/tools/ThemePicker";
import { UndoRedoBar } from "@/components/tools/UndoRedoBar";
import { useTranslations } from "next-intl";
import Image from "next/image";

interface LogoState {
  localNumber: string;
  subText: string;
  primaryColor: string;
  secondaryColor: string;
}

export default function LogoBuilderPage() {
  const t = useTranslations("common");
  const brandKit = useBrandStore((s) => s.brandKit);
  const canvasRef = useRef<HTMLDivElement>(null);

  const initial: LogoState = {
    localNumber: brandKit.local.localNumber,
    subText: brandKit.local.subText || "Support Staff",
    primaryColor: brandKit.primaryColor,
    secondaryColor: brandKit.secondaryColor,
  };

  const { state, setState, undo, redo, canUndo, canRedo, reset } =
    useUndoRedo<LogoState>(initial);

  const handleExportPng = async () => {
    if (!canvasRef.current) return;
    await exportNodeAsPng(
      canvasRef.current,
      formatFilename("local-logo", state.localNumber, "png"),
      { pixelRatio: 3 },
    );
  };

  const handleExportSvg = async () => {
    if (!canvasRef.current) return;
    await exportNodeAsSvg(
      canvasRef.current,
      formatFilename("local-logo", state.localNumber, "svg"),
    );
  };

  return (
    <div className="mx-auto max-w-5xl px-4 py-12">
      <h1 className="text-3xl font-bold text-opseu-dark">Local Logo Builder</h1>

      <div className="mt-8 grid gap-8 lg:grid-cols-2">
        <Card className="space-y-4">
          <Input
            label="Local number"
            value={state.localNumber}
            onChange={(e) => setState({ ...state, localNumber: e.target.value })}
          />
          <Input
            label="Sub-text"
            value={state.subText}
            onChange={(e) => setState({ ...state, subText: e.target.value })}
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
          <div className="flex gap-3">
            <Button onClick={handleExportPng}>{t("downloadPng")}</Button>
            <Button variant="outline" onClick={handleExportSvg}>
              {t("downloadSvg")}
            </Button>
          </div>
        </Card>

        <div className="flex items-center justify-center">
          <div
            ref={canvasRef}
            className="flex h-80 w-80 flex-col items-center justify-center rounded-full shadow-lg"
            style={{ backgroundColor: state.primaryColor }}
          >
            {brandKit.useOfficialLogo ? (
              <Image
                src="/assets/caat-opseu/logo-primary.svg"
                alt=""
                width={100}
                height={100}
                className="mb-2"
              />
            ) : brandKit.customLogoDataUrl ? (
              <img
                src={brandKit.customLogoDataUrl}
                alt=""
                className="mb-2 h-24 w-24 object-contain"
              />
            ) : null}
            <p
              className="text-4xl font-bold"
              style={{ color: state.secondaryColor }}
            >
              Local {resolveLocalNumber(state.localNumber)}
            </p>
            <p className="mt-1 text-lg text-white">{state.subText}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
