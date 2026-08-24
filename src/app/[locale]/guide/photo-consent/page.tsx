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

const TOC = [
  ["gate", "gate"],
  ["why", "why"],
  ["tiers", "tiers"],
  ["askScript", "askScript"],
  ["recordKeeping", "recordKeeping"],
  ["checklist", "checklist"],
  ["takedown", "takedown"],
  ["privacy", "privacy"],
  ["fullScenario", "fullScenario"],
  ["workshop", "workshop"],
  ["tools", "tools"],
] as const;

const gateKeys = ["crowd", "spotlight", "workplace", "crisis"] as const;
const tierKeys = ["rally", "meeting", "workplace"] as const;
const askKeys = ["spotlight", "meeting", "group", "video"] as const;
const recordKeys = ["who", "where", "how", "storage"] as const;
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
const takedownKeys = ["speed", "everywhere", "log", "thanks"] as const;
const privacyKeys = ["ipc", "pipeda", "ca", "crisis"] as const;
const scenarioKeys = ["ask", "shoot", "export", "post", "later"] as const;
const toolKeys = ["graphic", "shortForm", "crisis", "privacy"] as const;

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
        { href: "/guide/crisis", label: nav("strikeGuide") },
      ]}
      footer={
        <SourcesBlock
          pageId="photoConsent"
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

      <GuideSection id="gate" title={t("gate.title")} intro={t("gate.intro")}>
        <ItemList section="gate" keys={gateKeys} t={t} />
        <Callout tone="warning" className="mt-5 max-w-prose">
          <p className="font-semibold text-amber-950">{t("gate.warningTitle")}</p>
          <p className="mt-1">{t("gate.warning")}</p>
        </Callout>
      </GuideSection>

      <GuideSection id="why" title={t("why.title")} intro={t("why.intro")}>
        <Callout tone="warning" className="mt-4 max-w-prose">
          <p className="font-semibold text-amber-950">
            {t("why.retaliationTitle")}
          </p>
          <p className="mt-1">{t("why.retaliationBody")}</p>
        </Callout>
      </GuideSection>

      <GuideSection id="tiers" title={t("tiers.title")} intro={t("tiers.intro")}>
        <ul className="mt-4 list-disc space-y-3 pl-5 text-gray-700">
          {tierKeys.map((key) => (
            <TipItem
              key={key}
              label={t(`tiers.items.${key}.label`)}
              content={t(`tiers.items.${key}.content`)}
            />
          ))}
        </ul>
        <Callout className="mt-5 max-w-prose">
          <p className="font-semibold text-opseu-dark">{t("tipLabel")}</p>
          <p className="mt-1">{t("tiers.tip")}</p>
        </Callout>
      </GuideSection>

      <GuideSection
        id="askScript"
        title={t("askScript.title")}
        intro={t("askScript.intro")}
      >
        <ItemList section="askScript" keys={askKeys} t={t} />
      </GuideSection>

      <GuideSection
        id="recordKeeping"
        title={t("recordKeeping.title")}
        intro={t("recordKeeping.intro")}
      >
        <ItemList section="recordKeeping" keys={recordKeys} t={t} />
        <Callout tone="muted" className="mt-5 max-w-prose">
          <p className="font-semibold text-opseu-dark">{t("tipLabel")}</p>
          <p className="mt-1">{t("recordKeeping.tip")}</p>
        </Callout>
      </GuideSection>

      <GuideSection
        id="checklist"
        title={t("checklist.title")}
        intro={t("checklist.intro")}
      >
        <ItemList section="checklist" keys={checklistKeys} t={t} />
      </GuideSection>

      <GuideSection id="takedown" title={t("takedown.title")} intro="">
        <Callout className="max-w-prose">
          <p className="font-semibold text-opseu-dark">{t("takedown.rule")}</p>
          <p className="mt-2 leading-relaxed text-gray-700">{t("takedown.who")}</p>
        </Callout>
        <ul className="mt-4 list-disc space-y-3 pl-5 text-gray-700">
          {takedownKeys.map((key) => (
            <TipItem
              key={key}
              label={t(`takedown.items.${key}.label`)}
              content={t(`takedown.items.${key}.content`)}
            />
          ))}
        </ul>
      </GuideSection>

      <GuideSection
        id="privacy"
        title={t("privacy.title")}
        intro={t("privacy.intro")}
      >
        <ItemList section="privacy" keys={privacyKeys} t={t} />
      </GuideSection>

      <GuideSection
        id="fullScenario"
        title={t("fullScenario.title")}
        intro={t("fullScenario.intro")}
      >
        <ol className="mt-4 list-decimal space-y-4 pl-5 text-gray-700">
          {scenarioKeys.map((key) => (
            <li key={key} className="max-w-prose leading-relaxed">
              <span className="font-semibold text-opseu-dark">
                {t(`fullScenario.phases.${key}.label`)}
              </span>
              {" — "}
              {t(`fullScenario.phases.${key}.content`)}
            </li>
          ))}
        </ol>
        <Callout className="mt-5 max-w-prose">
          <p className="font-semibold text-opseu-dark">{t("tipLabel")}</p>
          <p className="mt-1">{t("fullScenario.tip")}</p>
        </Callout>
      </GuideSection>

      <GuideSection
        id="workshop"
        title={t("workshop.title")}
        intro={t("workshop.intro")}
      >
        <p className="mt-3 max-w-prose leading-relaxed text-gray-700">
          {t("workshop.content")}
        </p>
      </GuideSection>

      <section
        id="tools"
        className="mt-12 scroll-mt-28 border-l-2 border-opseu-blue/30 pl-5"
      >
        <h2 className="text-xl font-bold text-opseu-dark md:text-2xl">
          {t("tools.title")}
        </h2>
        <p className="mt-3 max-w-prose leading-relaxed text-gray-700">
          {t("tools.intro")}
        </p>
        <ul className="mt-4 list-disc space-y-3 pl-5 text-gray-700">
          {toolKeys.map((key) => (
            <TipItem
              key={key}
              label={t(`tools.items.${key}.label`)}
              content={t(`tools.items.${key}.content`)}
            />
          ))}
        </ul>
        <div className="button-row mt-5 max-w-2xl">
          <Link href="/tools/graphic-maker">
            <Button>{nav("graphicMaker")}</Button>
          </Link>
          <Link href="/guide/short-form">
            <Button variant="outline">{nav("shortFormGuide")}</Button>
          </Link>
          <Link href="/privacy">
            <Button variant="outline">{nav("privacy")}</Button>
          </Link>
          <Link href="/guide/resources">
            <Button variant="outline">{nav("resources")}</Button>
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
      {intro ? (
        <p className="mt-3 max-w-prose leading-relaxed text-gray-700">{intro}</p>
      ) : null}
      {children}
    </section>
  );
}

function ItemList({
  section,
  keys,
  t,
}: {
  section: string;
  keys: readonly string[];
  t: Awaited<ReturnType<typeof getTranslations>>;
}) {
  return (
    <ul className="mt-4 list-disc space-y-3 pl-5 text-gray-700">
      {keys.map((key) => (
        <TipItem
          key={key}
          label={t(`${section}.items.${key}.label`)}
          content={t(`${section}.items.${key}.content`)}
        />
      ))}
    </ul>
  );
}

function TipItem({ label, content }: { label: string; content: string }) {
  return (
    <li className="max-w-prose leading-relaxed">
      <span className="font-semibold text-opseu-dark">{label}.</span> {content}
    </li>
  );
}
