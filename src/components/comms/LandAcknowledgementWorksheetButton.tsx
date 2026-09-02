"use client";

import { useLocale, useTranslations } from "next-intl";
import { Button } from "@/components/ui/Button";
import { useExportHandler } from "@/hooks/use-export-handler";
import { downloadLandAcknowledgementWorksheetPdf } from "@/lib/comms/land-acknowledgement-worksheet-pdf";
import { guidePdfBrandFromKit } from "@/lib/export/text-pdf-layout";
import { resolveLocalNumber } from "@/lib/utils";
import { useBrandStore } from "@/store/brand-store";

type Props = {
  className?: string;
};

/** Printable four-person land acknowledgement writing walkthrough. */
export function LandAcknowledgementWorksheetButton({ className }: Props) {
  const t = useTranslations("landAcknowledgementGuide.worksheet");
  const locale = useLocale();
  const brandKit = useBrandStore((s) => s.brandKit);
  const { exporting, exportError, runExport } = useExportHandler();

  const handleDownload = () => {
    void runExport(async () => {
      const localLabel = `Local ${resolveLocalNumber(brandKit.local.localNumber)}`;
      const loc = locale === "fr" ? ("fr" as const) : ("en" as const);
      await downloadLandAcknowledgementWorksheetPdf({
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
    </div>
  );
}
