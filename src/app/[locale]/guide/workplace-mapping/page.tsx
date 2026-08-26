import type { Metadata } from "next";
import type { ReactNode } from "react";
import { buildPublicPageMetadata } from "@/lib/seo/public-page-meta";
import { setRequestLocale, getTranslations } from "next-intl/server";
import { SourcesBlock } from "@/components/comms/SourcesBlock";
import { GuideLayout } from "@/components/comms/GuideLayout";
import { Callout } from "@/components/ui/Callout";
import { Button } from "@/components/ui/Button";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  return buildPublicPageMetadata("/guide/workplace-mapping", params);
}

const TEMPLATE_HREF = "/templates/unionops-workplace-map.csv";
const TEMPLATE_DOWNLOAD = "unionops-workplace-map.csv";

const TOC = [
  ["physical", "physical"],
  ["social", "social"],
  ["scale", "scale"],
] as const;

const physicalKeys = ["department", "shift", "location", "breaks"] as const;
const socialKeys = ["policy", "gifts", "newHires"] as const;
const scaleKeys = ["one", "two", "three", "four", "five"] as const;

const richMarks = {
  strong: (chunks: ReactNode) => (
    <strong className="font-semibold text-opseu-dark">{chunks}</strong>
  ),
};

export default async function WorkplaceMappingGuidePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("workplaceMappingGuide");
  const ts = await getTranslations("sources");

  return (
    <GuideLayout
      title={t("title")}
      subtitle={t("subtitle")}
      intro={t("intro")}
      relatedLinks={[
        { href: "/guide", label: t("backToGuide") },
        { href: "/guide/steward-101", label: t("related.steward101") },
        { href: "/guide/membership-signup", label: t("related.membership") },
        { href: "/guide/union-boards", label: t("related.boards") },
        { href: "/guide/grievance-process", label: t("related.grievance") },
      ]}
      footer={
        <SourcesBlock
          pageId="workplaceMapping"
          title={ts("title")}
          intro={ts("intro")}
        />
      }
    >
      <Callout tone="warning" className="mb-8 max-w-prose">
        <p className="font-semibold text-amber-950">{t("sensitive.title")}</p>
        <p className="mt-2 leading-relaxed">{t.rich("sensitive.body", richMarks)}</p>
      </Callout>

      <div className="mb-8">
        <a
          href={TEMPLATE_HREF}
          download={TEMPLATE_DOWNLOAD}
          className="inline-block"
        >
          <Button size="lg">{t("downloadCta")}</Button>
        </a>
        <p className="mt-2 max-w-prose text-sm text-gray-600">
          {t("downloadHint")}
        </p>
      </div>

      <nav className="mb-8 flex flex-wrap gap-2" aria-label={t("tocLabel")}>
        {TOC.map(([id, key]) => (
          <a
            key={id}
            href={`#${id}`}
            className="inline-flex items-center rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-sm font-medium text-opseu-dark transition-colors hover:border-opseu-blue/40 hover:bg-opseu-blue/5"
          >
            {t(`${key}.navLabel`)}
          </a>
        ))}
      </nav>

      <GuideSection
        id="physical"
        title={t("physical.title")}
        intro={t("physical.intro")}
      >
        <ul className="mt-4 list-disc space-y-3 pl-5 text-gray-700">
          {physicalKeys.map((key) => (
            <li key={key} className="max-w-prose leading-relaxed">
              {t(`physical.items.${key}`)}
            </li>
          ))}
        </ul>
        <Callout className="mt-5 max-w-prose">
          <p className="font-semibold text-opseu-dark">{t("tipLabel")}</p>
          <p className="mt-1">{t("physical.blindSpot")}</p>
        </Callout>
      </GuideSection>

      <GuideSection
        id="social"
        title={t("social.title")}
        intro={t.rich("social.intro", richMarks)}
      >
        <ul className="mt-4 list-disc space-y-3 pl-5 text-gray-700">
          {socialKeys.map((key) => (
            <li key={key} className="max-w-prose leading-relaxed">
              {t(`social.items.${key}`)}
            </li>
          ))}
        </ul>
        <Callout className="mt-5 max-w-prose">
          <p className="font-semibold text-opseu-dark">{t("tipLabel")}</p>
          <p className="mt-1">{t("social.goal")}</p>
        </Callout>
      </GuideSection>

      <GuideSection
        id="scale"
        title={t("scale.title")}
        intro={t("scale.intro")}
      >
        <ul className="mt-4 list-disc space-y-3 pl-5 text-gray-700">
          {scaleKeys.map((key) => (
            <li key={key} className="max-w-prose leading-relaxed">
              <span className="font-semibold text-opseu-dark">
                {t(`scale.items.${key}.label`)}
              </span>{" "}
              {t(`scale.items.${key}.content`)}
            </li>
          ))}
        </ul>
      </GuideSection>

      <Callout tone="warning" className="mt-10 max-w-prose">
        <p className="font-semibold text-amber-950">{t("privacy.title")}</p>
        <p className="mt-2 leading-relaxed">{t("privacy.body")}</p>
      </Callout>
    </GuideLayout>
  );
}

function GuideSection({
  id,
  title,
  intro,
  children,
}: {
  id: string;
  title: string;
  intro: ReactNode;
  children: ReactNode;
}) {
  return (
    <section
      id={id}
      className="scroll-mt-28 border-l-2 border-opseu-blue/30 pl-5 not-first:mt-12"
    >
      <h2 className="text-xl font-bold text-opseu-dark md:text-2xl">{title}</h2>
      <p className="mt-3 max-w-prose leading-relaxed text-gray-700">{intro}</p>
      {children}
    </section>
  );
}
