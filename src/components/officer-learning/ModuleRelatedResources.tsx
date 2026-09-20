"use client";

import { useLocale, useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { useBrandStore } from "@/store/brand-store";
import { useExportHandler } from "@/hooks/use-export-handler";
import { guidePdfBrandFromKit } from "@/lib/export/text-pdf-layout";
import { resolveLocalNumber } from "@/lib/utils";
import {
  getReferenceSheets,
  getRelatedResources,
} from "@/lib/officer-learning/related-resources";
import type { ReferenceSheetId } from "@/lib/officer-learning/types";
import {
  collectChecklistItems,
  downloadAuditControlsPdf,
  downloadDisciplineRightsPdf,
  downloadEquityClausePdf,
  downloadFarSheetPdf,
  downloadFloorChecklistPdf,
  downloadMeiorinSheetPdf,
  downloadMedicalPrivacyPdf,
  downloadQuorumMotionPdf,
  downloadSettlementCornersPdf,
  downloadWorkplaceMapPdf,
  downloadCaucusBriefingPdf,
  downloadListDirectivePdf,
  downloadExpenseHardshipPdf,
  downloadTransitionChecklistPdf,
  downloadOrientationKitPdf,
  downloadDfrDutyPdf,
  downloadBumpingIntakePdf,
  downloadPdfAuditSheetPdf,
} from "@/lib/officer-learning/reference-pdf";
import type { ParsedModule } from "@/lib/officer-learning/types";
import { useOlTheme } from "./OlThemeProvider";
import clsx from "clsx";

type Props = {
  slug: string;
  module: ParsedModule;
  moduleNumber: number;
  moduleTitle: string;
  className?: string;
};

export function ModuleRelatedResources({
  slug,
  module,
  moduleNumber,
  moduleTitle,
  className,
}: Props) {
  const t = useTranslations("officerLearning");
  const olTheme = useOlTheme();
  const locale = useLocale();
  const brandKit = useBrandStore((s) => s.brandKit);
  const localLabel = `Local ${resolveLocalNumber(brandKit.local.localNumber)}`;
  const links = getRelatedResources(slug);
  const sheets = getReferenceSheets(slug);
  const { exporting, exportError, exportSuccess, runExport } = useExportHandler();
  const pdfLocale = locale === "fr" ? ("fr" as const) : ("en" as const);

  if (links.length === 0 && sheets.length === 0) return null;

  const checklistItems = collectChecklistItems(module.sections);

  const handleSheet = (id: ReferenceSheetId) => {
    void runExport(async () => {
      const ctx = {
        moduleTitle,
        localLabel,
        locale: pdfLocale,
        brand: guidePdfBrandFromKit(brandKit),
      };
      switch (id) {
        case "far-sheet":
          await downloadFarSheetPdf(ctx);
          return;
        case "discipline-rights":
          await downloadDisciplineRightsPdf(ctx);
          return;
        case "meiorin-sheet":
          await downloadMeiorinSheetPdf(ctx);
          return;
        case "quorum-motion":
          await downloadQuorumMotionPdf(ctx);
          return;
        case "audit-controls":
          await downloadAuditControlsPdf(ctx);
          return;
        case "equity-clause":
          await downloadEquityClausePdf(ctx);
          return;
        case "workplace-map":
          await downloadWorkplaceMapPdf(ctx);
          return;
        case "settlement-corners":
          await downloadSettlementCornersPdf(ctx);
          return;
        case "medical-privacy":
          await downloadMedicalPrivacyPdf(ctx);
          return;
        case "caucus-briefing":
          await downloadCaucusBriefingPdf(ctx);
          return;
        case "list-directive":
          await downloadListDirectivePdf(ctx);
          return;
        case "expense-hardship":
          await downloadExpenseHardshipPdf(ctx);
          return;
        case "transition-checklist":
          await downloadTransitionChecklistPdf(ctx);
          return;
        case "orientation-kit":
          await downloadOrientationKitPdf(ctx);
          return;
        case "dfr-duty":
          await downloadDfrDutyPdf(ctx);
          return;
        case "bumping-intake":
          await downloadBumpingIntakePdf(ctx);
          return;
        case "pdf-audit":
          await downloadPdfAuditSheetPdf(ctx);
          return;
        case "floor-checklist":
          await downloadFloorChecklistPdf({
            moduleTitle,
            moduleNumber,
            items: checklistItems,
            localLabel,
            locale: pdfLocale,
            brand: guidePdfBrandFromKit(brandKit),
          });
          return;
      }
    });
  };

  return (
    <aside
      className={clsx(olTheme.callout, "p-5 md:p-6", className)}
    >
      <h2 className={olTheme.relatedTitle}>{t("related.title")}</h2>
      <p className={olTheme.relatedIntro}>{t("related.intro")}</p>

      {links.length > 0 && (
        <ul className="mt-4 flex flex-wrap gap-2">
          {links.map((link) => (
            <li key={link.href}>
              <Link
                href={link.href}
                className={clsx(
                  "inline-flex items-center rounded-full border px-3 py-1.5 text-sm font-semibold transition",
                  link.kind === "pocket" || link.kind === "tool"
                    ? olTheme.chipPrimary
                    : olTheme.chipSecondary,
                )}
              >
                {t(`related.links.${link.labelKey}`)}
              </Link>
            </li>
          ))}
        </ul>
      )}

      {sheets.length > 0 && (
        <div className={olTheme.relatedRule}>
          <p className={olTheme.relatedSheetTitle}>
            {t("reference.title")}
          </p>
          {sheets.map((sheet) => (
            <div key={sheet.id} className={olTheme.relatedSheet}>
              <p className={olTheme.relatedSheetHeading}>{t(`reference.${sheet.titleKey}`)}</p>
              <p className={olTheme.relatedSheetBody}>
                {t(`reference.${sheet.bodyKey}`)}
              </p>
              <button
                type="button"
                disabled={exporting}
                onClick={() => handleSheet(sheet.id)}
                className={clsx(olTheme.btnPrimarySm, "mt-3")}
              >
                {exporting
                  ? t("reference.downloading")
                  : t(`reference.${sheet.ctaKey}`)}
              </button>
            </div>
          ))}
          {exportSuccess && (
            <p className={olTheme.successText} role="status">
              {t("reference.success")}
            </p>
          )}
          {exportError && (
            <p className={olTheme.errorText} role="alert">
              {t("reference.error")}
            </p>
          )}
        </div>
      )}
    </aside>
  );
}
