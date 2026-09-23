"use client";

import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { ToolEditorLayout } from "@/components/tools/ToolEditorLayout";
import { ToolRelatedFooter } from "@/components/tools/ToolRelatedFooter";
import {
  guideCtaClassSm,
  guideCtaOutlineClassSm,
} from "@/components/comms/guideCtaClasses";

export default function KeepLearningPage() {
  const t = useTranslations("keepLearning");

  const form = (
    <div className="space-y-4">
      <p className="text-sm text-gray-600">{t("chooserHint")}</p>
      <Link href="/learn" className={guideCtaClassSm}>
        {t("openLearn")}
      </Link>
      <Link href="/learn/steward" className={guideCtaOutlineClassSm}>
        {t("stewardPath")}
      </Link>
      <Link href="/learn/officer" className={guideCtaOutlineClassSm}>
        {t("officerPath")}
      </Link>
    </div>
  );

  return (
    <ToolEditorLayout
      title={t("title")}
      description={t("subtitle")}
      purposeHint={t("whenToUse")}
      form={form}
      preview={<p className="text-sm text-gray-600">{t("previewHint")}</p>}
      footer={<ToolRelatedFooter toolSlug="keep-learning" />}
    />
  );
}
