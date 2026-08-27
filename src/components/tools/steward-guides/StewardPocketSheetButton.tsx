"use client";

import { useLocale, useTranslations } from "next-intl";
import { Button } from "@/components/ui/Button";
import { useExportHandler } from "@/hooks/use-export-handler";
import {
  downloadDisciplineRightsPdf,
  downloadFarSheetPdf,
  downloadMeiorinSheetPdf,
} from "@/lib/officer-learning/reference-pdf";
import { resolveLocalNumber } from "@/lib/utils";
import { useBrandStore } from "@/store/brand-store";

export type StewardPocketSheetKind = "far" | "discipline" | "meiorin";

type Props = {
  kind: StewardPocketSheetKind;
  /** Module title shown on the PDF subtitle line. */
  moduleTitle: string;
  className?: string;
};

export function StewardPocketSheetButton({
  kind,
  moduleTitle,
  className,
}: Props) {
  const t = useTranslations("stewardGuidesShared");
  const locale = useLocale();
  const localNumber = useBrandStore((s) => s.brandKit.local.localNumber);
  const { exporting, exportError, runExport } = useExportHandler();

  const handleDownload = () => {
    void runExport(async () => {
      const ctx = {
        moduleTitle,
        localLabel: `Local ${resolveLocalNumber(localNumber)}`,
        locale: locale === "fr" ? ("fr" as const) : ("en" as const),
      };
      switch (kind) {
        case "far":
          await downloadFarSheetPdf(ctx);
          return;
        case "discipline":
          await downloadDisciplineRightsPdf(ctx);
          return;
        case "meiorin":
          await downloadMeiorinSheetPdf(ctx);
          return;
      }
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
        {exporting ? t("pocketSheetDownloading") : t(`pocketSheet.${kind}`)}
      </Button>
      {exportError ? (
        <p className="mt-1 text-xs text-red-700" role="alert">
          {t("pocketSheetError")}
        </p>
      ) : null}
    </div>
  );
}
