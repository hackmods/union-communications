import type { Metadata } from "next";
import type { ReactNode } from "react";
import { buildPublicPageMetadata } from "@/lib/seo/public-page-meta";
import { setRequestLocale, getTranslations } from "next-intl/server";
import { GuideLayout } from "@/components/comms/GuideLayout";
import { Callout } from "@/components/ui/Callout";
import { Link } from "@/i18n/navigation";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  return buildPublicPageMetadata("/guide/steward-101", params);
}

const TOC = [
  ["threeHats", "threeHats"],
  ["representation", "representation"],
  ["dfr", "dfr"],
] as const;

const hatKeys = ["enforcer", "communicator", "organizer"] as const;
const representationKeys = ["request", "role"] as const;
const dfrKeys = ["meaning", "investigate"] as const;

const richMarks = {
  strong: (chunks: ReactNode) => (
    <strong className="font-semibold text-opseu-dark">{chunks}</strong>
  ),
  em: (chunks: ReactNode) => <em className="italic">{chunks}</em>,
};

export default async function Steward101GuidePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("steward101Guide");

  return (
    <GuideLayout
      title={t("title")}
      subtitle={t("subtitle")}
      intro={t("intro")}
      relatedLinks={[
        { href: "/guide", label: t("backToGuide") },
        { href: "/guide/grievance-process", label: t("related.grievance") },
        { href: "/guide/dfr", label: t("related.dfr") },
        { href: "/guide/workplace-mapping", label: t("related.workplaceMapping") },
        { href: "/guide/right-to-refuse", label: t("related.rightToRefuse") },
      ]}
    >
      <Callout className="mb-8">
        <p className="font-semibold text-opseu-dark">{t("disclaimer.title")}</p>
        <p className="mt-2 leading-relaxed text-gray-700">
          {t("disclaimer.body")}
        </p>
      </Callout>

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
        id="threeHats"
        title={t("threeHats.title")}
        intro={t("threeHats.intro")}
      >
        <ol className="mt-4 list-decimal space-y-4 pl-5 text-gray-700">
          {hatKeys.map((key) => (
            <li key={key} className="max-w-prose leading-relaxed">
              <span className="font-semibold text-opseu-dark">
                {t(`threeHats.items.${key}.label`)}
              </span>
              {" — "}
              {t.rich(`threeHats.items.${key}.content`, richMarks)}
            </li>
          ))}
        </ol>
      </GuideSection>

      <GuideSection
        id="representation"
        title={t("representation.title")}
        intro={t("representation.intro")}
      >
        <ul className="mt-4 list-disc space-y-3 pl-5 text-gray-700">
          {representationKeys.map((key) => (
            <li key={key} className="max-w-prose leading-relaxed">
              {t.rich(`representation.items.${key}`, richMarks)}
            </li>
          ))}
        </ul>
      </GuideSection>

      <GuideSection id="dfr" title={t("dfr.title")} intro={t("dfr.intro")}>
        <ul className="mt-4 list-disc space-y-3 pl-5 text-gray-700">
          {dfrKeys.map((key) => (
            <li key={key} className="max-w-prose leading-relaxed">
              {t.rich(`dfr.items.${key}`, richMarks)}
            </li>
          ))}
        </ul>
        <Callout className="mt-5 max-w-prose">
          <p className="font-semibold text-opseu-dark">{t("goldenRule.title")}</p>
          <p className="mt-2 leading-relaxed text-gray-700">
            {t("goldenRule.body")}
          </p>
        </Callout>
      </GuideSection>

      <Callout tone="muted" className="mt-10">
        <p className="font-semibold text-opseu-dark">{t("next.title")}</p>
        <p className="mt-2 leading-relaxed text-gray-700">{t("next.body")}</p>
        <nav
          className="mt-3 flex flex-wrap items-baseline gap-x-3 gap-y-1"
          aria-label={t("next.title")}
        >
          <Link
            href="/guide/grievance-process"
            className="font-medium text-opseu-blue underline underline-offset-2 hover:text-opseu-dark"
          >
            {t("related.grievance")}
          </Link>
          <span className="text-gray-300" aria-hidden="true">
            ·
          </span>
          <Link
            href="/guide/dfr"
            className="font-medium text-opseu-blue underline underline-offset-2 hover:text-opseu-dark"
          >
            {t("related.dfr")}
          </Link>
        </nav>
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
  intro: string;
  children: React.ReactNode;
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
