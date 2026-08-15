"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { PageShell } from "@/components/layout/PageShell";
import { Card, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input, Textarea } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Checkbox } from "@/components/ui/Checkbox";
import { Callout } from "@/components/ui/Callout";
import { UndoRedoBar } from "@/components/tools/UndoRedoBar";
import { ToolFormDetails } from "@/components/tools/ToolFormDetails";
import { useUndoRedo } from "@/hooks/use-undo-redo";
import { useBrandStore } from "@/store/brand-store";
import {
  OFFICE_PRESETS,
  brandPalette,
  defaultFieldsForPreset,
  getPreset,
  type OfficePresetId,
} from "@/lib/constants/office-templates";
import { resolvePresetDestination } from "@/lib/utils/local-links";
import type { SeniorityWorksheetLabels } from "@/lib/export/office-export";
import { renderEventIcsBlob } from "@/lib/calendar/event-ics";
import { downloadBlob } from "@/lib/export/image-export";
import { resolveBrandLogoBytes } from "@/lib/export/brand-logo-bytes";
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
import dynamic from "next/dynamic";

const OfficePresetMock = dynamic(
  () =>
    import("@/components/tools/OfficePresetMock").then((m) => m.OfficePresetMock),
  { ssr: false },
);
const OfficeExampleTile = dynamic(
  () =>
    import("@/components/tools/OfficePresetMock").then((m) => m.OfficeExampleTile),
  { ssr: false },
);

const OFFICE_PRESET_IDS = new Set<string>(
  OFFICE_PRESETS.map((p) => p.id),
);

function isOfficePresetId(value: string): value is OfficePresetId {
  return OFFICE_PRESET_IDS.has(value);
}

export interface GeneratorState {
  presetId: OfficePresetId;
  includeDocx: boolean;
  includeXlsx: boolean;
  includePptx: boolean;
  includeIcs: boolean;
  includeLogo: boolean;
  fields: Record<string, string>;
}

function initialState(
  presetId: OfficePresetId = "simple-letter",
  includeLogo = false,
): GeneratorState {
  const preset = getPreset(presetId);
  return {
    presetId,
    includeDocx: true,
    includeXlsx: preset.outputs.xlsx,
    includePptx: true,
    includeIcs: Boolean(preset.outputs.ics),
    includeLogo,
    fields: defaultFieldsForPreset(preset),
  };
}

function DocumentGeneratorSuspenseFallback() {
  const t = useTranslations("common");
  return (
    <PageShell className="py-6 md:py-8 lg:py-10">
      <p className="text-gray-600" aria-busy="true">
        {t("loading")}
      </p>
    </PageShell>
  );
}

export default function DocumentGeneratorPage() {
  return (
    <Suspense fallback={<DocumentGeneratorSuspenseFallback />}>
      <DocumentGeneratorPageContent />
    </Suspense>
  );
}

function DocumentGeneratorPageContent() {
  const t = useTranslations("documentGenerator");
  const tc = useTranslations("common");
  const searchParams = useSearchParams();
  const brandKit = useBrandStore((s) => s.brandKit);
  const hydrated = useBrandStore((s) => s.hydrated);
  const onboardingComplete = useBrandStore((s) => s.onboardingComplete);
  const themeEstablished = isBrandThemeEstablished(
    brandKit,
    onboardingComplete,
  );
  const deepLinkApplied = useRef(false);

  const { state, setState, undo, redo, canUndo, canRedo, reset } =
    useUndoRedo<GeneratorState>(initialState());
  const { exportError: error, exportSuccess: success, exporting: busy, runExport } = useExportHandler();
  const [logoPreviewSrc, setLogoPreviewSrc] = useState<string | null>(null);
  useOneShotBrandSeed(hydrated, () => {
    if (themeEstablished) {
      setState((prev) => ({ ...prev, includeLogo: true }));
    }
  });

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      if (!state.includeLogo) {
        setLogoPreviewSrc(null);
        return;
      }
      const logo = await resolveBrandLogoBytes(brandKit, { includeLogo: true });
      if (!cancelled) setLogoPreviewSrc(logo?.src ?? null);
    })();
    return () => {
      cancelled = true;
    };
  }, [brandKit, state.includeLogo]);

  const preset = getPreset(state.presetId);
  const palette = brandPalette(brandKit);
  const canvasTokens = resolveCanvasTokens(brandKit);
  const officeHeadlineFont = canvasFontOfficeName(canvasTokens.headlineFontId);
  const officeBodyFont = canvasFontOfficeName(canvasTokens.bodyFontId);
  const localNumber = brandKit.local.localNumber;
  const localLabel = `Local ${resolveLocalNumber(localNumber)}`;

  const fields: Record<string, string> = {
    ...state.fields,
    contactName: state.fields.contactName ?? "",
  };

  const showInviteEmail = preset.outputs.email;

  function officeFontOpts() {
    return {
      headlineFont: officeHeadlineFont,
      bodyFont: officeBodyFont,
    };
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

  function applyPreset(id: OfficePresetId) {
    const next = getPreset(id);
    const nextFields = defaultFieldsForPreset(next);
    if (id === "welcome-letter") {
      const origin =
        typeof window !== "undefined" ? window.location.origin : "";
      nextFields.collection =
        brandKit.local.subText?.trim() || nextFields.collection;
      nextFields.membershipUrl =
        resolvePresetDestination("membership-primary", brandKit, origin) ||
        nextFields.membershipUrl;
    }
    setState({
      ...state,
      presetId: id,
      includeDocx: next.outputs.docx,
      includeXlsx: next.outputs.xlsx,
      includePptx: next.outputs.pptx,
      includeIcs: Boolean(next.outputs.ics),
      fields: nextFields,
    });
  }

  useEffect(() => {
    if (deepLinkApplied.current) return;
    const raw = searchParams.get("preset");
    if (!raw || !isOfficePresetId(raw)) return;
    deepLinkApplied.current = true;
    applyPreset(raw);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- one-shot deep link
  }, [searchParams]);

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
    const logo = await resolveBrandLogoBytes(brandKit, { includeLogo: true });
    if (!logo) {
      throw new Error(t("logoResolveFailed"));
    }
    return logo;
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
        filename: formatFilename(preset.fileStem, localNumber, "docx"),
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
      });
    });
  }

  function handleDownloadPptx() {
    if (!preset.outputs.pptx) return;
    void run(async () => {
      const { exportPptx } = await import("@/lib/export/office-export");
      const logo = state.includeLogo
        ? await resolveBrandLogoBytes(brandKit, { includeLogo: true })
        : null;
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
        renderEventRsvpXlsx,
        renderPptx,
        renderSeniorityWorksheetXlsx,
      } = await import("@/lib/export/office-export");

      let logo: BrandLogoBytes | null = null;
      if (state.includeLogo) {
        logo = await resolveBrandLogoBytes(brandKit, { includeLogo: true });
        if (!logo) throw new Error(t("logoResolveFailed"));
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
                })
              : renderEventRsvpXlsx({
                  palette,
                  localNumber: local,
                  fields,
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

  return (
    <PageShell className="py-6 md:py-8 lg:py-10">
      <div className="mb-4 max-w-prose">
        <h1 className="text-2xl font-bold text-opseu-dark md:text-3xl">
          {t("title")}
        </h1>
        <p className="mt-1 text-gray-600">{t("subtitle")}</p>
      </div>

      <div
        className="mb-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
        role="group"
        aria-label={t("examples")}
      >
        {OFFICE_PRESETS.map((p) => (
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

      <div className="grid items-start gap-4 lg:grid-cols-2 lg:gap-6 xl:grid-cols-[minmax(20rem,1.05fr)_minmax(0,1fr)] xl:gap-8">
        <Card density="compact" className="space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <CardTitle className="text-base">{t("settings")}</CardTitle>
            <UndoRedoBar
              canUndo={canUndo}
              canRedo={canRedo}
              onUndo={undo}
              onRedo={redo}
              onReset={() =>
                reset(initialState(state.presetId, state.includeLogo))
              }
            />
          </div>

          <p className="text-sm leading-snug text-gray-600">
            {t(preset.blurbKey)}
          </p>

          {/* Mobile a11y preset select */}
          <div className="sm:hidden">
            <Select
              id="design-preset"
              label={t("designPreset")}
              value={state.presetId}
              onChange={(e) => applyPreset(e.target.value as OfficePresetId)}
            >
              {OFFICE_PRESETS.map((p) => (
                <option key={p.id} value={p.id}>
                  {t(p.titleKey)}
                </option>
              ))}
            </Select>
          </div>

          <section className="space-y-3 border-t border-gray-200 pt-5">
            <p className="text-sm font-semibold text-opseu-dark">
              {t("fieldsHeading")}
            </p>
            {preset.fields.map((field) =>
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
          </section>

          <ToolFormDetails title={t("sectionBranding")}>
            <Checkbox
              label={t("includeLogo")}
              checked={state.includeLogo}
              onChange={(e) =>
                setState({ ...state, includeLogo: e.target.checked })
              }
            />
            {!themeEstablished ? (
              <BrandSetupPrompt
                themeEstablished={themeEstablished}
                prompt={t("setupBrandPrompt")}
              />
            ) : null}
          </ToolFormDetails>

          <ToolFormDetails title={t("outputs")}>
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
                    state.presetId === "seniority-worksheet"
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

          <div className="flex flex-wrap gap-2 border-t border-gray-200 pt-5">
            {preset.outputs.docx ? (
              <Button
                type="button"
                variant="outline"
                disabled={busy}
                onClick={handleDownloadDocx}
              >
                {tc("downloadDocx")}
              </Button>
            ) : null}
            {preset.outputs.xlsx ? (
              <Button
                type="button"
                variant="outline"
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
                disabled={busy}
                onClick={handleDownloadPptx}
              >
                {tc("downloadPptx")}
              </Button>
            ) : null}
            <Button
              type="button"
              disabled={busy}
              onClick={handleDownloadZip}
              aria-busy={busy}
            >
              {busy ? tc("exporting") : t("downloadZip")}
            </Button>
          </div>
          {success ? (
            <Callout tone="success" role="status" className="mt-3">
              {success}
            </Callout>
          ) : null}
          {error ? (
            <p className="text-sm text-red-700" role="alert">
              {error}
            </p>
          ) : null}
        </Card>

        <div className="space-y-3 lg:sticky lg:top-4">
          <h2 className="text-base font-semibold text-opseu-dark">
            {t("preview")}
          </h2>
          <p className="text-sm text-gray-600">{t("previewHint")}</p>
          <OfficePresetMock
            presetId={state.presetId}
            palette={palette}
            localLabel={localLabel}
            fields={fields}
            logoSrc={state.includeLogo ? logoPreviewSrc : null}
            includeDocx={state.includeDocx && preset.outputs.docx}
            includeXlsx={state.includeXlsx && preset.outputs.xlsx}
            includePptx={state.includePptx && preset.outputs.pptx}
            tokens={canvasTokens}
          />
          <ul className="list-disc space-y-1 pl-5 text-xs text-gray-500">
            {preset.structureKeys.map((key) => (
              <li key={key}>{t(key)}</li>
            ))}
          </ul>
        </div>
      </div>

      {showInviteEmail ? (
        <InviteEmailPanel
          className="mt-4"
          fields={fields}
          localNumber={resolveLocalNumber(localNumber)}
          messagesNamespace="documentGenerator"
        />
      ) : null}

      <ToolRelatedFooter toolSlug="document-generator" className="mt-8" />
    </PageShell>
  );
}
