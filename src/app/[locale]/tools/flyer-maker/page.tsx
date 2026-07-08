"use client";

import { useRef } from "react";
import { useBrandStore } from "@/store/brand-store";
import { useUndoRedo } from "@/hooks/use-undo-redo";
import { exportNodeAsPng } from "@/lib/export/image-export";
import { nodeToPdf } from "@/lib/export/pdf-export";
import { formatFilename, resolveLocalNumber } from "@/lib/utils";
import { Button } from "@/components/ui/Button";
import { Input, Textarea } from "@/components/ui/Input";
import { Card } from "@/components/ui/Card";
import { UndoRedoBar } from "@/components/tools/UndoRedoBar";
import { useTranslations } from "next-intl";

interface FlyerState {
  message: string;
  date: string;
  time: string;
  location: string;
}

export default function FlyerMakerPage() {
  const t = useTranslations("common");
  const brandKit = useBrandStore((s) => s.brandKit);
  const canvasRef = useRef<HTMLDivElement>(null);

  const initial: FlyerState = {
    message: "PICKET LINE — ALL MEMBERS WELCOME",
    date: "Monday, March 15",
    time: "7:00 AM – 4:00 PM",
    location: "123 Main Street, Toronto",
  };

  const { state, setState, undo, redo, canUndo, canRedo, reset } =
    useUndoRedo<FlyerState>(initial);

  const handleExportPng = async () => {
    if (!canvasRef.current) return;
    await exportNodeAsPng(
      canvasRef.current,
      formatFilename("flyer", brandKit.local.localNumber, "png"),
      { pixelRatio: 2 },
    );
  };

  const handleExportPdf = async () => {
    if (!canvasRef.current) return;
    await nodeToPdf(
      canvasRef.current,
      formatFilename("flyer", brandKit.local.localNumber, "pdf"),
    );
  };

  return (
    <div className="mx-auto max-w-5xl px-4 py-12">
      <h1 className="text-3xl font-bold text-opseu-dark">Picket / Rally Flyer Maker</h1>
      <p className="mt-2 text-gray-600">
        High-contrast templates for social media and printing.
      </p>

      <div className="mt-8 grid gap-8 lg:grid-cols-2">
        <Card className="space-y-4">
          <Textarea
            label="Main message"
            value={state.message}
            onChange={(e) => setState({ ...state, message: e.target.value })}
            rows={2}
          />
          <Input
            label="Date"
            value={state.date}
            onChange={(e) => setState({ ...state, date: e.target.value })}
          />
          <Input
            label="Time"
            value={state.time}
            onChange={(e) => setState({ ...state, time: e.target.value })}
          />
          <Input
            label="Location"
            value={state.location}
            onChange={(e) => setState({ ...state, location: e.target.value })}
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
            <Button variant="outline" onClick={handleExportPdf}>
              {t("downloadPdf")}
            </Button>
          </div>
        </Card>

        <div
          ref={canvasRef}
          className="flex aspect-[8.5/11] w-full flex-col justify-between p-10 shadow-lg"
          style={{
            backgroundColor: "#000000",
            color: "#FFFFFF",
          }}
        >
          <div>
            <p
              className="text-sm font-bold uppercase tracking-widest"
              style={{ color: brandKit.secondaryColor }}
            >
              Local {resolveLocalNumber(brandKit.local.localNumber)} — {brandKit.local.subText}
            </p>
          </div>
          <div className="text-center">
            <h2 className="text-3xl font-black uppercase leading-tight">
              {state.message}
            </h2>
          </div>
          <div className="space-y-2 text-lg">
            <p>
              <strong>Date:</strong> {state.date}
            </p>
            <p>
              <strong>Time:</strong> {state.time}
            </p>
            <p>
              <strong>Location:</strong> {state.location}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
