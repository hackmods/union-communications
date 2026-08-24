import type { Metadata } from "next";
import { buildPublicPageMetadata } from "@/lib/seo/public-page-meta";
import { setRequestLocale, getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/Button";
import { SourcesBlock } from "@/components/comms/SourcesBlock";
import { GuideLayout } from "@/components/comms/GuideLayout";
import { Callout } from "@/components/ui/Callout";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  return buildPublicPageMetadata("/guide/photo-consent", params);
}

const tierKeys = ["rally", "meeting", "workplace"] as const;

const checklistKeys = [
  "consent",
  "public",
  "confidential",
  "group",
  "minors",
  "background",
  "location",
  "withdrawal",
] as const;

export default async function PhotoConsentGuidePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("photoConsentGuide");
  const nav = await getTranslations("nav");
  const ts = await getTranslations("sources");

  return (
    <GuideLayout
      title={t("title")}
      subtitle={t("subtitle")}
      intro={t("intro")}
      relatedLinks={[
        { href: "/guide", label: t("backToGuide") },
        { href: "/guide/short-form", label: nav("shortFormGuide") },
      ]}
      footer={
        <SourcesBlock
          pageId="photoConsent"
          title={ts("title")}
          intro={ts("intro")}
        />
      }
    >
      <div className="space-y-8">
        <section className="border-l-2 border-opseu-blue/30 pl-5">
          <h2 className="text-xl font-bold text-opseu-dark">{t("why.title")}</h2>
          <p className="mt-3 max-w-prose leading-relaxed text-gray-700">
            {t("why.content")}
          </p>
          <Callout tone="warning" className="mt-5 max-w-prose">
            <p className="font-semibold text-amber-950">
              {t("why.retaliationTitle")}
            </p>
            <p className="mt-1">{t("why.retaliationBody")}</p>
          </Callout>
        </section>

        <section className="border-l-2 border-opseu-blue/30 pl-5">
          <h2 className="text-xl font-bold text-opseu-dark">{t("tiers.title")}</h2>
          <p className="mt-3 max-w-prose leading-relaxed text-gray-700">
            {t("tiers.intro")}
          </p>
          <ul className="mt-4 list-disc space-y-3 pl-5 text-gray-700">
            {tierKeys.map((key) => (
              <li key={key} className="max-w-prose leading-relaxed">
                <span className="font-semibold text-opseu-dark">
                  {t(`tiers.items.${key}.label`)}.
                </span>{" "}
                {t(`tiers.items.${key}.content`)}
              </li>
            ))}
          </ul>
        </section>

        <section className="border-l-2 border-opseu-blue/30 pl-5">
          <h2 className="text-xl font-bold text-opseu-dark">
            {t("takedown.title")}
          </h2>
          <Callout className="mt-4 max-w-prose">
            <p className="font-semibold text-opseu-dark">{t("takedown.rule")}</p>
            <p className="mt-2 leading-relaxed text-gray-700">
              {t("takedown.who")}
            </p>
          </Callout>
        </section>

        <section className="border-l-2 border-opseu-blue/30 pl-5">
          <h2 className="text-xl font-bold text-opseu-dark">
            {t("checklist.title")}
          </h2>
          <p className="mt-3 max-w-prose leading-relaxed text-gray-700">
            {t("checklist.intro")}
          </p>
          <ul className="mt-3 list-disc space-y-2 pl-5 text-gray-700">
            {checklistKeys.map((key) => (
              <li key={key} className="max-w-prose leading-relaxed">
                {t(`checklist.items.${key}`)}
              </li>
            ))}
          </ul>
        </section>

        <section className="border-l-2 border-opseu-blue/30 pl-5">
          <h2 className="text-xl font-bold text-opseu-dark">
            {t("privacy.title")}
          </h2>
          <p className="mt-3 max-w-prose leading-relaxed text-gray-700">
            {t("privacy.content")}
          </p>
          <ul className="mt-3 list-disc space-y-2 pl-5 text-gray-700">
            {(t.raw("privacy.items") as string[]).map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </section>

        <Callout>
          <p className="font-semibold text-opseu-dark">{t("toolbox.title")}</p>
          <p className="mt-2 leading-relaxed text-gray-700">
            {t("toolbox.content")}
          </p>
        </Callout>

        <Callout tone="muted">
          <p className="font-semibold text-opseu-dark">{t("workshop.title")}</p>
          <p className="mt-2 leading-relaxed text-gray-700">
            {t("workshop.content")}
          </p>
        </Callout>
      </div>

      <div className="button-row mt-8 max-w-lg">
        <Link href="/tools/graphic-maker">
          <Button variant="outline">{nav("graphicMaker")}</Button>
        </Link>
        <Link href="/privacy">
          <Button variant="outline">{nav("privacy")}</Button>
        </Link>
        <Link href="/guide/resources">
          <Button variant="outline">{nav("resources")}</Button>
        </Link>
      </div>
    </GuideLayout>
  );
}
