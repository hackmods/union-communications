"use client";

import { useLocale, useTranslations } from "next-intl";
import { Button } from "@/components/ui/Button";
import { useExportHandler } from "@/hooks/use-export-handler";
import { guidePdfBrandFromKit } from "@/lib/export/text-pdf-layout";
import { downloadQuorumMotionPdf } from "@/lib/officer-learning/reference-pdf";
import { resolveLocalNumber } from "@/lib/utils";
import { useBrandStore } from "@/store/brand-store";

type Props = {
  className?: string;
};

/** Pocket PDF for quorum check + blank motion lines — shared with Officer Learning module 4. */
export function RunningMeetingsReferenceSheetButton({ className }: Props) {
  const t = useTranslations("runningMeetingsGuide.referenceMaterials");
  const locale = useLocale();
  const brandKit = useBrandStore((s) => s.brandKit);
  const { exporting, exportError, exportSuccess, runExport } = useExportHandler();

  const handleDownload = () => {
    void runExport(async () => {
      const localLabel = `Local ${resolveLocalNumber(brandKit.local.localNumber)}`;
      const loc = locale === "fr" ? ("fr" as const) : ("en" as const);
      await downloadQuorumMotionPdf({
        moduleTitle: t("quorum.moduleTitle"),
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
        {exporting ? t("downloading") : t("quorum.cta")}
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
