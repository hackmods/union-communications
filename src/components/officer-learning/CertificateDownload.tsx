"use client";

import { useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { useBrandStore } from "@/store/brand-store";
import { downloadOfficerLearningCertificate } from "@/lib/officer-learning/certificate";
import {
  BrandLogoResolveError,
  resolveConfiguredBrandLogoBytes,
} from "@/lib/export/brand-logo-bytes";
import { guidePdfBrandFromKit } from "@/lib/export/text-pdf-layout";
import { olTheme } from "@/lib/officer-learning/theme";
import { useExportHandler } from "@/hooks/use-export-handler";
import clsx from "clsx";

type Props = {
  kind: "module" | "path";
  achievementTitle: string;
  moduleNumber?: number;
  defaultName?: string;
  className?: string;
};

export function CertificateDownload({
  kind,
  achievementTitle,
  moduleNumber,
  defaultName = "",
  className,
}: Props) {
  const t = useTranslations("officerLearning.certificate");
  const tCommon = useTranslations("common");
  const locale = useLocale();
  const brandKit = useBrandStore((s) => s.brandKit);
  const localNumber = brandKit.local.localNumber;
  const [name, setName] = useState(defaultName);
  const { exporting, exportError, exportSuccess, runExport } = useExportHandler();

  const handleDownload = () => {
    void runExport(async () => {
      let logo;
      try {
        logo = await resolveConfiguredBrandLogoBytes(brandKit, {
          includeLogo: true,
          backgroundColor: "#0B132B",
        });
      } catch (err) {
        if (err instanceof BrandLogoResolveError) {
          throw new Error(tCommon("logoResolveFailed"));
        }
        throw err;
      }
      await downloadOfficerLearningCertificate({
        kind,
        recipientName: name.trim() || t("defaultName"),
        achievementTitle,
        moduleNumber,
        localNumber,
        logo,
        locale: locale === "fr" ? "fr" : "en",
        brand: guidePdfBrandFromKit(brandKit),
      });
    });
  };

  return (
    <div className={clsx(olTheme.certificatePanel, className)}>
      <p className={olTheme.certificateTitle}>{t("title")}</p>
      <p className={olTheme.certificateHint}>{t("hint")}</p>
      <label className={olTheme.certificateLabel}>
        {t("nameLabel")}
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="mt-1 w-full rounded-lg border border-white/15 bg-slate-950/50 px-3 py-2 text-white"
          placeholder={t("namePlaceholder")}
          autoComplete="name"
        />
      </label>
      <button
        type="button"
        onClick={handleDownload}
        disabled={exporting}
        className={olTheme.btnPrimarySm}
      >
        {exporting ? t("downloading") : t("download")}
      </button>
      {exportSuccess && (
        <p className="text-sm text-emerald-200" role="status">
          {t("success")}
        </p>
      )}
      {exportError && (
        <p className="text-sm text-red-200" role="alert">
          {exportError === tCommon("logoResolveFailed")
            ? exportError
            : t("error")}
        </p>
      )}
    </div>
  );
}
