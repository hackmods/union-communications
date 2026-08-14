"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { useBrandStore } from "@/store/brand-store";
import { isBrandThemeEstablished } from "@/lib/utils/brand-theme";
import { TOOL_PRESETS, type ToolPresetKey } from "@/lib/constants/presets";
import { BrandSetupPrompt } from "@/components/tools/BrandSetupPrompt";
import { ToolRelatedFooter } from "@/components/tools/ToolRelatedFooter";
import { ToolEditorLayout } from "@/components/tools/ToolEditorLayout";
import { Card, CardTitle } from "@/components/ui/Card";
import { SegControl } from "@/components/tools/SegControl";
import { cn } from "@/lib/utils";

const PRESET_ORDER = Object.keys(TOOL_PRESETS) as ToolPresetKey[];

const linkBtn =
  "inline-flex min-h-11 items-center justify-center rounded-lg px-4 py-2 text-base font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-opseu-blue/40";

/**
 * Share Kit v0 — orchestrates Graphic Maker + Captions (no new canvas engine).
 * Workshop gap-fit: seed → PNG + matching caption via existing tools.
 */
export default function ShareKitPage() {
  const t = useTranslations("shareKit");
  const brandKit = useBrandStore((s) => s.brandKit);
  const onboardingComplete = useBrandStore((s) => s.onboardingComplete);
  const themeEstablished = isBrandThemeEstablished(brandKit, onboardingComplete);
  const [presetKey, setPresetKey] = useState<ToolPresetKey>("strikeAction");

  const preset = TOOL_PRESETS[presetKey];
  const graphicHref = `/tools/graphic-maker?preset=${presetKey}`;

  return (
    <ToolEditorLayout
      title={t("title")}
      description={t("subtitle")}
      purposeHint={t("whenToUse")}
      previewAccessibleName={t("previewAccessibleName")}
      toolbar={
        !themeEstablished ? (
          <BrandSetupPrompt themeEstablished={themeEstablished} />
        ) : undefined
      }
      footer={<ToolRelatedFooter toolSlug="share-kit" />}
      form={
        <Card density="compact" className="space-y-5">
          <p className="text-sm leading-snug text-gray-600">{t("intro")}</p>

          <SegControl
            label={t("seed")}
            value={presetKey}
            options={PRESET_ORDER.map((key) => ({
              value: key,
              label: TOOL_PRESETS[key].headline,
            }))}
            onChange={setPresetKey}
          />

          <ol className="list-decimal space-y-4 pl-5 text-sm text-gray-800">
            <li className="space-y-2">
              <p className="font-medium text-opseu-dark">{t("stepGraphic")}</p>
              <p className="text-gray-600">{t("stepGraphicHint")}</p>
              <Link
                href={graphicHref}
                className={cn(linkBtn, "bg-opseu-blue text-white hover:bg-opseu-dark")}
              >
                {t("openGraphic")}
              </Link>
            </li>
            <li className="space-y-2">
              <p className="font-medium text-opseu-dark">{t("stepCaption")}</p>
              <p className="text-gray-600">{t("stepCaptionHint")}</p>
              <Link
                href="/captions"
                className={cn(
                  linkBtn,
                  "border-2 border-opseu-blue text-opseu-blue hover:bg-opseu-blue/5",
                )}
              >
                {t("openCaptions")}
              </Link>
            </li>
            <li className="space-y-2">
              <p className="font-medium text-opseu-dark">{t("stepResize")}</p>
              <p className="text-gray-600">{t("stepResizeHint")}</p>
              <Link
                href="/tools/resizer"
                className={cn(
                  linkBtn,
                  "border-2 border-opseu-blue text-opseu-blue hover:bg-opseu-blue/5",
                )}
              >
                {t("openResizer")}
              </Link>
            </li>
          </ol>
        </Card>
      }
      preview={
        <Card density="compact" className="space-y-3">
          <CardTitle className="text-base">{t("previewHeading")}</CardTitle>
          <p className="text-sm text-gray-600">{t("previewBody")}</p>
          <dl className="space-y-2 text-sm">
            <div>
              <dt className="font-medium text-gray-700">{t("seedLabel")}</dt>
              <dd className="text-opseu-dark">{preset.headline}</dd>
            </div>
            <div>
              <dt className="font-medium text-gray-700">{t("subLabel")}</dt>
              <dd className="text-gray-700">{preset.subheadline}</dd>
            </div>
          </dl>
          <p className="text-xs text-gray-500">{t("deviceNote")}</p>
        </Card>
      }
    />
  );
}
