"use client";

import { useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { useBrandStore } from "@/store/brand-store";
import { isBrandThemeEstablished } from "@/lib/utils/brand-theme";
import { useOneShotBrandSeed } from "@/hooks/use-one-shot-brand-seed";
import { useUndoRedo } from "@/hooks/use-undo-redo";
import { useExportHandler } from "@/hooks/use-export-handler";
import { exportNodeAsPng } from "@/lib/export/image-export";
import { nodeToPdf } from "@/lib/export/pdf-export";
import { formatFilename, resolveLocalNumber } from "@/lib/utils";
import { Input, Textarea } from "@/components/ui/Input";
import { Card } from "@/components/ui/Card";
import { UndoRedoBar } from "@/components/tools/UndoRedoBar";
import { SourcesBlock } from "@/components/comms/SourcesBlock";
import { ToolEditorLayout } from "@/components/tools/ToolEditorLayout";
import { ToolFormDetails } from "@/components/tools/ToolFormDetails";
import { BrandSetupPrompt } from "@/components/tools/BrandSetupPrompt";
import { ToolRelatedFooter } from "@/components/tools/ToolRelatedFooter";
import { SegControl } from "@/components/tools/SegControl";
import { resolveCanvasTokens } from "@/lib/utils/canvas-tokens";
import { InviteEmailPanel } from "@/components/tools/InviteEmailPanel";
import { fieldsFromBoardNotice } from "@/lib/comms/event-email-from-notice";
import { ToolExportActions } from "@/components/tools/ToolExportActions";
import { CanvasBrandingControls } from "@/components/tools/CanvasBrandingControls";
import { BoardNoticeLayoutCanvas } from "@/components/tools/board-notice-layouts";
import type { BoardLogoMode } from "@/lib/constants/board-banner-ornaments";
import {
  INITIAL_LOGO_MODE,
  defaultLogoMode,
  defaultShowLocalNumber,
} from "@/lib/comms/canvas-logo-mode";
import {
  BOARD_NOTICE_FORMATS,
  boardNoticeExportPixelRatio,
  boardNoticePreviewHeightPx,
  type BoardNoticeFormatId,
} from "@/lib/comms/board-notice-formats";
import {
  BOARD_NOTICE_LAYOUT_ORDER,
  DEFAULT_BOARD_NOTICE_LAYOUT,
  type BoardNoticeLayoutId,
} from "@/lib/comms/board-notice-layouts";

type NoticeType = "meeting" | "bargaining" | "event" | "general";

interface BoardNoticeState {
  noticeType: NoticeType;
  headline: string;
  body: string;
  date: string;
  time: string;
  location: string;
  contact: string;
  quorumNeeded: string;
  layout: BoardNoticeLayoutId;
  logoMode: BoardLogoMode;
  showLocalNumber: boolean;
}

export default function BoardNoticePage() {
  const t = useTranslations("boardNotice");
  const tc = useTranslations("common");
  const ts = useTranslations("sources");
  const brandKit = useBrandStore((s) => s.brandKit);
  const onboardingComplete = useBrandStore((s) => s.onboardingComplete);
  const hydrated = useBrandStore((s) => s.hydrated);
  const themeEstablished = isBrandThemeEstablished(brandKit, onboardingComplete);
  const canvasRef = useRef<HTMLDivElement>(null);
  const [format, setFormat] = useState<BoardNoticeFormatId>("letter");

  const initial: BoardNoticeState = {
    noticeType: "meeting",
    headline: "GENERAL MEMBERSHIP MEETING",
    body: "All members are invited to attend. Agenda: bargaining update, steward reports, and Q&A.",
    date: "Wednesday, March 20",
    time: "5:30 PM",
    location: "Union office, Room S206",
    contact: "Questions? Email your steward or local executive.",
    quorumNeeded: "",
    layout: DEFAULT_BOARD_NOTICE_LAYOUT,
    logoMode: INITIAL_LOGO_MODE,
    showLocalNumber: defaultShowLocalNumber(),
  };

  const { state, setState, undo, redo, canUndo, canRedo, reset } =
    useUndoRedo<BoardNoticeState>(initial);
  const { exportError, exportSuccess, exporting, runExport } =
    useExportHandler();

  useOneShotBrandSeed(hydrated, () => {
    reset({
      ...initial,
      logoMode: defaultLogoMode(themeEstablished),
      showLocalNumber: defaultShowLocalNumber(),
    });
  });

  const formatSpec = BOARD_NOTICE_FORMATS[format];
  const designWidth = formatSpec.previewWidthPx;
  const designHeight = boardNoticePreviewHeightPx(formatSpec);
  const referenceWidth = BOARD_NOTICE_FORMATS.letter.previewWidthPx;
  const exportPixelRatio = boardNoticeExportPixelRatio(formatSpec);
  const tokens = resolveCanvasTokens(brandKit);
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

  const handleExportPng = async () => {
    if (!canvasRef.current) return;
    await runExport(async () => {
      await exportNodeAsPng(
        canvasRef.current!,
        formatFilename(`board-notice-${format}`, brandKit.local.localNumber, "png"),
        { pixelRatio: exportPixelRatio, backgroundColor: brandKit.primaryColor },
      );
    });
  };

  const handleExportPdf = async () => {
    if (!canvasRef.current) return;
    await runExport(async () => {
      await nodeToPdf(
        canvasRef.current!,
        formatFilename(`board-notice-${format}`, brandKit.local.localNumber, "pdf"),
        formatSpec.widthInches,
        formatSpec.heightInches,
        exportPixelRatio,
        brandKit.primaryColor,
      );
    });
  };

  return (
    <>
      <ToolEditorLayout
        title={t("title")}
        description={t("subtitle")}
        purposeHint={t("whenToUse")}
        toolbar={
          !themeEstablished ? (
            <BrandSetupPrompt themeEstablished={themeEstablished} />
          ) : undefined
        }
        exportError={exportError}
        exportSuccess={exportSuccess}
        previewAccessibleName={t("previewAccessibleName")}
        form={
          <Card density="compact" className="space-y-5">
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

            <ToolFormDetails title={tc("sectionLayout")}>
              <SegControl
                label={t("layout")}
                value={state.layout}
                options={BOARD_NOTICE_LAYOUT_ORDER.map((id) => ({
                  value: id,
                  label: t(`layouts.${id}`),
                }))}
                onChange={(layout) => setState({ ...state, layout })}
              />
              <SegControl
                label={t("format")}
                value={format}
                options={[
                  { value: "letter" as const, label: t("formatLetter") },
                  { value: "tabloid" as const, label: t("formatTabloid") },
                ]}
                onChange={setFormat}
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

            <UndoRedoBar
              canUndo={canUndo}
              canRedo={canRedo}
              onUndo={undo}
              onRedo={redo}
              onReset={() =>
                reset({
                  ...initial,
                  logoMode: themeEstablished ? "lockup" : "none",
                  showLocalNumber: defaultShowLocalNumber(),
                })
              }
            />
            <ToolExportActions
              exporting={exporting}
              onPng={() => void handleExportPng()}
              onPdf={() => void handleExportPdf()}
            />
          </Card>
        }
        previewActions={
          <ToolExportActions
            exporting={exporting}
            onPng={() => void handleExportPng()}
            onPdf={() => void handleExportPdf()}
          />
        }
        preview={
          <div className="mx-auto w-full max-w-full">
            <BoardNoticeLayoutCanvas
              canvasRef={canvasRef}
              layout={state.layout}
              tokens={tokens}
              colours={{
                primary: brandKit.primaryColor,
                secondary: brandKit.secondaryColor,
                accent: brandKit.accentColor,
              }}
              copy={{
                headline: state.headline,
                body: state.body,
                date: state.date,
                time: state.time,
                location: state.location,
                contact: state.contact,
                noticeTypeLabel: t(`types.${state.noticeType}`),
                dateLabel: t("date"),
                timeLabel: t("time"),
                locationLabel: t("location"),
                ...(state.noticeType === "meeting"
                  ? {
                      quorumNeeded: state.quorumNeeded,
                      quorumLabel: t("quorumNeeded"),
                    }
                  : {}),
              }}
              localNumber={brandKit.local.localNumber}
              subText={brandKit.local.subText}
              designWidthPx={designWidth}
              designHeightPx={designHeight}
              referenceWidthPx={referenceWidth}
              aspectClass={formatSpec.aspect}
              aspectRatio={`${formatSpec.widthInches} / ${formatSpec.heightInches}`}
              logoMode={state.logoMode}
              showLocalLabel={state.showLocalNumber}
            />
          </div>
        }
        footer={
          <div className="space-y-6">
            {showInviteEmail ? (
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
            ) : null}
            <SourcesBlock
              pageId="boardNotice"
              title={ts("title")}
              intro={ts("intro")}
            />
            <ToolRelatedFooter toolSlug="board-notice" />
          </div>
        }
      />
    </>
  );
}
