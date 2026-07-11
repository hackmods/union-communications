"use client";

import { Suspense, useEffect, useRef } from "react";
import { useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { useBrandStore } from "@/store/brand-store";
import { useUndoRedo } from "@/hooks/use-undo-redo";
import { exportNodeAsPng } from "@/lib/export/image-export";
import { nodeToPdf } from "@/lib/export/pdf-export";
import { formatFilename, resolveLocalNumber } from "@/lib/utils";
import { getExamplePost } from "@/lib/constants/examples";
import { BrandLogo } from "@/components/brand/BrandLogo";
import { Button } from "@/components/ui/Button";
import { Input, Textarea } from "@/components/ui/Input";
import { Card } from "@/components/ui/Card";
import { UndoRedoBar } from "@/components/tools/UndoRedoBar";

interface FlyerState {
  message: string;
  date: string;
  time: string;
  location: string;
  primaryColor: string;
  accentColor: string;
}

function FlyerMakerPageContent() {
  const t = useTranslations("common");
  const tf = useTranslations("flyerMaker");
  const te = useTranslations("examples");
  const brandKit = useBrandStore((s) => s.brandKit);
  const canvasRef = useRef<HTMLDivElement>(null);
  const searchParams = useSearchParams();
  const seedApplied = useRef(false);

  const initial: FlyerState = {
    message: "PICKET LINE - ALL MEMBERS WELCOME",
    date: "Monday, March 15",
    time: "7:00 AM – 4:00 PM",
    location: "123 Main Street, Toronto",
    primaryColor: brandKit.primaryColor,
    accentColor: brandKit.accentColor,
  };

  const { state, setState, undo, redo, canUndo, canRedo, reset } =
    useUndoRedo<FlyerState>(initial);

  useEffect(() => {
    if (seedApplied.current) return;
    const exampleId = searchParams.get("example");
    if (!exampleId) return;
    const post = getExamplePost(exampleId);
    if (!post || post.primaryTool !== "flyer-maker") return;
    seedApplied.current = true;
    const detail = te.has(`posts.${post.id}.mockup.detail`)
      ? te(`posts.${post.id}.mockup.detail`)
      : "";
    setState((prev) => ({
      ...prev,
      message: te(`posts.${post.id}.mockup.headline`).toUpperCase(),
      location: te(`posts.${post.id}.mockup.body`),
      date: detail || prev.date,
      time: prev.time,
      primaryColor: brandKit.primaryColor,
      accentColor: brandKit.accentColor,
    }));
  }, [searchParams, setState, te, brandKit]);

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
      <h1 className="text-3xl font-bold text-opseu-dark">{tf("title")}</h1>
      <p className="mt-2 text-gray-600">{tf("subtitle")}</p>

      <div className="mt-8 grid gap-8 lg:grid-cols-2">
        <Card className="space-y-4">
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
            backgroundColor: state.primaryColor,
            color: "#FFFFFF",
          }}
        >
          <div>
            <BrandLogo size="md" onDark className="mb-3" />
            <p
              className="text-sm font-bold uppercase tracking-widest"
              style={{ color: state.accentColor }}
            >
              Local {resolveLocalNumber(brandKit.local.localNumber)}  - {" "}
              {brandKit.local.subText}
            </p>
          </div>
          <div className="text-center">
            <h2 className="text-3xl font-black uppercase leading-tight">
              {state.message}
            </h2>
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
    </div>
  );
}

export default function FlyerMakerPage() {
  return (
    <Suspense
      fallback={
        <div className="mx-auto max-w-5xl px-4 py-12">
          <h1 className="text-3xl font-bold text-opseu-dark">Flyer Maker</h1>
        </div>
      }
    >
      <FlyerMakerPageContent />
    </Suspense>
  );
}
