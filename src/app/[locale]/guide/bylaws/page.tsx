import type { Metadata } from "next";
import { buildPublicPageMetadata } from "@/lib/seo/public-page-meta";
import { setRequestLocale, getTranslations } from "next-intl/server";
import { SourcesBlock } from "@/components/comms/SourcesBlock";
import { GuideLayout } from "@/components/comms/GuideLayout";
import { Callout } from "@/components/ui/Callout";
import { Button } from "@/components/ui/Button";
import { Link } from "@/i18n/navigation";
import { OfficerLearningModuleCallout } from "@/components/officer-learning/OfficerLearningModuleCallout";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  return buildPublicPageMetadata("/guide/bylaws", params);
}

const TOC = [
  ["mustHave", "mustHave"],
  ["amend", "amend"],
  ["builder", "builder"],
] as const;

const mustHaveKeys = [
  "executive",
  "quorum",
  "signing",
  "elections",
] as const;
const amendKeys = ["notice", "gmm", "threshold", "approval"] as const;

export default async function BylawsGuidePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("bylawsGuide");
  const nav = await getTranslations("nav");
  const ts = await getTranslations("sources");

  return (
    <GuideLayout
      title={t("title")}
      subtitle={t("subtitle")}
      intro={t("intro")}
      relatedLinks={[
        { href: "/guide/steward-playbooks", label: t("backToPlaybooks") },
        { href: "/guide", label: t("backToGuide") },
        { href: "/guide/officer-learning", label: t("related.officerLearning") },
        {
          href: "/guide/officer-learning/democratic-governance",
          label: t("related.governance"),
        },
        { href: "/tools/bylaw-builder", label: nav("bylawBuilder") },
        { href: "/tools/org-chart", label: nav("orgChart") },
      ]}
      footer={
        <SourcesBlock
          pageId="bylaws"
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

      <OfficerLearningModuleCallout
        slug="democratic-governance"
        moduleNumber={4}
      />

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
        id="mustHave"
        title={t("mustHave.title")}
        intro={t("mustHave.intro")}
      >
        <ul className="mt-4 list-disc space-y-3 pl-5 text-gray-700">
          {mustHaveKeys.map((key) => (
            <TipItem
              key={key}
              label={t(`mustHave.items.${key}.label`)}
              content={t(`mustHave.items.${key}.content`)}
            />
          ))}
        </ul>
        <Callout className="mt-5 max-w-prose">
          <p className="font-semibold text-opseu-dark">{t("tipLabel")}</p>
          <p className="mt-1">{t("mustHave.tip")}</p>
        </Callout>
      </GuideSection>

      <GuideSection id="amend" title={t("amend.title")} intro={t("amend.intro")}>
        <ol className="mt-4 list-decimal space-y-4 pl-5 text-gray-700">
          {amendKeys.map((key) => (
            <li key={key} className="max-w-prose leading-relaxed">
              <span className="font-semibold text-opseu-dark">
                {t(`amend.items.${key}.label`)}
              </span>
              {" — "}
              {t(`amend.items.${key}.content`)}
            </li>
          ))}
        </ol>
        <Callout tone="warning" className="mt-5 max-w-prose">
          <p className="font-semibold text-amber-950">
            {t("amend.warningTitle")}
          </p>
          <p className="mt-1">{t("amend.warning")}</p>
        </Callout>
      </GuideSection>

      <section
        id="builder"
        className="mt-12 scroll-mt-28 border-l-2 border-opseu-blue/30 pl-5"
      >
        <h2 className="text-xl font-bold text-opseu-dark md:text-2xl">
          {t("builder.title")}
        </h2>
        <p className="mt-3 max-w-prose leading-relaxed text-gray-700">
          {t("builder.intro")}
        </p>
        <div className="button-row mt-5 max-w-lg">
          <Link href="/tools/bylaw-builder">
            <Button>{nav("bylawBuilder")}</Button>
          </Link>
          <Link href="/tools/document-generator?preset=letterhead">
            <Button variant="outline">{nav("documentGenerator")}</Button>
          </Link>
        </div>
      </section>
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

function TipItem({ label, content }: { label: string; content: string }) {
  return (
    <li className="max-w-prose leading-relaxed">
      <span className="font-semibold text-opseu-dark">{label}.</span> {content}
    </li>
  );
}
