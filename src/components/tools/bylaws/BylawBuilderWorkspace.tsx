"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { ToolEditorLayout } from "@/components/tools/ToolEditorLayout";
import { ToolRelatedFooter } from "@/components/tools/ToolRelatedFooter";
import { SourcesBlock } from "@/components/comms/SourcesBlock";
import { BylawsReferenceSheetButton } from "@/components/comms/BylawsReferenceSheetButton";
import { SegControl } from "@/components/tools/SegControl";
import { Callout } from "@/components/ui/Callout";
import { Button } from "@/components/ui/Button";
import { Input, Textarea } from "@/components/ui/Input";
import { StewardGuideExportBar } from "@/components/tools/steward-guides/StewardGuideExportBar";
import { useExportHandler } from "@/hooks/use-export-handler";
import { useStewardGuideDraft } from "@/hooks/use-steward-guide-draft";
import { guidePdfBrandFromKit } from "@/lib/export/text-pdf-layout";
import { copyToClipboard } from "@/lib/utils";
import { useBrandStore } from "@/store/brand-store";
import {
  BYLAW_ARTICLE_KEYS,
  type BylawArticleKey,
} from "@/lib/bylaws/articles";
import {
  BYLAW_PRESET_IDS,
  buildBylawArticleMap,
  buildBylawTemplate,
  bylawDownloadBasename,
  bylawDownloadFilename,
  normalizeBylawPresetId,
  type BylawBuilderMode,
  type BylawDraft,
  type BylawFormValues,
  type BylawPresetId,
} from "@/lib/bylaws/build-template";
import {
  clearBylawDraft,
  createEmptyBylawDraft,
  loadBylawDraft,
  saveBylawDraft,
} from "@/lib/bylaws/draft";
import { applyBylawPreset } from "@/lib/bylaws/presets";
import {
  changedBylawRedlineCount,
  summarizeBylawRedline,
} from "@/lib/bylaws/redline";
import { exportWorkspacePdf } from "@/lib/steward-guides";

function downloadText(filename: string, text: string) {
  const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function BylawBuilderWorkspace() {
  const t = useTranslations("bylawBuilder");
  const tc = useTranslations("common");
  const ts = useTranslations("sources");
  const locale = useLocale();
  const brandKit = useBrandStore((s) => s.brandKit);
  const searchParams = useSearchParams();
  const [copied, setCopied] = useState(false);
  const appliedQuery = useRef(false);
  const { draft, setDraft, clear, saveFailed, hydrated } = useStewardGuideDraft({
    load: loadBylawDraft,
    save: saveBylawDraft,
    createEmpty: createEmptyBylawDraft,
    clearStorage: clearBylawDraft,
  });
  const { exportError, exportSuccess, exporting, runExport } =
    useExportHandler();

  useEffect(() => {
    if (!hydrated || appliedQuery.current) return;
    appliedQuery.current = true;

    const mode = searchParams.get("mode");
    const preset = normalizeBylawPresetId(searchParams.get("preset"));

    setDraft((prev) => {
      let next: BylawDraft = { ...prev };
      if (mode === "committee") {
        next = { ...next, mode: "committee" };
      }
      if (preset) {
        const applied = applyBylawPreset(preset, brandKit);
        next = {
          ...next,
          ...applied,
          articleOverrides: {},
          committeeNotes: {},
        };
      }
      return next;
    });
  }, [brandKit, hydrated, searchParams, setDraft]);

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
      articles: Object.fromEntries(
        BYLAW_ARTICLE_KEYS.map((key) => [key, t(`articles.${key}`)]),
      ) as Record<BylawArticleKey, string>,
    }),
    [t],
  );

  const opseuArticles = useMemo(
    () =>
      Object.fromEntries(
        BYLAW_ARTICLE_KEYS.map((key) => [key, t(`opseuArticles.${key}`)]),
      ) as Record<BylawArticleKey, string>,
    [t],
  );

  const buildOptions = useMemo(
    () => ({
      articleSet: draft.articleSet,
      opseuArticles,
      articleOverrides: draft.articleOverrides,
    }),
    [draft.articleSet, draft.articleOverrides, opseuArticles],
  );

  const articleMap = useMemo(
    () => buildBylawArticleMap(draft, labels, buildOptions),
    [draft, labels, buildOptions],
  );

  const previewText = useMemo(
    () =>
      draft.mode === "committee"
        ? BYLAW_ARTICLE_KEYS.map((key) => articleMap[key]).join("\n\n")
        : buildBylawTemplate(draft, labels, buildOptions),
    [articleMap, buildOptions, draft, labels],
  );

  const redlineRows = useMemo(
    () => summarizeBylawRedline(draft.existingBylaws, previewText),
    [draft.existingBylaws, previewText],
  );
  const redlineChanges = changedBylawRedlineCount(redlineRows);

  const updateField = <K extends keyof BylawFormValues>(
    key: K,
    value: BylawFormValues[K],
  ) => {
    setDraft((prev) => ({ ...prev, [key]: value }));
  };

  const applyPreset = (id: BylawPresetId) => {
    const applied = applyBylawPreset(id, brandKit);
    setDraft((prev) => ({
      ...prev,
      ...applied,
      articleOverrides: {},
    }));
  };

  const setMode = (mode: BylawBuilderMode) => {
    setDraft((prev) => ({ ...prev, mode }));
  };

  const updateArticleOverride = (key: BylawArticleKey, value: string) => {
    setDraft((prev) => ({
      ...prev,
      articleOverrides: { ...prev.articleOverrides, [key]: value },
    }));
  };

  const updateCommitteeNote = (key: BylawArticleKey, value: string) => {
    setDraft((prev) => ({
      ...prev,
      committeeNotes: { ...prev.committeeNotes, [key]: value },
    }));
  };

  const handleCopy = async () => {
    await runExport(
      async () => {
        const ok = await copyToClipboard(previewText);
        if (!ok) throw new Error(tc("copyFailed"));
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
        exportPdf: t("exportPdf"),
        printChecklist: t("print"),
        clearDraft: t("clearDraft"),
      }}
    />
  );

  const modeControl = (
    <SegControl
      label={t("modes.label")}
      value={draft.mode}
      onChange={setMode}
      options={[
        { value: "template", label: t("modes.template") },
        { value: "committee", label: t("modes.committee") },
      ]}
    />
  );

  const presetButtons = (
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
  );

  const articleSetControl = (
    <SegControl
      label={t("articleSet.label")}
      value={draft.articleSet}
      onChange={(articleSet) => setDraft((prev) => ({ ...prev, articleSet }))}
      options={[
        { value: "standard", label: t("articleSet.standard") },
        { value: "opseu", label: t("articleSet.opseu") },
      ]}
    />
  );

  const scalarFields = (
    <>
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
    </>
  );

  const committeePane = (
    <div className="space-y-4">
      {modeControl}
      <Callout tone="muted">
        <p className="text-sm leading-relaxed text-gray-700">
          {t("committee.intro")}
        </p>
      </Callout>
      {presetButtons}
      {articleSetControl}
      {scalarFields}
      <div className="space-y-4 border-t border-gray-100 pt-4">
        {BYLAW_ARTICLE_KEYS.map((key) => (
          <div key={key} className="space-y-2">
            <Textarea
              label={t(`articleLabels.${key}`)}
              value={draft.articleOverrides[key] ?? articleMap[key]}
              onChange={(e) => updateArticleOverride(key, e.target.value)}
              rows={4}
            />
            <Textarea
              label={t("committee.noteLabel")}
              value={draft.committeeNotes[key] ?? ""}
              onChange={(e) => updateCommitteeNote(key, e.target.value)}
              placeholder={t("committee.notePlaceholder")}
              rows={2}
            />
          </div>
        ))}
      </div>
    </div>
  );

  const templatePane = (
    <div className="space-y-3">
      <Callout tone="warning">
        <p className="text-sm leading-relaxed text-amber-950">
          {t("formDisclaimer")}
        </p>
      </Callout>
      {modeControl}
      {presetButtons}
      {articleSetControl}
      {scalarFields}
      <Textarea
        label={t("compare.existingLabel")}
        value={draft.existingBylaws}
        onChange={(e) =>
          setDraft((prev) => ({ ...prev, existingBylaws: e.target.value }))
        }
        placeholder={t("compare.existingPlaceholder")}
        rows={6}
      />
      {draft.existingBylaws.trim() ? (
        <Callout tone={redlineChanges > 0 ? "warning" : "muted"}>
          <p className="text-sm font-semibold text-opseu-dark">
            {t("compare.summaryTitle", { count: redlineChanges })}
          </p>
          <ul className="mt-2 space-y-1 text-sm text-gray-700">
            {redlineRows
              .filter((row) => row.status !== "unchanged")
              .slice(0, 6)
              .map((row) => (
                <li key={row.key}>
                  {t(`compare.status.${row.status}`)} — {row.title}
                </li>
              ))}
          </ul>
          {redlineChanges > 6 ? (
            <p className="mt-2 text-xs text-gray-500">{t("compare.more")}</p>
          ) : null}
        </Callout>
      ) : null}
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
            {" · "}
            <Link
              href="/portal"
              className="font-semibold text-opseu-blue underline underline-offset-2"
            >
              {t("portalLink")}
            </Link>
          </p>
          {exportBar}
        </div>
      }
      form={draft.mode === "committee" ? committeePane : templatePane}
      preview={
        <div className="space-y-3 steward-guide-print">
          <div
            className="max-h-[min(70vh,36rem)] overflow-y-auto rounded-lg border border-gray-200 bg-white p-4 text-sm leading-relaxed whitespace-pre-wrap text-gray-800 print:max-h-none print:overflow-visible"
            aria-live="polite"
          >
            {previewText}
          </div>
          {previewActions}
          <Callout tone="muted" className="print:hidden">
            <p className="text-sm leading-relaxed text-gray-700">
              {t("disclaimer")}
            </p>
          </Callout>
        </div>
      }
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
