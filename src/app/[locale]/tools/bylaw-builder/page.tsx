"use client";

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { ToolEditorLayout } from "@/components/tools/ToolEditorLayout";
import { ToolRelatedFooter } from "@/components/tools/ToolRelatedFooter";
import { Callout } from "@/components/ui/Callout";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { useExportHandler } from "@/hooks/use-export-handler";
import { copyToClipboard } from "@/lib/utils";
import {
  buildBylawTemplate,
  bylawDownloadFilename,
  type BylawFormValues,
} from "@/lib/bylaws/build-template";

const EMPTY_FORM: BylawFormValues = {
  localName: "",
  vicePresidents: "1",
  stewards: "",
  gmmQuorum: "",
  lecQuorum: "",
  fiscalYearEnd: "",
};

function downloadText(filename: string, text: string) {
  const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export default function BylawBuilderPage() {
  const t = useTranslations("bylawBuilder");
  const tc = useTranslations("common");
  const [form, setForm] = useState<BylawFormValues>(EMPTY_FORM);
  const [copied, setCopied] = useState(false);
  const { exportError, exportSuccess, exporting, runExport } =
    useExportHandler();

  const labels = useMemo(
    () => ({
      placeholders: {
        localName: t("placeholders.localName"),
        vicePresidents: t("placeholders.vicePresidents"),
        stewards: t("placeholders.stewards"),
        gmmQuorum: t("placeholders.gmmQuorum"),
        lecQuorum: t("placeholders.lecQuorum"),
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
        amendments: t("articles.amendments"),
        conflict: t("articles.conflict"),
      },
    }),
    [t],
  );

  const previewText = useMemo(
    () => buildBylawTemplate(form, labels),
    [form, labels],
  );

  const updateField = <K extends keyof BylawFormValues>(
    key: K,
    value: BylawFormValues[K],
  ) => {
    setForm((prev) => ({ ...prev, [key]: value }));
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

  const handleDownload = async () => {
    await runExport(async () => {
      downloadText(bylawDownloadFilename(form.localName), previewText);
    });
  };

  const formPane = (
    <div className="space-y-3">
      <Input
        label={t("fields.localName")}
        value={form.localName}
        onChange={(e) => updateField("localName", e.target.value)}
        placeholder={t("fieldPlaceholders.localName")}
        autoComplete="organization"
      />
      <Input
        label={t("fields.vicePresidents")}
        value={form.vicePresidents}
        onChange={(e) => updateField("vicePresidents", e.target.value)}
        placeholder={t("fieldPlaceholders.vicePresidents")}
        inputMode="numeric"
      />
      <Input
        label={t("fields.stewards")}
        value={form.stewards}
        onChange={(e) => updateField("stewards", e.target.value)}
        placeholder={t("fieldPlaceholders.stewards")}
      />
      <Input
        label={t("fields.gmmQuorum")}
        value={form.gmmQuorum}
        onChange={(e) => updateField("gmmQuorum", e.target.value)}
        placeholder={t("fieldPlaceholders.gmmQuorum")}
      />
      <Input
        label={t("fields.lecQuorum")}
        value={form.lecQuorum}
        onChange={(e) => updateField("lecQuorum", e.target.value)}
        placeholder={t("fieldPlaceholders.lecQuorum")}
      />
      <Input
        label={t("fields.fiscalYearEnd")}
        value={form.fiscalYearEnd}
        onChange={(e) => updateField("fiscalYearEnd", e.target.value)}
        placeholder={t("fieldPlaceholders.fiscalYearEnd")}
      />
      <p className="text-xs text-gray-500">{t("privacyNote")}</p>
    </div>
  );

  const actions = (
    <div className="flex flex-wrap gap-2">
      <Button type="button" onClick={handleCopy} disabled={exporting}>
        {copied ? tc("copied") : t("copy")}
      </Button>
      <Button
        type="button"
        variant="outline"
        onClick={handleDownload}
        disabled={exporting}
      >
        {t("downloadTxt")}
      </Button>
    </div>
  );

  const previewPane = (
    <div className="space-y-3">
      <div
        className="max-h-[min(70vh,36rem)] overflow-y-auto rounded-lg border border-gray-200 bg-white p-4 text-sm leading-relaxed whitespace-pre-wrap text-gray-800"
        aria-live="polite"
      >
        {previewText}
      </div>
      {actions}
      <Callout tone="muted">
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
        <p className="text-sm text-gray-600">
          <Link
            href="/guide/bylaws"
            className="font-semibold text-opseu-blue underline underline-offset-2"
          >
            {t("guideLink")}
          </Link>
        </p>
      }
      form={formPane}
      preview={previewPane}
      previewActions={actions}
      exportError={exportError}
      exportSuccess={exportSuccess}
      footer={<ToolRelatedFooter toolSlug="bylaw-builder" />}
    />
  );
}
