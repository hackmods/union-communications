"use client";

import { useLocale, useTranslations } from "next-intl";
import { Button } from "@/components/ui/Button";
import { useExportHandler } from "@/hooks/use-export-handler";
import { guidePdfBrandFromKit } from "@/lib/export/text-pdf-layout";
import {
  downloadBylawsAdoptionChecklistPdf,
  downloadQuorumMotionPdf,
} from "@/lib/officer-learning/reference-pdf";
import { resolveLocalNumber } from "@/lib/utils";
import { useBrandStore } from "@/store/brand-store";

type SheetKind = "adoption" | "quorum";

type Props = {
  kind: SheetKind;
  className?: string;
};

/** Pocket PDF downloads for the Local Bylaws guide reference grid. */
export function BylawsReferenceSheetButton({ kind, className }: Props) {
  const t = useTranslations("bylawsGuide.referenceMaterials");
  const locale = useLocale();
  const brandKit = useBrandStore((s) => s.brandKit);
  const { exporting, exportError, exportSuccess, runExport } = useExportHandler();

  const handleDownload = () => {
    void runExport(async () => {
      const localLabel = `Local ${resolveLocalNumber(brandKit.local.localNumber)}`;
      const loc = locale === "fr" ? ("fr" as const) : ("en" as const);
      const brand = guidePdfBrandFromKit(brandKit);
      if (kind === "adoption") {
        await downloadBylawsAdoptionChecklistPdf({
          localLabel,
          locale: loc,
          brand,
        });
        return;
      }
      await downloadQuorumMotionPdf({
        moduleTitle: t("quorum.moduleTitle"),
        localLabel,
        locale: loc,
        brand,
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
