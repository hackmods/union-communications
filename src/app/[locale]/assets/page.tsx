import { setRequestLocale, getTranslations } from "next-intl/server";
import { Callout } from "@/components/ui/Callout";
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
      <section className="border-l-2 border-opseu-blue/30 pl-5">
        <h2 className="text-xl font-bold text-opseu-dark">{t("primaryLogo")}</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <div className="flex items-center gap-4 rounded-lg border border-gray-200 bg-white px-4 py-3">
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
              className="text-sm font-medium text-opseu-blue underline"
            >
              {t("downloadPng")}
            </a>
          </div>
          <div className="flex items-center gap-4 rounded-lg border border-gray-200 bg-white px-4 py-3">
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
              className="text-sm font-medium text-opseu-blue underline"
            >
              {t("downloadMark")}
            </a>
          </div>
        </div>
      </section>

      <section className="mt-8 border-l-2 border-opseu-blue/30 pl-5">
        <h2 className="text-xl font-bold text-opseu-dark">{t("swatchesTitle")}</h2>
        <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {swatches.map((s) => (
            <div key={s.name} className="text-center">
              <div
                className="mx-auto h-14 w-14 rounded-lg border border-gray-200"
                style={{ backgroundColor: s.hex }}
              />
              <p className="mt-2 text-sm font-medium">{s.name}</p>
              <p className="text-xs text-gray-500">{s.hex}</p>
            </div>
          ))}
        </div>
      </section>

      <Callout tone="muted" className="mt-8">
        <p className="font-semibold text-opseu-dark">{t("guidelinesTitle")}</p>
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
      </Callout>
    </GuideLayout>
  );
}
