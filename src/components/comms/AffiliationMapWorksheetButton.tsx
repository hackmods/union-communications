"use client";

import { useLocale, useTranslations } from "next-intl";
import { Button } from "@/components/ui/Button";
import { useExportHandler } from "@/hooks/use-export-handler";
import { downloadAffiliationMapWorksheetPdf } from "@/lib/comms/affiliation-map-worksheet-pdf";
import { guidePdfBrandFromKit } from "@/lib/export/text-pdf-layout";
import { resolveLocalNumber } from "@/lib/utils";
import { useBrandStore } from "@/store/brand-store";

type Props = {
  className?: string;
};

/** Printable two-track affiliation map (pen-and-paper floor handout). */
export function AffiliationMapWorksheetButton({ className }: Props) {
  const t = useTranslations("unionHistoryGuide.worksheet");
  const locale = useLocale();
  const brandKit = useBrandStore((s) => s.brandKit);
  const { exporting, exportError, exportSuccess, runExport } = useExportHandler();

  const handleDownload = () => {
    void runExport(async () => {
      const localLabel = `Local ${resolveLocalNumber(brandKit.local.localNumber)}`;
      const loc = locale === "fr" ? ("fr" as const) : ("en" as const);
      await downloadAffiliationMapWorksheetPdf({
        localLabel,
        locale: loc,
        brand: guidePdfBrandFromKit(brandKit),
      });
    });
  };

  return (
    <div className={className}>
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="min-h-11"
        disabled={exporting}
        onClick={handleDownload}
      >
        {exporting ? t("downloading") : t("cta")}
      </Button>
      {exportError ? (
        <p className="mt-2 text-sm text-amber-800">{exportError}</p>
      ) : null}
      {exportSuccess ? (
        <p className="mt-2 text-sm text-emerald-800" role="status">
          {exportSuccess}
        </p>
      ) : null}
    </div>
  );
}
