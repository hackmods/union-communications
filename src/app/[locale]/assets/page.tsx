import { setRequestLocale, getTranslations } from "next-intl/server";
import { Card, CardTitle } from "@/components/ui/Card";
import { BRAND_COLORS } from "@/lib/constants/brand";
import { SourcesBlock } from "@/components/comms/SourcesBlock";
import { GuideLayout } from "@/components/comms/GuideLayout";
import Image from "next/image";

export default async function AssetsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("assets");
  const ts = await getTranslations("sources");

  const swatches = [
    { name: t("swatchPrimary"), hex: BRAND_COLORS.primary },
    { name: t("swatchAccent"), hex: BRAND_COLORS.accent },
    { name: t("swatchSecondary"), hex: BRAND_COLORS.secondary },
    { name: t("swatchBlack"), hex: BRAND_COLORS.black },
  ];

  const guidelineKeys = [
    "clearSpace",
    "noDistort",
    "primary",
    "secondary",
    "contrast",
    "localMark",
    "questions",
  ] as const;

  return (
    <GuideLayout
      title={t("title")}
      intro={t("description")}
      footer={
        <SourcesBlock pageId="assets" title={ts("title")} intro={ts("intro")} />
      }
    >
      <Card>
        <CardTitle>{t("primaryLogo")}</CardTitle>
        <div className="mt-4 flex flex-wrap items-center gap-8">
          <div className="flex items-center gap-4">
            <Image
              src="/assets/caat-opseu/logo-primary.png"
              alt={t("logoAlt")}
              width={200}
              height={80}
              className="object-contain"
            />
            <a
              href="/assets/caat-opseu/logo-primary.png"
              download
              className="text-opseu-blue underline"
            >
              {t("downloadPng")}
            </a>
          </div>
          <div className="flex items-center gap-4">
            <Image
              src="/assets/caat-opseu/logo-mark.png"
              alt={t("markAlt")}
              width={72}
              height={72}
              className="object-contain"
            />
            <a
              href="/assets/caat-opseu/logo-mark.png"
              download
              className="text-opseu-blue underline"
            >
              {t("downloadMark")}
            </a>
          </div>
        </div>
      </Card>

      <Card className="mt-6">
        <CardTitle>{t("swatchesTitle")}</CardTitle>
        <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-3">
          {swatches.map((s) => (
            <div key={s.name} className="text-center">
              <div
                className="mx-auto h-16 w-16 rounded-lg border border-gray-200"
                style={{ backgroundColor: s.hex }}
              />
              <p className="mt-2 text-sm font-medium">{s.name}</p>
              <p className="text-xs text-gray-500">{s.hex}</p>
            </div>
          ))}
        </div>
      </Card>

      <Card className="mt-6">
        <CardTitle>{t("guidelinesTitle")}</CardTitle>
        <ul className="mt-3 list-disc space-y-2 pl-5 text-gray-700">
          {guidelineKeys.map((key) => (
            <li key={key}>{t(`guidelines.${key}`)}</li>
          ))}
          <li>
            {t("guidelines.sourceLabel")}{" "}
            <a
              href="https://opseu.org/information/opseu-graphics-logos-and-letterhead-templates/12263"
              target="_blank"
              rel="noopener noreferrer"
              className="text-opseu-blue underline"
            >
              OPSEU/SEFPO graphics, logos &amp; letterhead
            </a>
          </li>
        </ul>
      </Card>
    </GuideLayout>
  );
}
