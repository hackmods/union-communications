"use client";

import { useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { useBrandStore } from "@/store/brand-store";
import { useUndoRedo } from "@/hooks/use-undo-redo";
import { useExportHandler } from "@/hooks/use-export-handler";
import { exportNodeAsPng } from "@/lib/export/image-export";
import { nodeToPdf } from "@/lib/export/pdf-export";
import { formatFilename, resolveLocalNumber } from "@/lib/utils";
import { Button } from "@/components/ui/Button";
import { Input, Textarea } from "@/components/ui/Input";
import { Card } from "@/components/ui/Card";
import { UndoRedoBar } from "@/components/tools/UndoRedoBar";
import { SourcesBlock } from "@/components/comms/SourcesBlock";
import { ToolEditorLayout } from "@/components/tools/ToolEditorLayout";
import { SegControl } from "@/components/tools/SegControl";
import { cn } from "@/lib/utils";
import { inkWithAlpha, pickContrastingInk } from "@/lib/utils/ink";
import { meetsWcagAA } from "@/lib/utils/contrast";
import { PageShell } from "@/components/layout/PageShell";
import { InviteEmailPanel } from "@/components/tools/InviteEmailPanel";
import { fieldsFromBoardNotice } from "@/lib/comms/event-email-from-notice";

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
  quorumNeeded: string;
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
    quorumNeeded: "",
  };

  const { state, setState, undo, redo, canUndo, canRedo, reset } =
    useUndoRedo<BoardNoticeState>(initial);
  const { exportError, exporting, runExport } = useExportHandler();

  const dims = FORMAT_DIMENSIONS[format];
  const localLabel = `Local ${resolveLocalNumber(brandKit.local.localNumber)} - ${brandKit.local.subText}`;
  const canvasInk = pickContrastingInk(brandKit.primaryColor);
  const showInviteEmail =
    state.noticeType === "meeting" || state.noticeType === "event";
  const inviteFields = fieldsFromBoardNotice({
    headline: state.headline,
    date: state.date,
    time: state.time,
    location: state.location,
    contact: state.contact,
    ...(state.noticeType === "meeting"
      ? { quorumNeeded: state.quorumNeeded }
      : {}),
  });

  const leadColor = meetsWcagAA(
    brandKit.secondaryColor,
    brandKit.primaryColor,
    true,
  )
    ? brandKit.secondaryColor
    : canvasInk;

  const handleExportPng = async () => {
    if (!canvasRef.current) return;
    await runExport(async () => {
      await exportNodeAsPng(
        canvasRef.current!,
        formatFilename(`board-notice-${format}`, brandKit.local.localNumber, "png"),
        { pixelRatio: 2, backgroundColor: brandKit.primaryColor },
      );
    });
  };

  const handleExportPdf = async () => {
    if (!canvasRef.current) return;
    await runExport(async () => {
      await nodeToPdf(
        canvasRef.current!,
        formatFilename(`board-notice-${format}`, brandKit.local.localNumber, "pdf"),
        dims.widthInches,
        dims.heightInches,
        2,
        brandKit.primaryColor,
      );
    });
  };

  return (
    <>
      <ToolEditorLayout
        title={t("title")}
        description={t("subtitle")}
        exportError={exportError}
        form={
          <Card density="compact" className="space-y-3">
            <div>
              <label
                htmlFor="notice-type"
                className="mb-1 block text-sm font-medium"
              >
                {t("noticeType")}
              </label>
              <select
                id="notice-type"
                value={state.noticeType}
                onChange={(e) =>
                  setState({
                    ...state,
                    noticeType: e.target.value as NoticeType,
                  })
                }
                className="min-h-11 w-full rounded-md border border-gray-300 px-3 py-2"
              >
                {(
                  ["meeting", "bargaining", "event", "general"] as const
                ).map((type) => (
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
            {state.noticeType === "meeting" ? (
              <Input
                label={t("quorumNeeded")}
                value={state.quorumNeeded}
                onChange={(e) =>
                  setState({ ...state, quorumNeeded: e.target.value })
                }
              />
            ) : null}

            <SegControl
              label={t("format")}
              value={format}
              options={[
                { value: "letter" as const, label: t("formatLetter") },
                { value: "tabloid" as const, label: t("formatTabloid") },
              ]}
              onChange={setFormat}
            />

            <UndoRedoBar
              canUndo={canUndo}
              canRedo={canRedo}
              onUndo={undo}
              onRedo={redo}
              onReset={() => reset(initial)}
            />
            <div className="flex gap-3">
              <Button onClick={handleExportPng} disabled={exporting}>
                {exporting ? tc("exporting") : tc("downloadPng")}
              </Button>
              <Button
                variant="outline"
                onClick={handleExportPdf}
                disabled={exporting}
              >
                {tc("downloadPdf")}
              </Button>
            </div>
          </Card>
        }
        previewActions={
          <>
            <Button onClick={handleExportPng} disabled={exporting}>
              {exporting ? tc("exporting") : tc("downloadPng")}
            </Button>
            <Button
              variant="outline"
              onClick={handleExportPdf}
              disabled={exporting}
            >
              {tc("downloadPdf")}
            </Button>
          </>
        }
        preview={
          <div className="shadow-lg">
            <div
              ref={canvasRef}
              className={cn(
                "flex w-full flex-col justify-between p-4 md:p-6",
                dims.aspect,
              )}
              style={{
                backgroundColor: brandKit.primaryColor,
                color: canvasInk,
              }}
            >
              <div>
                <p
                  className="text-sm font-bold uppercase tracking-widest"
                  style={{ color: leadColor }}
                >
                  {localLabel}
                </p>
                <p
                  className="mt-2 text-xs uppercase"
                  style={{ color: inkWithAlpha(canvasInk, 0.8) }}
                >
                  {t(`types.${state.noticeType}`)}
                </p>
              </div>
              <div className="text-center">
                <h2
                  className="text-4xl font-black uppercase leading-tight md:text-5xl"
                  style={{ color: canvasInk }}
                >
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
                <p
                  className="mt-4 text-base"
                  style={{ color: inkWithAlpha(canvasInk, 0.9) }}
                >
                  {state.contact}
                </p>
              </div>
            </div>
          </div>
        }
      />
      {showInviteEmail ? (
        <PageShell className="pb-4">
          <InviteEmailPanel
            fields={inviteFields}
            localNumber={resolveLocalNumber(brandKit.local.localNumber)}
            messagesNamespace="boardNotice"
            footerExtra={
              <p className="text-sm text-gray-600">
                {t("inviteEmail.eventPackPrompt")}{" "}
                <Link
                  href="/tools/document-generator"
                  className="font-medium text-opseu-blue underline"
                >
                  {t("inviteEmail.eventPackLink")}
                </Link>
              </p>
            }
          />
        </PageShell>
      ) : null}
      <PageShell className="pb-8">
        <SourcesBlock
          pageId="boardNotice"
          title={ts("title")}
          intro={ts("intro")}
        />
      </PageShell>
    </>
  );
}
