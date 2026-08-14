"use client";

import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { useBrandStore } from "@/store/brand-store";
import { useUndoRedo } from "@/hooks/use-undo-redo";
import { useExportHandler } from "@/hooks/use-export-handler";
import { useOneShotBrandSeed } from "@/hooks/use-one-shot-brand-seed";
import { exportNodeAsPng } from "@/lib/export/image-export";
import { nodeToPdf } from "@/lib/export/pdf-export";
import { qrDataUrl } from "@/lib/export/qr";
import { formatFilename, resolveLocalNumber } from "@/lib/utils";
import { isBrandThemeEstablished } from "@/lib/utils/brand-theme";
import { BrandSetupPrompt } from "@/components/tools/BrandSetupPrompt";
import { listSavedLinks } from "@/lib/utils/local-links";
import {
  DEFAULT_QR_BOARD_FORMAT,
  QR_BOARD_FORMAT_ORDER,
  QR_BOARD_FORMATS,
  qrBoardExportPixelRatio,
  type QrBoardFormatId,
} from "@/lib/constants/qr-board-formats";
import {
  QR_BOARD_MAX_SLOTS,
  QR_BOARD_MIN_SLOTS,
  QR_BOARD_PRESETS,
  buildSlotsFromPreset,
  getQrBoardPreset,
  newQrBoardSlotId,
  type QrBoardSlotDraft,
} from "@/lib/constants/qr-board-presets";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Card } from "@/components/ui/Card";
import { ToolColourSection } from "@/components/tools/ToolColourSection";
import { UndoRedoBar } from "@/components/tools/UndoRedoBar";
import { ToolEditorLayout } from "@/components/tools/ToolEditorLayout";
import { ToolRelatedFooter } from "@/components/tools/ToolRelatedFooter";
import { ToolFormDetails } from "@/components/tools/ToolFormDetails";
import { SegControl } from "@/components/tools/SegControl";
import { QrBoardCanvas } from "@/components/tools/qr-board/QrBoardCanvas";
import { QrBoardSlotEditor } from "@/components/tools/qr-board/QrBoardSlotEditor";
import { resolveCanvasTokens } from "@/lib/utils/canvas-tokens";

interface QrBoardState {
  presetId: string;
  posterTitle: string;
  posterSubtitle: string;
  formatId: QrBoardFormatId;
  slots: QrBoardSlotDraft[];
  showUrl: boolean;
  includeBranding: boolean;
  primaryColor: string;
  secondaryColor: string;
}

function swapSlots(
  slots: QrBoardSlotDraft[],
  from: number,
  to: number,
): QrBoardSlotDraft[] {
  if (to < 0 || to >= slots.length) return slots;
  const next = [...slots];
  const tmp = next[from];
  next[from] = next[to];
  next[to] = tmp;
  return next;
}

export default function QrBoardPage() {
  const t = useTranslations("qrBoard");
  const tc = useTranslations("common");
  const brandKit = useBrandStore((s) => s.brandKit);
  const onboardingComplete = useBrandStore((s) => s.onboardingComplete);
  const hydrated = useBrandStore((s) => s.hydrated);
  const canvasRef = useRef<HTMLDivElement>(null);
  const [qrBySlot, setQrBySlot] = useState<Record<string, string | null>>({});

  const themeEstablished = isBrandThemeEstablished(brandKit, onboardingComplete);
  const first = QR_BOARD_PRESETS[0];

  const initial: QrBoardState = {
    presetId: first.id,
    posterTitle: "",
    posterSubtitle: "",
    formatId: DEFAULT_QR_BOARD_FORMAT,
    slots: [
      { id: "slot-a", title: "", destination: "" },
      { id: "slot-b", title: "", destination: "" },
    ],
    showUrl: true,
    includeBranding: false,
    primaryColor: brandKit.primaryColor,
    secondaryColor: brandKit.secondaryColor,
  };

  const { state, setState, undo, redo, canUndo, canRedo, reset } =
    useUndoRedo<QrBoardState>(initial);
  const { exportError, exportSuccess, exporting, runExport } = useExportHandler();

  const applyPreset = (id: string) => {
    const preset = getQrBoardPreset(id);
    if (!preset) return;
    const origin = typeof window !== "undefined" ? window.location.origin : "";
    setState({
      ...state,
      presetId: preset.id,
      posterTitle: t(`presets.${preset.titleKey}`),
      posterSubtitle: t(`presets.${preset.subtitleKey}`),
      slots: buildSlotsFromPreset(preset, brandKit, origin, (key) =>
        t(`slotTitles.${key}`),
      ),
    });
  };

  useOneShotBrandSeed(hydrated, () => {
    const origin = typeof window !== "undefined" ? window.location.origin : "";
    const deepPreset =
      typeof window !== "undefined"
        ? new URLSearchParams(window.location.search).get("preset")
        : null;
    const fromDeep =
      deepPreset && getQrBoardPreset(deepPreset)
        ? getQrBoardPreset(deepPreset)!
        : first;
    reset({
      presetId: fromDeep.id,
      posterTitle: t(`presets.${fromDeep.titleKey}`),
      posterSubtitle: t(`presets.${fromDeep.subtitleKey}`),
      formatId: DEFAULT_QR_BOARD_FORMAT,
      slots: buildSlotsFromPreset(fromDeep, brandKit, origin, (key) =>
        t(`slotTitles.${key}`),
      ),
      showUrl: true,
      includeBranding: themeEstablished,
      primaryColor: brandKit.primaryColor,
      secondaryColor: brandKit.secondaryColor,
    });
  });

  const format = QR_BOARD_FORMATS[state.formatId];
  const exportPixelRatio = qrBoardExportPixelRatio(format);
  const savedLinks = listSavedLinks(brandKit, {
    website: t("savedWebsite"),
    facebook: t("savedFacebook"),
  });

  useEffect(() => {
    let cancelled = false;
    const timer = window.setTimeout(() => {
      const tasks = state.slots.map(async (slot) => {
        const destination = slot.destination.trim();
        const url = destination
          ? await qrDataUrl(destination, { width: format.qrPixels })
          : null;
        return [slot.id, url] as const;
      });
      void Promise.all(tasks).then((entries) => {
        if (cancelled) return;
        const next: Record<string, string | null> = {};
        for (const [id, url] of entries) next[id] = url;
        setQrBySlot(next);
      });
    }, 250);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [state.slots, format.qrPixels]);

  const localLabel = brandKit.local.subText
    ? `Local ${resolveLocalNumber(brandKit.local.localNumber)} - ${brandKit.local.subText}`
    : `Local ${resolveLocalNumber(brandKit.local.localNumber)}`;

  const updateSlot = (index: number, patch: Partial<QrBoardSlotDraft>) => {
    const slots = state.slots.map((slot, i) =>
      i === index ? { ...slot, ...patch } : slot,
    );
    setState({ ...state, slots });
  };

  const addSlot = () => {
    if (state.slots.length >= QR_BOARD_MAX_SLOTS) return;
    setState({
      ...state,
      slots: [
        ...state.slots,
        { id: newQrBoardSlotId(), title: "", destination: "" },
      ],
    });
  };

  const removeSlot = (index: number) => {
    if (state.slots.length <= QR_BOARD_MIN_SLOTS) return;
    setState({
      ...state,
      slots: state.slots.filter((_, i) => i !== index),
    });
  };

  const handleExportPng = async () => {
    if (!canvasRef.current) return;
    await runExport(async () => {
      await exportNodeAsPng(
        canvasRef.current!,
        formatFilename(format.filenameStem, brandKit.local.localNumber, "png"),
        { pixelRatio: exportPixelRatio, backgroundColor: state.primaryColor },
      );
    });
  };

  const handleExportPdf = async () => {
    if (!canvasRef.current) return;
    await runExport(async () => {
      await nodeToPdf(
        canvasRef.current!,
        formatFilename(format.filenameStem, brandKit.local.localNumber, "pdf"),
        format.widthInches,
        format.heightInches,
        exportPixelRatio,
        state.primaryColor,
      );
    });
  };

  const canvasSlots = state.slots.map((slot) => ({
    ...slot,
    qrSrc: qrBySlot[slot.id] ?? null,
  }));

  return (
    <ToolEditorLayout
      title={t("title")}
      description={t("subtitle")}
      purposeHint={t("whenToUse")}
      previewAccessibleName={t("previewAccessibleName")}
      exportError={exportError}
      exportSuccess={exportSuccess}
      footer={<ToolRelatedFooter toolSlug="qr-board" />}
      toolbar={
        !themeEstablished && hydrated ? (
          <BrandSetupPrompt themeEstablished={themeEstablished} />
        ) : null
      }
      form={
        <Card density="compact" className="space-y-5">
          <section className="space-y-3">
            <div>
              <label
                htmlFor="qr-board-preset"
                className="mb-1.5 block text-sm font-medium text-gray-700"
              >
                {t("preset")}
              </label>
              <select
                id="qr-board-preset"
                value={state.presetId}
                onChange={(e) => applyPreset(e.target.value)}
                className="min-h-11 w-full rounded-md border border-gray-300 px-3 py-2"
              >
                {QR_BOARD_PRESETS.map((p) => (
                  <option key={p.id} value={p.id}>
                    {t(`presets.${p.labelKey}`)}
                  </option>
                ))}
              </select>
            </div>

            <Input
              label={t("posterTitle")}
              value={state.posterTitle}
              onChange={(e) =>
                setState({ ...state, posterTitle: e.target.value })
              }
            />
            <Input
              label={t("posterSubtitle")}
              value={state.posterSubtitle}
              onChange={(e) =>
                setState({ ...state, posterSubtitle: e.target.value })
              }
            />

            <div className="space-y-2">
              <SegControl
                label={t("format")}
                value={state.formatId}
                options={QR_BOARD_FORMAT_ORDER.map((id) => ({
                  value: id,
                  label: t(QR_BOARD_FORMATS[id].labelKey),
                }))}
                onChange={(formatId) => setState({ ...state, formatId })}
              />
              <p className="text-sm leading-snug text-gray-600">
                {t("formatTip")}
              </p>
            </div>
          </section>

          <section className="space-y-3 border-t border-gray-200 pt-5">
            <div className="flex items-center justify-between gap-2">
              <p className="text-sm font-semibold text-opseu-dark">
                {t("slots")}
              </p>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={addSlot}
                disabled={state.slots.length >= QR_BOARD_MAX_SLOTS}
              >
                {t("addSlot")}
              </Button>
            </div>
            <p className="text-sm leading-snug text-gray-600">
              {t("slotsHint", {
                min: QR_BOARD_MIN_SLOTS,
                max: QR_BOARD_MAX_SLOTS,
                count: state.slots.length,
              })}
            </p>
            {state.slots.map((slot, index) => (
              <QrBoardSlotEditor
                key={slot.id}
                index={index}
                title={slot.title}
                destination={slot.destination}
                canRemove={state.slots.length > QR_BOARD_MIN_SLOTS}
                canMoveUp={index > 0}
                canMoveDown={index < state.slots.length - 1}
                savedLinks={savedLinks}
                labels={{
                  slotLabel: t("slotLabel", { n: index + 1 }),
                  title: t("slotTitle"),
                  destination: t("destination"),
                  savedLinks: t("savedLinks"),
                  savedLinksPlaceholder: t("savedLinksPlaceholder"),
                  moveUp: t("moveUp"),
                  moveDown: t("moveDown"),
                  remove: tc("remove"),
                }}
                onTitleChange={(value) => updateSlot(index, { title: value })}
                onDestinationChange={(value) =>
                  updateSlot(index, { destination: value })
                }
                onMoveUp={() =>
                  setState({
                    ...state,
                    slots: swapSlots(state.slots, index, index - 1),
                  })
                }
                onMoveDown={() =>
                  setState({
                    ...state,
                    slots: swapSlots(state.slots, index, index + 1),
                  })
                }
                onRemove={() => removeSlot(index)}
              />
            ))}
          </section>

          <ToolFormDetails title={t("sectionOptions")}>
            <label className="flex min-h-11 items-center gap-2.5 text-sm text-opseu-dark">
              <input
                type="checkbox"
                checked={state.showUrl}
                onChange={(e) =>
                  setState({ ...state, showUrl: e.target.checked })
                }
                className="size-4"
              />
              {t("showUrl")}
            </label>
            <label className="flex min-h-11 items-center gap-2.5 text-sm text-opseu-dark">
              <input
                type="checkbox"
                checked={state.includeBranding}
                onChange={(e) =>
                  setState({ ...state, includeBranding: e.target.checked })
                }
                className="size-4"
              />
              {t("includeBranding")}
            </label>
          </ToolFormDetails>

          <ToolColourSection
            title={t("sectionColours")}
            primaryColor={state.primaryColor}
            secondaryColor={state.secondaryColor}
            onPrimaryChange={(primaryColor) =>
              setState({ ...state, primaryColor })
            }
            onSecondaryChange={(secondaryColor) =>
              setState({ ...state, secondaryColor })
            }
          />

          <div className="space-y-3 border-t border-gray-200 pt-5">
            <UndoRedoBar
              onUndo={undo}
              onRedo={redo}
              canUndo={canUndo}
              canRedo={canRedo}
              onReset={() => {
                const origin =
                  typeof window !== "undefined" ? window.location.origin : "";
                reset({
                  presetId: first.id,
                  posterTitle: t(`presets.${first.titleKey}`),
                  posterSubtitle: t(`presets.${first.subtitleKey}`),
                  formatId: DEFAULT_QR_BOARD_FORMAT,
                  slots: buildSlotsFromPreset(first, brandKit, origin, (key) =>
                    t(`slotTitles.${key}`),
                  ),
                  showUrl: true,
                  includeBranding: themeEstablished,
                  primaryColor: brandKit.primaryColor,
                  secondaryColor: brandKit.secondaryColor,
                });
              }}
            />

            <div className="flex flex-wrap gap-3">
              <Button
                type="button"
                onClick={() => void handleExportPng()}
                disabled={exporting}
              >
                {exporting ? tc("exporting") : tc("downloadPng")}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => void handleExportPdf()}
                disabled={exporting}
              >
                {tc("downloadPdf")}
              </Button>
            </div>
          </div>
        </Card>
      }
      previewActions={
        <>
          <Button
            type="button"
            onClick={() => void handleExportPng()}
            disabled={exporting}
          >
            {exporting ? tc("exporting") : tc("downloadPng")}
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => void handleExportPdf()}
            disabled={exporting}
          >
            {tc("downloadPdf")}
          </Button>
        </>
      }
      preview={
        <>
          <div className="inline-block rounded-lg shadow-lg">
            <QrBoardCanvas
              canvasRef={canvasRef}
              formatId={state.formatId}
              posterTitle={state.posterTitle}
              posterSubtitle={state.posterSubtitle}
              slots={canvasSlots}
              showUrl={state.showUrl}
              includeBranding={state.includeBranding}
              primaryColor={state.primaryColor}
              secondaryColor={state.secondaryColor}
              localLabel={localLabel}
              qrPlaceholder={t("qrPlaceholder")}
              tokens={resolveCanvasTokens(brandKit)}
            />
          </div>
          <p className="mt-3 text-sm text-gray-500">
            {t("previewSize", {
              label: t(format.labelKey),
              width: format.widthInches,
              height: format.heightInches,
            })}
          </p>
        </>
      }
    />
  );
}
