"use client";

import { useEffect, useMemo, useRef, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { ToolEditorLayout } from "@/components/tools/ToolEditorLayout";
import { ToolRelatedFooter } from "@/components/tools/ToolRelatedFooter";
import { SourcesBlock } from "@/components/comms/SourcesBlock";
import { BylawsReferenceSheetButton } from "@/components/comms/BylawsReferenceSheetButton";
import { Callout } from "@/components/ui/Callout";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { PageShell } from "@/components/layout/PageShell";
import { StewardGuideExportBar } from "@/components/tools/steward-guides/StewardGuideExportBar";
import { useExportHandler } from "@/hooks/use-export-handler";
import { useStewardGuideDraft } from "@/hooks/use-steward-guide-draft";
import { guidePdfBrandFromKit } from "@/lib/export/text-pdf-layout";
import { copyToClipboard } from "@/lib/utils";
import { useBrandStore } from "@/store/brand-store";
import {
  BYLAW_PRESET_IDS,
  BYLAW_PRESETS,
  buildBylawTemplate,
  bylawDownloadBasename,
  bylawDownloadFilename,
  type BylawFormValues,
  type BylawPresetId,
} from "@/lib/bylaws/build-template";
import {
  clearBylawDraft,
  createEmptyBylawForm,
  loadBylawDraft,
  saveBylawDraft,
} from "@/lib/bylaws/draft";
import {
  exportWorkspaceMarkdown,
  exportWorkspacePdf,
} from "@/lib/steward-guides";

function downloadText(filename: string, text: string) {
  const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function isBylawPresetId(value: string | null): value is BylawPresetId {
  return (
    value !== null && (BYLAW_PRESET_IDS as readonly string[]).includes(value)
  );
}

export default function BylawBuilderPage() {
  return (
    <Suspense fallback={<BylawBuilderSuspenseFallback />}>
      <BylawBuilderPageContent />
    </Suspense>
  );
}

function BylawBuilderSuspenseFallback() {
  const t = useTranslations("common");
  return (
    <PageShell className="py-6 md:py-8 lg:py-10">
      <p className="text-gray-600" aria-busy="true">
        {t("loading")}
      </p>
    </PageShell>
  );
}

function BylawBuilderPageContent() {
  const t = useTranslations("bylawBuilder");
  const tc = useTranslations("common");
  const ts = useTranslations("sources");
  const locale = useLocale();
  const brandKit = useBrandStore((s) => s.brandKit);
  const searchParams = useSearchParams();
  const [copied, setCopied] = useState(false);
  const appliedPreset = useRef(false);
  const { draft, setDraft, clear, saveFailed, hydrated } = useStewardGuideDraft({
    load: loadBylawDraft,
    save: saveBylawDraft,
    createEmpty: createEmptyBylawForm,
    clearStorage: clearBylawDraft,
  });
  const { exportError, exportSuccess, exporting, runExport } =
    useExportHandler();

  useEffect(() => {
    if (!hydrated || appliedPreset.current) return;
    const preset = searchParams.get("preset");
    if (!isBylawPresetId(preset)) return;
    appliedPreset.current = true;
    setDraft({ ...BYLAW_PRESETS[preset] });
  }, [hydrated, searchParams, setDraft]);

  const labels = useMemo(
    () => ({
      placeholders: {
        localName: t("placeholders.localName"),
        vicePresidents: t("placeholders.vicePresidents"),
        stewards: t("placeholders.stewards"),
        gmmQuorum: t("placeholders.gmmQuorum"),
        lecQuorum: t("placeholders.lecQuorum"),
        signingOfficers: t("placeholders.signingOfficers"),
        trustees: t("placeholders.trustees"),
        meetingFrequency: t("placeholders.meetingFrequency"),
        electionTerm: t("placeholders.electionTerm"),
        amendmentNotice: t("placeholders.amendmentNotice"),
        fiscalYearEnd: t("placeholders.fiscalYearEnd"),
      },
      articles: {
        name: t("articles.name"),
        purpose: t("articles.purpose"),
        membership: t("articles.membership"),
        executive: t("articles.executive"),
        stewards: t("articles.stewards"),
        quorum: t("articles.quorum"),
        meetings: t("articles.meetings"),
        elections: t("articles.elections"),
        finances: t("articles.finances"),
        trustees: t("articles.trustees"),
        committees: t("articles.committees"),
        amendments: t("articles.amendments"),
        conflict: t("articles.conflict"),
      },
    }),
    [t],
  );

  const previewText = useMemo(
    () => buildBylawTemplate(draft, labels),
    [draft, labels],
  );

  const updateField = <K extends keyof BylawFormValues>(
    key: K,
    value: BylawFormValues[K],
  ) => {
    setDraft((prev) => ({ ...prev, [key]: value }));
  };

  const applyPreset = (id: BylawPresetId) => {
    setDraft({ ...BYLAW_PRESETS[id] });
  };

  const handleCopy = async () => {
    await runExport(
      async () => {
        const ok = await copyToClipboard(previewText);
        if (!ok) {
          throw new Error(tc("copyFailed"));
        }
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      },
      { skipSuccess: true, errorMessage: tc("copyFailed") },
    );
  };

  const basename = bylawDownloadBasename(draft.localName);

  const exportBar = (
    <StewardGuideExportBar
      exporting={exporting}
      onExportMarkdown={() =>
        void runExport(() =>
          exportWorkspaceMarkdown(previewText, `${basename}.md`),
        )
      }
      onExportPdf={() =>
        void runExport(() =>
          exportWorkspacePdf(t("title"), previewText, `${basename}.pdf`, {
            locale: locale === "fr" ? "fr" : "en",
            brand: guidePdfBrandFromKit(brandKit),
          }),
        )
      }
      onPrintChecklist={() => window.print()}
      onClear={clear}
      labels={{
        exportMarkdown: t("exportMarkdown"),
        exportPdf: t("exportPdf"),
        printChecklist: t("print"),
        clearDraft: t("clearDraft"),
      }}
    />
  );

  const formPane = (
    <div className="space-y-3">
      <Callout tone="warning">
        <p className="text-sm leading-relaxed text-amber-950">
          {t("formDisclaimer")}
        </p>
      </Callout>

      <div>
        <p className="mb-1.5 text-sm font-medium text-gray-700">
          {t("presets.label")}
        </p>
        <div className="flex flex-wrap gap-2">
          {BYLAW_PRESET_IDS.map((id) => (
            <Button
              key={id}
              type="button"
              variant="outline"
              size="sm"
              onClick={() => applyPreset(id)}
            >
              {t(`presets.${id}`)}
            </Button>
          ))}
        </div>
        <p className="mt-1.5 text-xs text-gray-500">{t("presets.hint")}</p>
      </div>

      <Input
        label={t("fields.localName")}
        value={draft.localName}
        onChange={(e) => updateField("localName", e.target.value)}
        placeholder={t("fieldPlaceholders.localName")}
        autoComplete="organization"
      />
      <Input
        label={t("fields.vicePresidents")}
        value={draft.vicePresidents}
        onChange={(e) => updateField("vicePresidents", e.target.value)}
        placeholder={t("fieldPlaceholders.vicePresidents")}
        inputMode="numeric"
      />
      <Input
        label={t("fields.stewards")}
        value={draft.stewards}
        onChange={(e) => updateField("stewards", e.target.value)}
        placeholder={t("fieldPlaceholders.stewards")}
      />
      <Input
        label={t("fields.gmmQuorum")}
        value={draft.gmmQuorum}
        onChange={(e) => updateField("gmmQuorum", e.target.value)}
        placeholder={t("fieldPlaceholders.gmmQuorum")}
      />
      <Input
        label={t("fields.lecQuorum")}
        value={draft.lecQuorum}
        onChange={(e) => updateField("lecQuorum", e.target.value)}
        placeholder={t("fieldPlaceholders.lecQuorum")}
      />
      <Input
        label={t("fields.signingOfficers")}
        value={draft.signingOfficers}
        onChange={(e) => updateField("signingOfficers", e.target.value)}
        placeholder={t("fieldPlaceholders.signingOfficers")}
      />
      <Input
        label={t("fields.trustees")}
        value={draft.trustees}
        onChange={(e) => updateField("trustees", e.target.value)}
        placeholder={t("fieldPlaceholders.trustees")}
      />
      <Input
        label={t("fields.meetingFrequency")}
        value={draft.meetingFrequency}
        onChange={(e) => updateField("meetingFrequency", e.target.value)}
        placeholder={t("fieldPlaceholders.meetingFrequency")}
      />
      <Input
        label={t("fields.electionTerm")}
        value={draft.electionTerm}
        onChange={(e) => updateField("electionTerm", e.target.value)}
        placeholder={t("fieldPlaceholders.electionTerm")}
      />
      <Input
        label={t("fields.amendmentNotice")}
        value={draft.amendmentNotice}
        onChange={(e) => updateField("amendmentNotice", e.target.value)}
        placeholder={t("fieldPlaceholders.amendmentNotice")}
      />
      <Input
        label={t("fields.fiscalYearEnd")}
        value={draft.fiscalYearEnd}
        onChange={(e) => updateField("fiscalYearEnd", e.target.value)}
        placeholder={t("fieldPlaceholders.fiscalYearEnd")}
      />

      <Callout tone="muted">
        <p className="text-sm font-semibold text-opseu-dark">
          {t("checklistPrompt.title")}
        </p>
        <p className="mt-1 text-sm text-gray-700">{t("checklistPrompt.body")}</p>
        <BylawsReferenceSheetButton kind="adoption" className="mt-3" />
      </Callout>

      {saveFailed ? (
        <Callout tone="warning">
          <p className="text-sm text-amber-950">{t("saveFailed")}</p>
        </Callout>
      ) : (
        <p className="text-xs text-gray-500">{t("privacyNote")}</p>
      )}
    </div>
  );

  const previewActions = (
    <div className="flex flex-wrap gap-2 print:hidden">
      <Button type="button" onClick={handleCopy} disabled={exporting}>
        {copied ? tc("copied") : t("copy")}
      </Button>
      <Button
        type="button"
        variant="outline"
        onClick={() =>
          void runExport(async () => {
            downloadText(bylawDownloadFilename(draft.localName), previewText);
          })
        }
        disabled={exporting}
      >
        {t("downloadTxt")}
      </Button>
    </div>
  );

  const previewPane = (
    <div className="space-y-3 steward-guide-print">
      <div
        className="max-h-[min(70vh,36rem)] overflow-y-auto rounded-lg border border-gray-200 bg-white p-4 text-sm leading-relaxed whitespace-pre-wrap text-gray-800 print:max-h-none print:overflow-visible"
        aria-live="polite"
      >
        {previewText}
      </div>
      {previewActions}
      <Callout tone="muted" className="print:hidden">
        <p className="text-sm leading-relaxed text-gray-700">{t("disclaimer")}</p>
      </Callout>
    </div>
  );

  return (
    <ToolEditorLayout
      title={t("title")}
      description={t("subtitle")}
      purposeHint={t("whenToUse")}
      previewAccessibleName={t("preview.title")}
      miniPreview={false}
      toolbar={
        <div className="space-y-3">
          <p className="text-sm text-gray-600">
            <Link
              href="/guide/bylaws"
              className="font-semibold text-opseu-blue underline underline-offset-2"
            >
              {t("guideLink")}
            </Link>
            {" · "}
            <Link
              href="/guide/officer-learning/democratic-governance"
              className="font-semibold text-opseu-blue underline underline-offset-2"
            >
              {t("governanceLink")}
            </Link>
          </p>
          {exportBar}
        </div>
      }
      form={formPane}
      preview={previewPane}
      previewActions={
        <div className="space-y-2">
          {exportBar}
          {previewActions}
        </div>
      }
      exportError={exportError}
      exportSuccess={exportSuccess}
      footer={
        <div className="space-y-6">
          <ToolRelatedFooter toolSlug="bylaw-builder" />
          <SourcesBlock
            pageId="bylawBuilder"
            title={ts("title")}
            intro={ts("intro")}
          />
        </div>
      }
    />
  );
}
