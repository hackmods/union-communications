"use client";

import { Suspense, useEffect, useState, useTransition } from "react";
import { useSearchParams } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { ToolLoadingFallback } from "@/components/tools/ToolLoadingFallback";
import { CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input, Textarea } from "@/components/ui/Input";
import { Checkbox } from "@/components/ui/Checkbox";
import { UndoRedoBar } from "@/components/tools/UndoRedoBar";
import { ToolFormDetails } from "@/components/tools/ToolFormDetails";
import { ToolEditorLayout } from "@/components/tools/ToolEditorLayout";
import { SegControl } from "@/components/tools/SegControl";
import { DesignTreatmentControl } from "@/components/tools/DesignTreatmentControl";
import { useUndoRedo } from "@/hooks/use-undo-redo";
import { useBrandStore } from "@/store/brand-store";
import {
  OFFICE_PRESETS,
  brandPalette,
  getPreset,
  type OfficePresetId,
} from "@/lib/constants/office-templates";
import {
  listSavedLinks,
  resolvePresetDestination,
} from "@/lib/utils/local-links";
import {
  EVENT_RSVP_XLSX_LABELS,
  type GrievanceIntakeLabels,
  type SeniorityWorksheetLabels,
} from "@/lib/export/office-export";
import { renderEventIcsBlob } from "@/lib/calendar/event-ics";
import { downloadBlob } from "@/lib/export/image-export";
import {
  BrandLogoResolveError,
  requireBrandLogoBytes,
  resolveBrandLogoBytes,
} from "@/lib/export/brand-logo-bytes";
import { isBrandThemeEstablished } from "@/lib/utils/brand-theme";
import { formatFilename, resolveLocalNumber } from "@/lib/utils";
import { InviteEmailPanel } from "@/components/tools/InviteEmailPanel";
import { BrandSetupPrompt } from "@/components/tools/BrandSetupPrompt";
import { ToolRelatedFooter } from "@/components/tools/ToolRelatedFooter";
import type { BrandLogoBytes } from "@/lib/export/brand-logo-bytes";
import { useExportHandler } from "@/hooks/use-export-handler";
import { useOneShotBrandSeed } from "@/hooks/use-one-shot-brand-seed";
import { resolveCanvasTokens } from "@/lib/utils/canvas-tokens";
import { canvasFontOfficeName } from "@/lib/comms/canvas-fonts";
import { officeBandColor } from "@/lib/export/office-brand-styles";
import {
  OfficeExampleTile,
  OfficePresetMock,
} from "@/components/tools/OfficePresetMock";
import { Link } from "@/i18n/navigation";
import { resolveOfficePresetFromQuery } from "@/lib/constants/document-generator-links";
import {
  LETTER_PRESET_IDS,
  SALUTATION_PRESET_IDS,
  isLetterPreset,
  saveDocumentGeneratorDraft,
} from "@/lib/comms/document-generator-draft";
import { consumeLetterHandoff } from "@/lib/comms/letter-contexts";
import { guideCtaOutlineClassSm } from "@/components/comms/guideCtaClasses";
import {
  applyGeneratorPreset,
  buildLetterQrBytes,
  createInitialGeneratorState,
  docxPrintChrome,
  hydrateGeneratorState,
  type GeneratorState,
} from "@/lib/comms/document-generator-state";
import { Callout } from "@/components/ui/Callout";

export type { GeneratorState };

export type DocumentGeneratorVariant = "full" | "letters";

export type DocumentGeneratorEditorProps = {
  variant?: DocumentGeneratorVariant;
};

export function DocumentGeneratorEditor({
  variant = "full",
}: DocumentGeneratorEditorProps) {
  return (
    <Suspense fallback={<ToolLoadingFallback />}>
      <DocumentGeneratorEditorContent variant={variant} />
    </Suspense>
  );
}

function DocumentGeneratorEditorContent({
  variant,
}: {
  variant: DocumentGeneratorVariant;
}) {
  const t = useTranslations("documentGenerator");
  const tLetters = useTranslations("letterGenerator");
  const tc = useTranslations("common");
  const locale = useLocale();
  const searchParams = useSearchParams();
  const lettersOnly = variant === "letters";
  const [initialPreset] = useState<OfficePresetId>(() => {
    const fromQuery = resolveOfficePresetFromQuery(searchParams.get("preset"));
    if (lettersOnly && !isLetterPreset(fromQuery)) return "simple-letter";
    return fromQuery;
  });
  const brandKit = useBrandStore((s) => s.brandKit);
  const hydrated = useBrandStore((s) => s.hydrated);
  const onboardingComplete = useBrandStore((s) => s.onboardingComplete);
  const themeEstablished = isBrandThemeEstablished(
    brandKit,
    onboardingComplete,
  );

  const { state, setState, undo, redo, canUndo, canRedo, reset } =
    useUndoRedo<GeneratorState>(createInitialGeneratorState(initialPreset));
  const [draftHydrated, setDraftHydrated] = useState(false);
  const [, startTransition] = useTransition();
  const { exportError: error, exportSuccess: success, exporting: busy, runExport } = useExportHandler();
  const [logoPreviewSrc, setLogoPreviewSrc] = useState<string | null>(null);
  const [qrPreviewSrc, setQrPreviewSrc] = useState<string | null>(null);
  const [draftSaveFailed, setDraftSaveFailed] = useState(false);

  useEffect(() => {
    if (!hydrated || draftHydrated) return;
    startTransition(() => {
      let next = hydrateGeneratorState(initialPreset, brandKit, {
        allowedPresets: lettersOnly ? LETTER_PRESET_IDS : undefined,
      });
      if (lettersOnly) {
        const handoff = consumeLetterHandoff();
        if (handoff) {
          next = {
            ...next,
            fields: {
              ...next.fields,
              ...handoff.fields,
            },
          };
        }
      }
      setState(next);
      setDraftHydrated(true);
    });
  }, [hydrated, draftHydrated, brandKit, initialPreset, lettersOnly, setState, startTransition]);

  useEffect(() => {
    if (!draftHydrated) return;
    const timer = window.setTimeout(() => {
      const ok = saveDocumentGeneratorDraft(state);
      startTransition(() => setDraftSaveFailed(!ok));
    }, 400);
    return () => window.clearTimeout(timer);
  }, [state, draftHydrated, startTransition]);

  useOneShotBrandSeed(hydrated, () => {
    if (themeEstablished) {
      setState((prev) => ({ ...prev, includeLogo: true }));
    }
  });

  const preset = getPreset(state.presetId);
  const palette = brandPalette(brandKit);
  const savedLinks = listSavedLinks(brandKit);
  const letterMode = isLetterPreset(state.presetId);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      if (!state.includeLogo) {
        setLogoPreviewSrc(null);
        return;
      }
      const logo = await resolveBrandLogoBytes(brandKit, {
        includeLogo: true,
        backgroundColor: officeBandColor(palette.primary, state.treatment),
      });
      if (!cancelled) setLogoPreviewSrc(logo?.src ?? null);
    })();
    return () => {
      cancelled = true;
    };
  }, [brandKit, state.includeLogo, palette.primary, state.treatment]);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      if (!letterMode || !state.showQr || savedLinks.length === 0) {
        setQrPreviewSrc(null);
        return;
      }
      const built = await buildLetterQrBytes(brandKit, state);
      if (!cancelled) setQrPreviewSrc(built?.qr.src ?? null);
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- draft fields change via state
  }, [brandKit, letterMode, state.showQr, state.qrLinkId, savedLinks.length]);

  const canvasTokens = resolveCanvasTokens(
    state.typeScaleOverride === "inherit"
      ? brandKit
      : {
          ...brandKit,
          canvas: { ...brandKit.canvas, typeScale: state.typeScaleOverride },
        },
  );
  const officeHeadlineFont = canvasFontOfficeName(canvasTokens.headlineFontId);
  const officeBodyFont = canvasFontOfficeName(canvasTokens.bodyFontId);
  const localNumber = brandKit.local.localNumber;
  const localLabel = `Local ${resolveLocalNumber(localNumber)}`;
  const printChrome = docxPrintChrome(state);

  const fields: Record<string, string> = {
    ...state.fields,
    contactName: state.fields.contactName ?? "",
  };

  const showInviteEmail = preset.outputs.email;

  function officeFontOpts() {
    return {
      treatment: state.treatment ?? "full",
      headlineFont: officeHeadlineFont,
      bodyFont: officeBodyFont,
      headlineFontId: canvasTokens.headlineFontId,
      bodyFontId: canvasTokens.bodyFontId,
      ...printChrome,
    };
  }

  async function letterQrOpts(): Promise<{
    qr?: BrandLogoBytes | null;
    qrCaption?: string;
  }> {
    if (!letterMode) return {};
    const built = await buildLetterQrBytes(brandKit, state);
    if (!built) return {};
    return { qr: built.qr, qrCaption: built.caption };
  }

  function rsvpXlsxLabels() {
    return locale.startsWith("fr")
      ? EVENT_RSVP_XLSX_LABELS.fr
      : EVENT_RSVP_XLSX_LABELS.en;
  }

  function worksheetDocxExtras() {
    const local = resolveLocalNumber(localNumber);
    if (state.presetId === "seniority-worksheet") {
      return {
        localNumber: local,
        seniorityLabels: seniorityLabels(),
      };
    }
    if (state.presetId === "grievance-intake") {
      return {
        localNumber: local,
        grievanceLabels: grievanceIntakeLabels(),
      };
    }
    return {};
  }

  function seniorityLabels(): SeniorityWorksheetLabels {
    return {
      sheetName: t("senioritySheet.sheetName"),
      title: t("senioritySheet.title"),
      local: t("senioritySheet.local"),
      sessionDate: t("fields.sessionDate"),
      chair: t("fields.chair"),
      caseId: t("fields.caseId"),
      notes: t("fields.committeeNotes"),
      disclaimer: t("senioritySheet.disclaimer"),
      columns: t.raw("senioritySheet.columns") as string[],
      footerDecision: t("senioritySheet.footerDecision"),
    };
  }

  function grievanceIntakeLabels(): GrievanceIntakeLabels {
    return {
      sheetName: t("grievanceIntakeSheet.sheetName"),
      title: t("grievanceIntakeSheet.title"),
      local: t("grievanceIntakeSheet.local"),
      incidentDate: t("fields.incidentDate"),
      caArticle: t("fields.caArticle"),
      itemCol: t("grievanceIntakeSheet.itemCol"),
      notesCol: t("grievanceIntakeSheet.notesCol"),
      witnesses: t("fields.witnesses"),
      clockNotes: t("fields.clockNotes"),
      disclaimer: t("grievanceIntakeSheet.disclaimer"),
      rows: {
        who: t("fields.who"),
        what: t("fields.what"),
        where: t("fields.where"),
        when: t("fields.when"),
        why: t("fields.why"),
        want: t("fields.want"),
      },
    };
  }

  function applyPreset(id: OfficePresetId) {
    const origin =
      typeof window !== "undefined" ? window.location.origin : "";
    setState((prev) =>
      applyGeneratorPreset(
        prev,
        id,
        brandKit,
        origin,
        (kit, o) =>
          resolvePresetDestination("membership-primary", kit, o) || "",
      ),
    );
  }

  function setField(key: string, value: string) {
    setState({
      ...state,
      fields: { ...state.fields, [key]: value },
    });
  }

  async function run(action: () => Promise<void>) {
    await runExport(action);
  }

  async function resolveLogo(): Promise<BrandLogoBytes | null> {
    if (!state.includeLogo) return null;
    try {
      return await requireBrandLogoBytes(brandKit, {
        includeLogo: true,
        backgroundColor: officeBandColor(palette.primary, state.treatment),
      });
    } catch (err) {
      if (err instanceof BrandLogoResolveError) {
        throw new Error(t("logoResolveFailed"));
      }
      throw err;
    }
  }

  function pptOpts(logo: BrandLogoBytes | null) {
    return {
      presetId: state.presetId,
      title: fields.title ?? "",
      subtitle: fields.subtitle,
      body: fields.body,
      localLabel,
      palette,
      fields,
      logo,
      ...officeFontOpts(),
    };
  }

  function handleDownloadDocx() {
    if (!preset.outputs.docx) return;
    void run(async () => {
      const { exportDocxFromPreset } = await import("@/lib/export/office-export");
      const logo = await resolveLogo().catch((e) => {
        if (state.includeLogo) throw e;
        return null;
      });
      await exportDocxFromPreset({
        presetId: state.presetId,
        palette,
        localLabel,
        fields,
        logo,
        ...officeFontOpts(),
        ...(await letterQrOpts()),
        ...worksheetDocxExtras(),
        filename: formatFilename(preset.fileStem, localNumber, "docx"),
      });
    });
  }

  function handleDownloadDotx() {
    if (!preset.outputs.docx) return;
    void run(async () => {
      const { exportDotxFromPreset } = await import("@/lib/export/office-export");
      const logo = await resolveLogo().catch((e) => {
        if (state.includeLogo) throw e;
        return null;
      });
      await exportDotxFromPreset({
        presetId: state.presetId,
        palette,
        localLabel,
        fields,
        logo,
        ...officeFontOpts(),
        ...(await letterQrOpts()),
        ...worksheetDocxExtras(),
        filename: formatFilename(preset.fileStem, localNumber, "dotx"),
      });
    });
  }

  function handleDownloadXlsx() {
    if (!preset.outputs.xlsx) return;
    const filename = formatFilename(preset.fileStem, localNumber, "xlsx");
    const local = resolveLocalNumber(localNumber);
    if (state.presetId === "seniority-worksheet") {
      void run(async () => {
        const { exportSeniorityWorksheetXlsx } = await import(
          "@/lib/export/office-export"
        );
        await exportSeniorityWorksheetXlsx({
          palette,
          localNumber: local,
          fields,
          labels: seniorityLabels(),
          filename,
          ...officeFontOpts(),
        });
      });
      return;
    }
    if (state.presetId === "grievance-intake") {
      void run(async () => {
        const { exportGrievanceIntakeXlsx } = await import(
          "@/lib/export/office-export"
        );
        await exportGrievanceIntakeXlsx({
          palette,
          localNumber: local,
          fields,
          labels: grievanceIntakeLabels(),
          filename,
          ...officeFontOpts(),
        });
      });
      return;
    }
    if (state.presetId === "lec-directory") {
      void run(async () => {
        const { exportLecDirectoryXlsx } = await import(
          "@/lib/export/office-export"
        );
        await exportLecDirectoryXlsx({
          palette,
          localNumber: local,
          fields,
          filename,
          ...officeFontOpts(),
        });
      });
      return;
    }
    void run(async () => {
      const { exportEventRsvpXlsx } = await import("@/lib/export/office-export");
      await exportEventRsvpXlsx({
        palette,
        localNumber: local,
        fields,
        filename,
        labels: rsvpXlsxLabels(),
        ...officeFontOpts(),
      });
    });
  }

  function handleDownloadPptx() {
    if (!preset.outputs.pptx) return;
    void run(async () => {
      const { exportPptx } = await import("@/lib/export/office-export");
      const logo = await resolveLogo();
      await exportPptx({
        ...pptOpts(logo),
        filename: formatFilename(preset.fileStem, localNumber, "pptx"),
      });
    });
  }

  function handleDownloadIcs() {
    if (!preset.outputs.ics) return;
    void run(async () => {
      const blob = renderEventIcsBlob(fields, {
        localNumber: resolveLocalNumber(localNumber),
      });
      if (!blob) throw new Error(t("icsNeedsCalendar"));
      await downloadBlob(
        blob,
        formatFilename(preset.fileStem, localNumber, "ics"),
      );
    });
  }

  function handleDownloadZip() {
    void run(async () => {
      const {
        exportOfficeBundle,
        renderDocxFromPreset,
        renderDotxFromPreset,
        renderEventRsvpXlsx,
        renderPptx,
        renderSeniorityWorksheetXlsx,
        renderGrievanceIntakeXlsx,
        renderLecDirectoryXlsx,
      } = await import("@/lib/export/office-export");

      let logo: BrandLogoBytes | null = null;
      if (state.includeLogo) {
        try {
          logo = await requireBrandLogoBytes(brandKit, {
            includeLogo: true,
            backgroundColor: officeBandColor(palette.primary, state.treatment),
          });
        } catch (err) {
          if (err instanceof BrandLogoResolveError) {
            throw new Error(t("logoResolveFailed"));
          }
          throw err;
        }
      }

      const files: { name: string; blob: Promise<Blob> | Blob }[] = [];
      if (state.includeDocx && preset.outputs.docx) {
        files.push({
          name: formatFilename(preset.fileStem, localNumber, "docx"),
          blob: renderDocxFromPreset({
            presetId: state.presetId,
            palette,
            localLabel,
            fields,
            logo,
            ...officeFontOpts(),
            ...(await letterQrOpts()),
            ...worksheetDocxExtras(),
          }),
        });
        files.push({
          name: formatFilename(preset.fileStem, localNumber, "dotx"),
          blob: renderDotxFromPreset({
            presetId: state.presetId,
            palette,
            localLabel,
            fields,
            logo,
            ...officeFontOpts(),
            ...(await letterQrOpts()),
            ...worksheetDocxExtras(),
          }),
        });
      }
      if (state.includeXlsx && preset.outputs.xlsx) {
        const local = resolveLocalNumber(localNumber);
        files.push({
          name: formatFilename(preset.fileStem, localNumber, "xlsx"),
          blob:
            state.presetId === "seniority-worksheet"
              ? renderSeniorityWorksheetXlsx({
                  palette,
                  localNumber: local,
                  fields,
                  labels: seniorityLabels(),
                  ...officeFontOpts(),
                })
              : state.presetId === "grievance-intake"
                ? renderGrievanceIntakeXlsx({
                    palette,
                    localNumber: local,
                    fields,
                    labels: grievanceIntakeLabels(),
                    ...officeFontOpts(),
                  })
              : state.presetId === "lec-directory"
                ? renderLecDirectoryXlsx({
                    palette,
                    localNumber: local,
                    fields,
                    ...officeFontOpts(),
                  })
                : renderEventRsvpXlsx({
                    palette,
                    localNumber: local,
                    fields,
                    labels: rsvpXlsxLabels(),
                    ...officeFontOpts(),
                  }),
        });
      }
      if (state.includeIcs && preset.outputs.ics) {
        const icsBlob = renderEventIcsBlob(fields, {
          localNumber: resolveLocalNumber(localNumber),
        });
        if (!icsBlob) throw new Error(t("icsNeedsCalendar"));
        files.push({
          name: formatFilename(preset.fileStem, localNumber, "ics"),
          blob: icsBlob,
        });
      }
      if (state.includePptx && preset.outputs.pptx) {
        files.push({
          name: formatFilename(preset.fileStem, localNumber, "pptx"),
          blob: renderPptx(pptOpts(logo)),
        });
      }
      if (files.length === 0) throw new Error(t("selectOutput"));

      await exportOfficeBundle({
        zipFilename: formatFilename(
          `${preset.fileStem}-pack`,
          localNumber,
          "zip",
        ),
        files,
      });
    });
  }

  function renderDownloadActions() {
    return (
    <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
      {preset.outputs.docx ? (
        <Button
          type="button"
          variant="outline"
          className="min-h-11 w-full sm:w-auto"
          disabled={busy}
          onClick={handleDownloadDocx}
        >
          {tc("downloadDocx")}
        </Button>
      ) : null}
      {preset.outputs.docx ? (
        <Button
          type="button"
          variant="outline"
          className="min-h-11 w-full sm:w-auto"
          disabled={busy}
          onClick={handleDownloadDotx}
        >
          {t("downloadDotx")}
        </Button>
      ) : null}
      {preset.outputs.xlsx ? (
        <Button
          type="button"
          variant="outline"
          className="min-h-11 w-full sm:w-auto"
          disabled={busy}
          onClick={handleDownloadXlsx}
        >
          {tc("downloadXlsx")}
        </Button>
      ) : null}
      {preset.outputs.ics ? (
        <Button
          type="button"
          variant="outline"
          className="min-h-11 w-full sm:w-auto"
          disabled={busy}
          onClick={handleDownloadIcs}
        >
          {t("downloadIcs")}
        </Button>
      ) : null}
      {preset.outputs.pptx ? (
        <Button
          type="button"
          variant="outline"
          className="min-h-11 w-full sm:w-auto"
          disabled={busy}
          onClick={handleDownloadPptx}
        >
          {tc("downloadPptx")}
        </Button>
      ) : null}
      <Button
        type="button"
        className="min-h-11 w-full sm:w-auto"
        disabled={busy}
        onClick={handleDownloadZip}
        aria-busy={busy}
      >
        {busy ? tc("exporting") : t("downloadZip")}
      </Button>
    </div>
    );
  }

  const visiblePresets = lettersOnly
    ? OFFICE_PRESETS.filter((p) => isLetterPreset(p.id))
    : OFFICE_PRESETS;

  const presetPicker = (
    <div
      className={
        lettersOnly
          ? "grid grid-cols-1 gap-2 sm:grid-cols-3"
          : "grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-7"
      }
      role="group"
      aria-label={t("examples")}
    >
      {visiblePresets.map((p) => (
        <OfficeExampleTile
          key={p.id}
          presetId={p.id}
          title={t(p.titleKey)}
          selected={state.presetId === p.id}
          palette={palette}
          onSelect={() => applyPreset(p.id)}
        />
      ))}
    </div>
  );

  const form = (
    <div className="space-y-4">
      <DesignTreatmentControl value={state.treatment ?? "full"} onChange={(treatment) => setState({ ...state, treatment })} />
      <div>
        <p className="mb-2 text-sm font-medium text-gray-700">{t("examples")}</p>
        {presetPicker}
        {lettersOnly ? (
          <Link
            href="/create/document-generator"
            className={`${guideCtaOutlineClassSm} mt-3`}
          >
            {tLetters("openFull")}
          </Link>
        ) : null}
      </div>
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <CardTitle className="text-base">{t("settings")}</CardTitle>
        <UndoRedoBar
          canUndo={canUndo}
          canRedo={canRedo}
          onUndo={undo}
          onRedo={redo}
          onReset={() =>
            reset(
              createInitialGeneratorState(
                state.presetId,
                state.includeLogo,
                brandKit,
              ),
            )
          }
        />
      </div>

      <p className="text-sm leading-snug text-gray-600">{t(preset.blurbKey)}</p>

      {lettersOnly ? (
        <p className="text-sm text-gray-600">{tLetters("chooserHint")}</p>
      ) : null}

      {draftSaveFailed ? (
        <Callout tone="muted" role="status">
          {t("draftSaveFailed")}
        </Callout>
      ) : null}

      {preset.id === "quick-event" ? (
        <Callout tone="muted" role="note">
          {t("formatNoticeEventPack")}
        </Callout>
      ) : null}

      {!letterMode &&
      preset.outputs.docx &&
      preset.outputs.xlsx ? (
        <Callout tone="muted" role="note">
          {t("formatNoticeWorksheet")}
        </Callout>
      ) : null}

      {letterMode ? (
        <ToolFormDetails title={t("sectionSalutation")} defaultOpen>
          <SegControl
            label={t("salutationPreset")}
            value={state.salutationPresetId}
            options={SALUTATION_PRESET_IDS.map((id) => ({
              value: id,
              label:
                id === "dearMember"
                  ? t("salutationPresets.dearMember", {
                      name:
                        state.fields.memberName?.trim() ||
                        t("salutationPresets.dearMemberFallback"),
                    })
                  : t(`salutationPresets.${id}`),
            }))}
            onChange={(salutationPresetId) =>
              setState({ ...state, salutationPresetId })
            }
          />
          {state.salutationPresetId === "custom" ? (
            <Input
              label={t("fields.salutation")}
              value={state.fields.salutation ?? ""}
              onChange={(e) => setField("salutation", e.target.value)}
              placeholder={t("salutationCustomPlaceholder")}
            />
          ) : null}
        </ToolFormDetails>
      ) : null}

      <ToolFormDetails title={t("fieldsHeading")} defaultOpen>
        {preset.fields
          .filter((field) => !(letterMode && field.key === "salutation"))
          .map((field) =>
          field.multiline ? (
            <Textarea
              key={field.key}
              label={t(field.labelKey)}
              rows={3}
              value={state.fields[field.key] ?? ""}
              onChange={(e) => setField(field.key, e.target.value)}
            />
          ) : (
            <Input
              key={field.key}
              label={t(field.labelKey)}
              value={state.fields[field.key] ?? ""}
              onChange={(e) => setField(field.key, e.target.value)}
            />
          ),
        )}
      </ToolFormDetails>

      {letterMode ? (
        <ToolFormDetails title={t("sectionPrint")} defaultOpen>
          <SegControl
            label={t("topMargin")}
            value={state.topMargin}
            options={(["tight", "standard", "roomy"] as const).map((v) => ({
              value: v,
              label: t(`topMarginOpts.${v}`),
            }))}
            onChange={(topMargin) => setState({ ...state, topMargin })}
          />
          <SegControl
            label={t("letterSpacing")}
            value={state.letterSpacing}
            options={(["tight", "normal", "loose"] as const).map((v) => ({
              value: v,
              label: t(`letterSpacingOpts.${v}`),
            }))}
            onChange={(letterSpacing) => setState({ ...state, letterSpacing })}
          />
          <SegControl
            label={t("headerSize")}
            value={state.headerSize}
            options={(["compact", "standard", "display"] as const).map((v) => ({
              value: v,
              label: t(`headerSizeOpts.${v}`),
            }))}
            onChange={(headerSize) => setState({ ...state, headerSize })}
          />
        </ToolFormDetails>
      ) : null}

      <ToolFormDetails title={t("sectionBranding")}>
        <Checkbox
          label={t("includeLogo")}
          checked={state.includeLogo}
          onChange={(e) =>
            setState({ ...state, includeLogo: e.target.checked })
          }
        />
        {letterMode ? (
          <>
            <Checkbox
              label={t("showQr")}
              checked={state.showQr && savedLinks.length > 0}
              disabled={savedLinks.length === 0}
              onChange={(e) =>
                setState({ ...state, showQr: e.target.checked })
              }
            />
            {savedLinks.length === 0 ? (
              <p className="text-xs text-gray-600">{t("qrNeedsLinks")}</p>
            ) : savedLinks.length > 1 && state.showQr ? (
              <label className="block text-sm">
                <span className="mb-1 block font-medium text-gray-700">
                  {t("qrLink")}
                </span>
                <select
                  className="min-h-11 w-full rounded-md border border-gray-300 bg-white px-3 text-sm"
                  value={state.qrLinkId || savedLinks[0]?.id}
                  onChange={(e) =>
                    setState({ ...state, qrLinkId: e.target.value })
                  }
                >
                  {savedLinks.map((link) => (
                    <option key={link.id} value={link.id}>
                      {link.label}
                    </option>
                  ))}
                </select>
              </label>
            ) : null}
            {state.showQr && savedLinks.length > 0 && preset.outputs.pptx ? (
              <Callout tone="muted" role="note" className="mt-2">
                {t("formatNoticeQrWordOnly")}
              </Callout>
            ) : null}
          </>
        ) : null}
      </ToolFormDetails>

      <ToolFormDetails title={t("outputs")}>
        {letterMode && preset.outputs.pptx ? (
          <Callout tone="muted" role="note" className="mb-3">
            {t("formatNoticePptxLetter")}
          </Callout>
        ) : null}
        {preset.outputs.docx && state.includeDocx ? (
          <Callout tone="muted" role="note" className="mb-3">
            {t("formatNoticeZipDotx")}
          </Callout>
        ) : null}
        <div className="flex flex-col gap-1.5">
          {preset.outputs.docx ? (
            <Checkbox
              label={t("outputDocx")}
              checked={state.includeDocx}
              onChange={(e) =>
                setState({ ...state, includeDocx: e.target.checked })
              }
            />
          ) : null}
          {preset.outputs.xlsx ? (
            <Checkbox
              label={
                state.presetId === "seniority-worksheet" ||
                state.presetId === "grievance-intake"
                  ? t("outputXlsxWorksheet")
                  : t("outputXlsx")
              }
              checked={state.includeXlsx}
              onChange={(e) =>
                setState({ ...state, includeXlsx: e.target.checked })
              }
            />
          ) : null}
          {preset.outputs.ics ? (
            <Checkbox
              label={t("outputIcs")}
              checked={state.includeIcs}
              onChange={(e) =>
                setState({ ...state, includeIcs: e.target.checked })
              }
            />
          ) : null}
          {preset.outputs.pptx ? (
            <Checkbox
              label={t("outputPptx")}
              checked={state.includePptx}
              onChange={(e) =>
                setState({ ...state, includePptx: e.target.checked })
              }
            />
          ) : null}
        </div>
      </ToolFormDetails>

      <div className="border-t border-gray-200 pt-5">{renderDownloadActions()}</div>
    </div>
    </div>
  );

  const preview = (
    <div className="min-w-0 space-y-3">
      <h2 className="text-base font-semibold text-opseu-dark">{t("preview")}</h2>
      <p className="text-sm text-gray-600">{t("previewHint")}</p>
      <OfficePresetMock
        treatment={state.treatment ?? "full"}
        presetId={state.presetId}
        palette={palette}
        localLabel={localLabel}
        fields={fields}
        logoSrc={state.includeLogo ? logoPreviewSrc : null}
        salutationLine={letterMode ? printChrome.salutationLine : undefined}
        qrSrc={letterMode && state.showQr ? qrPreviewSrc : null}
        includeDocx={state.includeDocx && preset.outputs.docx}
        includeXlsx={state.includeXlsx && preset.outputs.xlsx}
        includePptx={state.includePptx && preset.outputs.pptx}
        tokens={canvasTokens}
        letterSpacing={
          letterMode
            ? state.letterSpacing === "tight"
              ? "-0.01em"
              : state.letterSpacing === "loose"
                ? "0.04em"
                : "0.01em"
            : undefined
        }
        topPadPx={
          letterMode
            ? state.topMargin === "tight"
              ? 10
              : state.topMargin === "roomy"
                ? 28
                : 16
            : undefined
        }
      />
      <ToolFormDetails title={t("sectionStructure")}>
        <ul className="list-disc space-y-1 pl-5 text-xs text-gray-600">
          {preset.structureKeys.map((key) => (
            <li key={key}>{t(key)}</li>
          ))}
        </ul>
      </ToolFormDetails>
    </div>
  );

  return (
    <ToolEditorLayout
      title={lettersOnly ? tLetters("title") : t("title")}
      description={lettersOnly ? tLetters("subtitle") : t("subtitle")}
      purposeHint={lettersOnly ? tLetters("whenToUse") : t("whenToUse")}
      previewAccessibleName={t("preview")}
      miniPreview={false}
      toolbar={
        !themeEstablished ? (
          <BrandSetupPrompt
            themeEstablished={themeEstablished}
            prompt={t("setupBrandPrompt")}
          />
        ) : undefined
      }
      form={form}
      preview={preview}
      previewActions={renderDownloadActions()}
      exportError={error}
      exportSuccess={success}
      belowGrid={
        showInviteEmail ? (
          <InviteEmailPanel
            fields={fields}
            localNumber={resolveLocalNumber(localNumber)}
            messagesNamespace="documentGenerator"
          />
        ) : null
      }
      footer={
        <ToolRelatedFooter
          toolSlug={lettersOnly ? "letter-generator" : "document-generator"}
        />
      }
    />
  );
}
