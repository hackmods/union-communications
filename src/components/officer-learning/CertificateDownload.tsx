"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { useBrandStore } from "@/store/brand-store";
import { downloadOfficerLearningCertificate } from "@/lib/officer-learning/certificate";
import { resolveBrandLogoBytes } from "@/lib/export/brand-logo-bytes";
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
  const brandKit = useBrandStore((s) => s.brandKit);
  const localNumber = brandKit.local.localNumber;
  const [name, setName] = useState(defaultName);
  const { exporting, exportError, exportSuccess, runExport } = useExportHandler();

  const handleDownload = () => {
    void runExport(async () => {
      const logo = await resolveBrandLogoBytes(brandKit, {
        includeLogo: true,
        backgroundColor: "#0B132B",
      });
      await downloadOfficerLearningCertificate({
        kind,
        recipientName: name.trim() || t("defaultName"),
        achievementTitle,
        moduleNumber,
        localNumber,
        logo,
      });
    });
  };

  return (
    <div
      className={clsx(
        "space-y-3 rounded-xl border border-amber-400/25 bg-amber-500/10 p-4",
        className,
      )}
    >
      <p className="font-semibold text-amber-100">{t("title")}</p>
      <p className="text-sm text-amber-50/90">{t("hint")}</p>
      <label className="block text-sm text-amber-50/80">
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
        className="inline-flex items-center justify-center rounded-xl bg-amber-500 px-4 py-2 text-sm font-semibold text-slate-950 transition hover:bg-amber-400 disabled:opacity-60"
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
          {t("error")}
        </p>
      )}
    </div>
  );
}
