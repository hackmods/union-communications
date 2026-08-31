"use client";

import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/Button";
import { useExportHandler } from "@/hooks/use-export-handler";
import { downloadCsvAsXlsx } from "@/lib/comms/csv-to-xlsx";

type Props = {
  csvHref: string;
  downloadBasename: string;
  className?: string;
};

/** Converts a public CSV sample to Excel for stewards who prefer .xlsx. */
export function SpreadsheetXlsxButton({
  csvHref,
  downloadBasename,
  className,
}: Props) {
  const t = useTranslations("unionBoardsGuide.materials");
  const { exporting, exportError, runExport } = useExportHandler();

  const handleDownload = () => {
    void runExport(async () => {
      await downloadCsvAsXlsx(csvHref, downloadBasename);
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
        {exporting ? t("downloadingXlsx") : t("downloadXlsx")}
      </Button>
      {exportError ? (
        <p className="mt-1 text-xs text-red-700" role="alert">
          {t("spreadsheetExportError")}
        </p>
      ) : null}
    </div>
  );
}
