"use client";

import { useLocale, useTranslations } from "next-intl";
import { Button } from "@/components/ui/Button";
import { useExportHandler } from "@/hooks/use-export-handler";
import { downloadBoardReferencePdf } from "@/lib/comms/board-reference-pdf";
import { guidePdfBrandFromKit } from "@/lib/export/text-pdf-layout";
import { resolveLocalNumber } from "@/lib/utils";
import type { BoardPdfReferenceId } from "@/lib/constants/board-materials";
import { useBrandStore } from "@/store/brand-store";

type Props = {
  kind: BoardPdfReferenceId;
  className?: string;
};

/** Branded PDF downloads for Union Boards guide local templates. */
export function BoardReferenceSheetButton({ kind, className }: Props) {
  const t = useTranslations("unionBoardsGuide.referenceMaterials");
  const locale = useLocale();
  const brandKit = useBrandStore((s) => s.brandKit);
  const { exporting, exportError, exportSuccess, runExport } = useExportHandler();

  const handleDownload = () => {
    void runExport(async () => {
      const localLabel = `Local ${resolveLocalNumber(brandKit.local.localNumber)}`;
      await downloadBoardReferencePdf({
        kind,
        localLabel,
        locale: locale === "fr" ? "fr" : "en",
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
        {exporting ? t("downloading") : t(`${kind}.cta`)}
      </Button>
      {exportError ? (
        <p className="mt-1 text-xs text-red-700" role="alert">
          {t("exportError")}
        </p>
      ) : null}
      {exportSuccess ? (
        <p className="mt-1 text-xs text-emerald-700" role="status">
          {exportSuccess}
        </p>
      ) : null}
    </div>
  );
}
