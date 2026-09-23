"use client";

import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { ToolEditorLayout } from "@/components/tools/ToolEditorLayout";
import { ToolRelatedFooter } from "@/components/tools/ToolRelatedFooter";
import { documentGeneratorPresetHref } from "@/lib/constants/document-generator-links";
import { guideCtaClassSm, guideCtaOutlineClassSm } from "@/components/comms/guideCtaClasses";

const LETTER_PRESETS = [
  "simple-letter",
  "welcome-letter",
  "letterhead",
] as const;

export default function LetterGeneratorPage() {
  const t = useTranslations("letterGenerator");

  const form = (
    <div className="space-y-4">
      <p className="text-sm text-gray-600">{t("chooserHint")}</p>
      <ul className="space-y-3">
        {LETTER_PRESETS.map((id) => (
          <li key={id}>
            <Link
              href={documentGeneratorPresetHref(id)}
              className={guideCtaClassSm}
            >
              {t(`presets.${id}`)}
            </Link>
            <p className="mt-1 text-xs text-gray-600">{t(`blurbs.${id}`)}</p>
          </li>
        ))}
      </ul>
      <Link
        href="/tools/document-generator"
        className={guideCtaOutlineClassSm}
      >
        {t("openFull")}
      </Link>
    </div>
  );

  return (
    <ToolEditorLayout
      title={t("title")}
      description={t("subtitle")}
      purposeHint={t("whenToUse")}
      form={form}
      preview={
        <p className="text-sm text-gray-600">{t("previewHint")}</p>
      }
      footer={<ToolRelatedFooter toolSlug="letter-generator" />}
    />
  );
}
