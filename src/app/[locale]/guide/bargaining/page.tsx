import type { Metadata } from "next";
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
  return buildPublicPageMetadata("/guide/bargaining", params);
}

const TOC = [
  ["prep", "prep"],
  ["table", "table"],
  ["dispute", "dispute"],
  ["ratify", "ratify"],
] as const;

const prepKeys = ["survey", "demand", "notice"] as const;
const tableKeys = ["exchange", "blackout", "tracking"] as const;
const disputeKeys = ["conciliation", "strikeVote", "noBoard"] as const;
const ratifyKeys = ["ta", "ratification", "signing"] as const;

export default async function BargainingGuidePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("bargainingGuide");
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
        { href: "/guide/crisis", label: nav("strikeGuide") },
        { href: "/guide/email-broadcast", label: nav("emailBroadcastGuide") },
        { href: "/tools/proposal-tracker", label: nav("proposalTracker") },
      ]}
      footer={
        <SourcesBlock
          pageId="bargaining"
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

      <GuideSection id="prep" title={t("prep.title")} intro={t("prep.intro")}>
        <ul className="mt-4 list-disc space-y-3 pl-5 text-gray-700">
          {prepKeys.map((key) => (
            <TipItem
              key={key}
              label={t(`prep.items.${key}.label`)}
              content={t(`prep.items.${key}.content`)}
            />
          ))}
        </ul>
      </GuideSection>

      <GuideSection id="table" title={t("table.title")} intro={t("table.intro")}>
        <ul className="mt-4 list-disc space-y-3 pl-5 text-gray-700">
          {tableKeys.map((key) => (
            <TipItem
              key={key}
              label={t(`table.items.${key}.label`)}
              content={t(`table.items.${key}.content`)}
            />
          ))}
        </ul>
        <Callout tone="muted" className="mt-5 max-w-prose">
          <p className="font-semibold text-opseu-dark">{t("table.trackerTitle")}</p>
          <p className="mt-1">{t("table.trackerBody")}</p>
        </Callout>
        <div className="button-row mt-5 max-w-lg">
          <Link href="/tools/proposal-tracker">
            <Button>{t("table.trackerCta")}</Button>
          </Link>
        </div>
      </GuideSection>

      <GuideSection
        id="dispute"
        title={t("dispute.title")}
        intro={t("dispute.intro")}
      >
        <ul className="mt-4 list-disc space-y-3 pl-5 text-gray-700">
          {disputeKeys.map((key) => (
            <TipItem
              key={key}
              label={t(`dispute.items.${key}.label`)}
              content={t(`dispute.items.${key}.content`)}
            />
          ))}
        </ul>
        <Callout tone="warning" className="mt-5 max-w-prose">
          <p className="font-semibold text-amber-950">
            {t("dispute.warningTitle")}
          </p>
          <p className="mt-1">{t("dispute.warning")}</p>
        </Callout>
        <div className="button-row mt-5 max-w-lg">
          <Link href="/guide/crisis">
            <Button variant="outline">{t("dispute.crisisCta")}</Button>
          </Link>
        </div>
      </GuideSection>

      <GuideSection
        id="ratify"
        title={t("ratify.title")}
        intro={t("ratify.intro")}
      >
        <ul className="mt-4 list-disc space-y-3 pl-5 text-gray-700">
          {ratifyKeys.map((key) => (
            <TipItem
              key={key}
              label={t(`ratify.items.${key}.label`)}
              content={t(`ratify.items.${key}.content`)}
            />
          ))}
        </ul>
      </GuideSection>
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
