"use client";

import { useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { useBrandStore } from "@/store/brand-store";
import { useUndoRedo } from "@/hooks/use-undo-redo";
import { exportNodeAsPng } from "@/lib/export/image-export";
import { nodeToPdf } from "@/lib/export/pdf-export";
import { formatFilename, resolveLocalNumber } from "@/lib/utils";
import { Button } from "@/components/ui/Button";
import { Input, Textarea } from "@/components/ui/Input";
import { Card } from "@/components/ui/Card";
import { UndoRedoBar } from "@/components/tools/UndoRedoBar";
import { SourcesBlock } from "@/components/comms/SourcesBlock";
import { cn } from "@/lib/utils";

type NoticeType = "meeting" | "bargaining" | "event" | "general";
type PageFormat = "letter" | "tabloid";

interface BoardNoticeState {
  noticeType: NoticeType;
  headline: string;
  body: string;
  date: string;
  time: string;
  location: string;
  contact: string;
}

const FORMAT_DIMENSIONS: Record<
  PageFormat,
  { aspect: string; widthInches: number; heightInches: number }
> = {
  letter: { aspect: "aspect-[8.5/11]", widthInches: 8.5, heightInches: 11 },
  tabloid: { aspect: "aspect-[11/17]", widthInches: 11, heightInches: 17 },
};

export default function BoardNoticePage() {
  const t = useTranslations("boardNotice");
  const tc = useTranslations("common");
  const ts = useTranslations("sources");
  const brandKit = useBrandStore((s) => s.brandKit);
  const canvasRef = useRef<HTMLDivElement>(null);
  const [format, setFormat] = useState<PageFormat>("letter");

  const initial: BoardNoticeState = {
    noticeType: "meeting",
    headline: "GENERAL MEMBERSHIP MEETING",
    body: "All members are invited to attend. Agenda: bargaining update, steward reports, and Q&A.",
    date: "Wednesday, March 20",
    time: "5:30 PM",
    location: "Union office, Room S206",
    contact: "Questions? Email your steward or local executive.",
  };

  const { state, setState, undo, redo, canUndo, canRedo, reset } =
    useUndoRedo<BoardNoticeState>(initial);

  const dims = FORMAT_DIMENSIONS[format];
  const localLabel = `Local ${resolveLocalNumber(brandKit.local.localNumber)} — ${brandKit.local.subText}`;

  const handleExportPng = async () => {
    if (!canvasRef.current) return;
    await exportNodeAsPng(
      canvasRef.current,
      formatFilename(`board-notice-${format}`, brandKit.local.localNumber, "png"),
      { pixelRatio: 2 },
    );
  };

  const handleExportPdf = async () => {
    if (!canvasRef.current) return;
    await nodeToPdf(
      canvasRef.current,
      formatFilename(`board-notice-${format}`, brandKit.local.localNumber, "pdf"),
      dims.widthInches,
      dims.heightInches,
    );
  };

  return (
    <div className="mx-auto max-w-5xl px-4 py-12">
      <h1 className="text-3xl font-bold text-opseu-dark">{t("title")}</h1>
      <p className="mt-2 text-gray-600">{t("subtitle")}</p>

      <div className="mt-8 grid gap-8 lg:grid-cols-2">
        <Card className="space-y-4">
          <div>
            <label htmlFor="notice-type" className="mb-1 block text-sm font-medium">
              {t("noticeType")}
            </label>
            <select
              id="notice-type"
              value={state.noticeType}
              onChange={(e) =>
                setState({ ...state, noticeType: e.target.value as NoticeType })
              }
              className="w-full rounded-md border border-gray-300 px-3 py-2"
            >
              {(["meeting", "bargaining", "event", "general"] as const).map((type) => (
                <option key={type} value={type}>
                  {t(`types.${type}`)}
                </option>
              ))}
            </select>
          </div>
          <Input
            label={t("headline")}
            value={state.headline}
            onChange={(e) => setState({ ...state, headline: e.target.value })}
          />
          <Textarea
            label={t("body")}
            value={state.body}
            onChange={(e) => setState({ ...state, body: e.target.value })}
            rows={3}
          />
          <Input
            label={t("date")}
            value={state.date}
            onChange={(e) => setState({ ...state, date: e.target.value })}
          />
          <Input
            label={t("time")}
            value={state.time}
            onChange={(e) => setState({ ...state, time: e.target.value })}
          />
          <Input
            label={t("location")}
            value={state.location}
            onChange={(e) => setState({ ...state, location: e.target.value })}
          />
          <Input
            label={t("contact")}
            value={state.contact}
            onChange={(e) => setState({ ...state, contact: e.target.value })}
          />

          <div className="flex gap-2">
            {(["letter", "tabloid"] as const).map((f) => (
              <button
                key={f}
                type="button"
                onClick={() => setFormat(f)}
                className={cn(
                  "rounded-full px-4 py-1.5 text-sm font-medium transition-colors",
                  format === f
                    ? "bg-opseu-blue text-white"
                    : "bg-gray-100 text-gray-700 hover:bg-gray-200",
                )}
              >
                {t(f === "letter" ? "formatLetter" : "formatTabloid")}
              </button>
            ))}
          </div>

          <UndoRedoBar
            canUndo={canUndo}
            canRedo={canRedo}
            onUndo={undo}
            onRedo={redo}
            onReset={() => reset(initial)}
          />
          <div className="flex gap-3">
            <Button onClick={handleExportPng}>{tc("downloadPng")}</Button>
            <Button variant="outline" onClick={handleExportPdf}>
              {tc("downloadPdf")}
            </Button>
          </div>
        </Card>

        <div
          ref={canvasRef}
          className={cn(
            "flex w-full flex-col justify-between p-10 shadow-lg",
            dims.aspect,
          )}
          style={{
            backgroundColor: brandKit.primaryColor,
            color: "#FFFFFF",
          }}
        >
          <div>
            <p
              className="text-sm font-bold uppercase tracking-widest"
              style={{ color: brandKit.secondaryColor }}
            >
              {localLabel}
            </p>
            <p className="mt-2 text-xs uppercase opacity-80">
              {t(`types.${state.noticeType}`)}
            </p>
          </div>
          <div className="text-center">
            <h2 className="text-4xl font-black uppercase leading-tight md:text-5xl">
              {state.headline}
            </h2>
            <p className="mt-4 text-xl leading-relaxed">{state.body}</p>
          </div>
          <div className="space-y-2 text-xl">
            <p>
              <strong>{t("date")}:</strong> {state.date}
            </p>
            <p>
              <strong>{t("time")}:</strong> {state.time}
            </p>
            <p>
              <strong>{t("location")}:</strong> {state.location}
            </p>
            <p className="mt-4 text-base opacity-90">{state.contact}</p>
          </div>
        </div>
      </div>

      <SourcesBlock pageId="boardNotice" title={ts("title")} intro={ts("intro")} />
    </div>
  );
}
