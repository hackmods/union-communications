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

export default function GrievanceFormBuilderPage() {
  const t = useTranslations("grievanceFormBuilder");

  const form = (
    <div className="space-y-5">
      <p className="text-sm text-gray-600">{t("chooserHint")}</p>
      <div className="space-y-2">
        <Link
          href="/tools/complaint-vs-grievance"
          className={guideCtaClassSm}
        >
          {t("complaintFirst")}
        </Link>
        <p className="text-xs text-gray-600">{t("complaintFirstBlurb")}</p>
      </div>
      <div className="space-y-2">
        <Link
          href={documentGeneratorPresetHref("grievance-intake")}
          className={guideCtaClassSm}
        >
          {t("intakeSheet")}
        </Link>
        <p className="text-xs text-gray-600">{t("intakeSheetBlurb")}</p>
      </div>
      <div className="space-y-2">
        <Link
          href="/tools/rtw-accommodation"
          className={guideCtaOutlineClassSm}
        >
          {t("draftScripts")}
        </Link>
        <p className="text-xs text-gray-600">{t("draftScriptsBlurb")}</p>
      </div>
      <div className="space-y-2">
        <Link href="/app/grievances/new" className={guideCtaOutlineClassSm}>
          {t("hubFile")}
        </Link>
        <p className="text-xs text-gray-600">{t("hubFileBlurb")}</p>
      </div>
    </div>
  );

  return (
    <ToolEditorLayout
      title={t("title")}
      description={t("subtitle")}
      purposeHint={t("whenToUse")}
      form={form}
      preview={<p className="text-sm text-gray-600">{t("previewHint")}</p>}
      footer={<ToolRelatedFooter toolSlug="grievance-form-builder" />}
    />
  );
}
