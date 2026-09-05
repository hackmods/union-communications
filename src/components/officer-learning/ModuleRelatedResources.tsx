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
  downloadQuorumMotionPdf,
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
      <h2 className="text-xl font-bold text-white">{t("related.title")}</h2>
      <p className="mt-2 text-sm text-slate-200">{t("related.intro")}</p>

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
        <div className="mt-5 space-y-3 border-t border-white/10 pt-4">
          <p className="text-sm font-semibold text-orange-100">
            {t("reference.title")}
          </p>
          {sheets.map((sheet) => (
            <div key={sheet.id} className="rounded-xl border border-white/10 bg-slate-950/40 p-3">
              <p className="font-semibold text-white">{t(`reference.${sheet.titleKey}`)}</p>
              <p className="mt-1 text-sm text-slate-300">
                {t(`reference.${sheet.bodyKey}`)}
              </p>
              <button
                type="button"
                disabled={exporting}
                onClick={() => handleSheet(sheet.id)}
                className="mt-3 inline-flex rounded-lg bg-opseu-blue px-3 py-2 text-sm font-semibold text-white transition hover:bg-opseu-dark disabled:opacity-60"
              >
                {exporting
                  ? t("reference.downloading")
                  : t(`reference.${sheet.ctaKey}`)}
              </button>
            </div>
          ))}
          {exportSuccess && (
            <p className="text-sm text-emerald-200" role="status">
              {t("reference.success")}
            </p>
          )}
          {exportError && (
            <p className="text-sm text-red-200" role="alert">
              {t("reference.error")}
            </p>
          )}
        </div>
      )}
    </aside>
  );
}
