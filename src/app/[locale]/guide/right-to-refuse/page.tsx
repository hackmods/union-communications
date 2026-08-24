import type { Metadata } from "next";
import { buildPublicPageMetadata } from "@/lib/seo/public-page-meta";
import { setRequestLocale, getTranslations } from "next-intl/server";
import { SourcesBlock } from "@/components/comms/SourcesBlock";
import { GuideLayout } from "@/components/comms/GuideLayout";
import { Callout } from "@/components/ui/Callout";
import { Link } from "@/i18n/navigation";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  return buildPublicPageMetadata("/guide/right-to-refuse", params);
}

const TOC = [
  ["ontarioScope", "ontarioScope"],
  ["stageOne", "stageOne"],
  ["stageTwo", "stageTwo"],
  ["reassignment", "reassignment"],
  ["reprisal", "reprisal"],
] as const;

const sectionKeys = [
  "ontarioScope",
  "stageOne",
  "stageTwo",
  "reassignment",
  "reprisal",
] as const;

export default async function RightToRefuseGuidePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("rightToRefuseGuide");
  const ts = await getTranslations("sources");

  return (
    <GuideLayout
      title={t("title")}
      subtitle={t("subtitle")}
      intro={t("intro")}
      relatedLinks={[
        { href: "/guide", label: t("backToGuide") },
        { href: "/guide/dfr", label: t("related.dfr") },
        { href: "/guide/seniority-bumping", label: t("related.seniority") },
      ]}
      footer={
        <SourcesBlock
          pageId="rightToRefuse"
          title={ts("title")}
          intro={ts("intro")}
        />
      }
    >
      <Callout className="mb-8">
        <p className="font-semibold text-opseu-dark">{t("disclaimer.title")}</p>
        <p className="mt-2 leading-relaxed text-gray-700">
          {t("disclaimer.body")}
        </p>
      </Callout>

      <nav
        className="mb-8 flex flex-wrap gap-2"
        aria-label={t("tocLabel")}
      >
        {TOC.map(([id, key]) => (
          <a
            key={id}
            href={`#${id}`}
            className="inline-flex items-center rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-sm font-medium text-opseu-dark transition-colors hover:border-opseu-blue/40 hover:bg-opseu-blue/5"
          >
            {t(`sections.${key}.navLabel`)}
          </a>
        ))}
      </nav>

      {sectionKeys.map((key) => (
        <section
          key={key}
          id={key}
          className="scroll-mt-28 border-l-2 border-opseu-blue/30 pl-5 not-first:mt-12"
        >
          <h2 className="text-xl font-bold text-opseu-dark md:text-2xl">
            {t(`sections.${key}.title`)}
          </h2>
          <p className="mt-3 max-w-prose leading-relaxed text-gray-700">
            {t(`sections.${key}.content`)}
          </p>
          <ul className="mt-3 list-disc space-y-2 pl-5 text-gray-700">
            {(t.raw(`sections.${key}.items`) as string[]).map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </section>
      ))}

      <Callout tone="muted" className="mt-10">
        <p className="font-semibold text-opseu-dark">{t("boards.title")}</p>
        <p className="mt-2 leading-relaxed text-gray-700">
          {t("boards.body")}
        </p>
        <p className="mt-3 text-sm text-gray-700">
          <Link
            href="/tools/qr-card?preset=rightToRefuse"
            className="font-medium text-opseu-blue underline"
          >
            {t("boards.exportCta")}
          </Link>
          {" · "}
          {t("boards.exportHint")}
        </p>
      </Callout>
    </GuideLayout>
  );
}
