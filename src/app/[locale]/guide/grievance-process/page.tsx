import type { Metadata } from "next";
import type { ReactNode } from "react";
import { buildPublicPageMetadata } from "@/lib/seo/public-page-meta";
import { setRequestLocale, getTranslations } from "next-intl/server";
import { SourcesBlock } from "@/components/comms/SourcesBlock";
import { GuideLayout } from "@/components/comms/GuideLayout";
import { Callout } from "@/components/ui/Callout";
import { Button } from "@/components/ui/Button";
import { Link } from "@/i18n/navigation";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  return buildPublicPageMetadata("/guide/grievance-process", params);
}

const TOC = [
  ["investigation", "investigation"],
  ["steps", "steps"],
] as const;

const sixWKeys = ["who", "what", "where", "when", "why", "want"] as const;
const stepKeys = ["informal", "written", "arbitration"] as const;

const richMarks = {
  strong: (chunks: ReactNode) => (
    <strong className="font-semibold text-opseu-dark">{chunks}</strong>
  ),
};

export default async function GrievanceProcessGuidePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("grievanceGuide");
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
        { href: "/guide/right-to-refuse", label: t("related.rightToRefuse") },
      ]}
      footer={
        <SourcesBlock
          pageId="grievanceProcess"
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
        id="investigation"
        title={t("investigation.title")}
        intro={t("investigation.intro")}
      >
        <ul className="mt-4 list-disc space-y-3 pl-5 text-gray-700">
          {sixWKeys.map((key) => (
            <TipItem
              key={key}
              label={t(`investigation.items.${key}.label`)}
              content={t(`investigation.items.${key}.content`)}
            />
          ))}
        </ul>
        <Callout className="mt-5 max-w-prose">
          <p className="font-semibold text-opseu-dark">{t("tipLabel")}</p>
          <p className="mt-1">{t("investigation.tip")}</p>
        </Callout>
      </GuideSection>

      <GuideSection
        id="steps"
        title={t("steps.title")}
        intro={t("steps.intro")}
      >
        <Callout tone="warning" className="mt-5 max-w-prose">
          <p className="font-semibold text-amber-950">
            {t("steps.warningTitle")}
          </p>
          <p className="mt-1">{t("steps.warning")}</p>
        </Callout>

        {stepKeys.map((key) => (
          <div key={key} className="mt-8">
            <h3 className="text-lg font-bold text-opseu-dark">
              {t(`steps.${key}.title`)}
            </h3>
            <p className="mt-2 max-w-prose leading-relaxed text-gray-700">
              {t.rich(`steps.${key}.body`, richMarks)}
            </p>
            {key === "written" ? (
              <Callout tone="warning" className="mt-4 max-w-prose">
                <p className="font-semibold text-amber-950">
                  {t("steps.written.warningTitle")}
                </p>
                <p className="mt-1">{t("steps.written.warning")}</p>
              </Callout>
            ) : null}
          </div>
        ))}
      </GuideSection>

      <Callout tone="muted" className="mt-10">
        <p className="font-semibold text-opseu-dark">{t("hub.title")}</p>
        <p className="mt-2 leading-relaxed text-gray-700">{t("hub.body")}</p>
        <div className="button-row mt-4">
          <Link href="/app/grievances">
            <Button>{t("hub.cta")}</Button>
          </Link>
        </div>
      </Callout>

      <Callout tone="warning" className="mt-8">
        <p className="font-semibold text-amber-950">{t("legal.title")}</p>
        <p className="mt-2 leading-relaxed text-gray-700">{t("legal.body")}</p>
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

function TipItem({ label, content }: { label: string; content: string }) {
  return (
    <li className="max-w-prose leading-relaxed">
      <span className="font-semibold text-opseu-dark">{label}.</span> {content}
    </li>
  );
}
