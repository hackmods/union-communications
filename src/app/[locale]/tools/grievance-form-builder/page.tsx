"use client";

import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { ToolEditorLayout } from "@/components/tools/ToolEditorLayout";
import { ToolRelatedFooter } from "@/components/tools/ToolRelatedFooter";
import { documentGeneratorPresetHref } from "@/lib/constants/document-generator-links";
import {
  guideCtaClassSm,
  guideCtaOutlineClassSm,
} from "@/components/comms/guideCtaClasses";

const PATHS = [
  {
    id: "complaintFirst" as const,
    href: "/tools/complaint-vs-grievance",
    primary: true,
  },
  {
    id: "intakeSheet" as const,
    href: documentGeneratorPresetHref("grievance-intake"),
    primary: true,
  },
  {
    id: "draftScripts" as const,
    href: "/tools/rtw-accommodation?mode=grievanceDraft",
    primary: false,
  },
  {
    id: "hubFile" as const,
    href: "/app/grievances/new",
    primary: false,
  },
] as const;

export default function GrievanceFormBuilderPage() {
  const t = useTranslations("grievanceFormBuilder");

  const form = (
    <div className="space-y-5">
      <p className="text-sm text-gray-600">{t("chooserHint")}</p>
      {PATHS.map((path) => (
        <div key={path.id} className="space-y-2">
          <Link
            href={path.href}
            className={path.primary ? guideCtaClassSm : guideCtaOutlineClassSm}
          >
            {t(path.id)}
          </Link>
          <p className="text-xs text-gray-600">{t(`${path.id}Blurb`)}</p>
        </div>
      ))}
    </div>
  );

  const preview = (
    <div className="space-y-3 rounded-xl border border-dashed border-slate-300 bg-slate-50 p-4 text-sm text-slate-700">
      <p className="font-semibold text-opseu-dark">{t("previewTitle")}</p>
      <p>{t("previewBody")}</p>
    </div>
  );

  return (
    <ToolEditorLayout
      title={t("title")}
      description={t("subtitle")}
      purposeHint={t("whenToUse")}
      form={form}
      preview={preview}
      footer={<ToolRelatedFooter toolSlug="grievance-form-builder" />}
    />
  );
}
