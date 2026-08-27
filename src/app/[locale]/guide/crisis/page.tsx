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
  return buildPublicPageMetadata("/guide/crisis", params);
}

const TOC = [
  ["gate", "gate"],
  ["roles", "roles"],
  ["strike", "strike"],
  ["bargaining", "bargaining"],
  ["layoffs", "layoffs"],
  ["management", "management"],
  ["rhythm", "rhythm"],
  ["fullScenario", "fullScenario"],
  ["escalation", "escalation"],
  ["tools", "tools"],
] as const;

const gateKeys = ["strike", "bargaining", "layoff", "normal"] as const;
const roleKeys = ["president", "comms", "spokesperson", "servicing"] as const;
const strikeKeys = [
  "approve",
  "schedule",
  "safety",
  "consent",
  "sector",
  "questions",
] as const;
const bargainingKeys = [
  "facts",
  "hashtag",
  "meetings",
  "approved",
  "comments",
  "link",
] as const;
const layoffKeys = [
  "empathy",
  "route",
  "facts",
  "leaders",
  "record",
  "names",
] as const;
const managementKeys = [
  "facts",
  "correction",
  "harassment",
  "screenshot",
  "stewards",
] as const;
const rhythmKeys = ["morning", "midday", "evening", "queue"] as const;
const scenarioKeys = ["t715", "t730", "t800", "t1000", "t1400", "t1700"] as const;
const escalationKeys = [
  "media",
  "legal",
  "safety",
  "leak",
  "viral",
] as const;
const toolKeys = [
  "brand",
  "board",
  "flyer",
  "graphic",
  "web",
  "captions",
] as const;

export default async function CrisisPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("crisisGuide");
  const nav = await getTranslations("nav");
  const ts = await getTranslations("sources");

  return (
    <GuideLayout
      title={t("title")}
      subtitle={t("subtitle")}
      intro={t("intro")}
      relatedLinks={[
        { href: "/guide", label: t("backToGuide") },
        { href: "/guide/bargaining", label: nav("bargainingGuide") },
        { href: "/guide/photo-consent", label: nav("photoConsent") },
        { href: "/guide/email-broadcast", label: nav("emailBroadcastGuide") },
      ]}
      footer={
        <SourcesBlock pageId="crisis" title={ts("title")} intro={ts("intro")} />
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
        <ul className="mt-4 list-disc space-y-3 pl-5 text-gray-700">
          {gateKeys.map((key) => (
            <TipItem
              key={key}
              label={t(`gate.items.${key}.label`)}
              content={t(`gate.items.${key}.content`)}
            />
          ))}
        </ul>
        <Callout tone="warning" className="mt-5 max-w-prose">
          <p className="font-semibold text-amber-950">{t("gate.warningTitle")}</p>
          <p className="mt-1">{t("gate.warning")}</p>
        </Callout>
      </GuideSection>

      <GuideSection id="roles" title={t("roles.title")} intro={t("roles.intro")}>
        <ul className="mt-4 list-disc space-y-3 pl-5 text-gray-700">
          {roleKeys.map((key) => (
            <TipItem
              key={key}
              label={t(`roles.items.${key}.label`)}
              content={t(`roles.items.${key}.content`)}
            />
          ))}
        </ul>
        <Callout className="mt-5 max-w-prose">
          <p className="font-semibold text-opseu-dark">{t("tipLabel")}</p>
          <p className="mt-1">{t("roles.tip")}</p>
        </Callout>
      </GuideSection>

      <GuideSection id="strike" title={t("strike.title")} intro={t("strike.intro")}>
        <ItemList section="strike" keys={strikeKeys} t={t} />
      </GuideSection>

      <GuideSection
        id="bargaining"
        title={t("bargaining.title")}
        intro={t("bargaining.intro")}
      >
        <ItemList section="bargaining" keys={bargainingKeys} t={t} />
        <div className="button-row mt-5 max-w-lg">
          <Link href="/guide/bargaining">
            <Button variant="outline">{nav("bargainingGuide")}</Button>
          </Link>
        </div>
      </GuideSection>

      <GuideSection id="layoffs" title={t("layoffs.title")} intro={t("layoffs.intro")}>
        <ItemList section="layoffs" keys={layoffKeys} t={t} />
      </GuideSection>

      <GuideSection
        id="management"
        title={t("management.title")}
        intro={t("management.intro")}
      >
        <ItemList section="management" keys={managementKeys} t={t} />
        <Callout tone="warning" className="mt-5 max-w-prose">
          <p className="font-semibold text-amber-950">
            {t("management.warningTitle")}
          </p>
          <p className="mt-1">{t("management.warning")}</p>
        </Callout>
      </GuideSection>

      <GuideSection id="rhythm" title={t("rhythm.title")} intro={t("rhythm.intro")}>
        <ItemList section="rhythm" keys={rhythmKeys} t={t} />
        <Callout className="mt-5 max-w-prose">
          <p className="font-semibold text-opseu-dark">{t("tipLabel")}</p>
          <p className="mt-1">{t("rhythm.tip")}</p>
        </Callout>
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
        <Callout tone="muted" className="mt-5 max-w-prose">
          <p className="font-semibold text-opseu-dark">{t("tipLabel")}</p>
          <p className="mt-1">{t("fullScenario.tip")}</p>
        </Callout>
      </GuideSection>

      <GuideSection
        id="escalation"
        title={t("escalation.title")}
        intro={t("escalation.intro")}
      >
        <ItemList section="escalation" keys={escalationKeys} t={t} />
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
          <Link href="/brand-kit">
            <Button variant="outline">{nav("brandKit")}</Button>
          </Link>
          <Link href="/tools/board-notice">
            <Button variant="outline">{nav("boardNotice")}</Button>
          </Link>
          <Link href="/tools/flyer-maker">
            <Button variant="outline">{nav("flyerMaker")}</Button>
          </Link>
          <Link href="/tools/graphic-maker">
            <Button variant="outline">{nav("graphicMaker")}</Button>
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
