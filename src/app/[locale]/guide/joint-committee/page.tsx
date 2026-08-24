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
  return buildPublicPageMetadata("/guide/joint-committee", params);
}

const TOC = [
  ["gate", "gate"],
  ["localFirst", "localFirst"],
  ["referUp", "referUp"],
  ["caucus", "caucus"],
  ["jointTable", "jointTable"],
  ["afterMinutes", "afterMinutes"],
  ["fullScenario", "fullScenario"],
  ["caArticles", "caArticles"],
  ["notThis", "notThis"],
  ["tools", "tools"],
] as const;

const gateKeys = ["grievance", "local", "system", "hs"] as const;
const localFirstKeys = ["schedule", "record", "deadline", "refer"] as const;
const referUpKeys = ["facts", "localLog", "ask", "notify"] as const;
const caucusKeys = ["ask", "roles", "brief", "private"] as const;
const jointTableKeys = [
  "refuse",
  "speak",
  "minutes",
  "consensus",
  "noBargain",
] as const;
const afterMinutesKeys = ["link", "note", "locals", "comms"] as const;
const fullScenarioKeys = ["w1", "w3", "w5", "w7"] as const;
const caArticleKeys = ["pt", "ft", "other"] as const;
const notThisKeys = ["grievance", "jhsc", "lec", "bargain"] as const;
const toolKeys = ["letterhead", "explainer", "email", "portal"] as const;

export default async function JointCommitteeGuidePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("jointCommitteeGuide");
  const guide = await getTranslations("guide");
  const nav = await getTranslations("nav");
  const ts = await getTranslations("sources");

  return (
    <GuideLayout
      title={t("title")}
      subtitle={t("subtitle")}
      intro={t("intro")}
      relatedLinks={[
        { href: "/guide", label: t("backToGuide") },
        { href: "/guide/dfr", label: guide("labourGuides.dfr") },
        { href: "/guide/email-broadcast", label: t("related.email") },
      ]}
      footer={
        <SourcesBlock
          pageId="jointCommittee"
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

      <GuideSection
        id="localFirst"
        title={t("localFirst.title")}
        intro={t("localFirst.intro")}
      >
        <ul className="mt-4 list-disc space-y-3 pl-5 text-gray-700">
          {localFirstKeys.map((key) => (
            <TipItem
              key={key}
              label={t(`localFirst.items.${key}.label`)}
              content={t(`localFirst.items.${key}.content`)}
            />
          ))}
        </ul>
        <Callout className="mt-5 max-w-prose">
          <p className="font-semibold text-opseu-dark">{t("tipLabel")}</p>
          <p className="mt-1">{t("localFirst.tip")}</p>
        </Callout>
      </GuideSection>

      <GuideSection
        id="referUp"
        title={t("referUp.title")}
        intro={t("referUp.intro")}
      >
        <ul className="mt-4 list-disc space-y-3 pl-5 text-gray-700">
          {referUpKeys.map((key) => (
            <TipItem
              key={key}
              label={t(`referUp.items.${key}.label`)}
              content={t(`referUp.items.${key}.content`)}
            />
          ))}
        </ul>
      </GuideSection>

      <GuideSection id="caucus" title={t("caucus.title")} intro={t("caucus.intro")}>
        <h3 className="mt-6 text-lg font-bold text-opseu-dark">
          {t("caucus.practicesTitle")}
        </h3>
        <ul className="mt-3 list-disc space-y-3 pl-5 text-gray-700">
          {caucusKeys.map((key) => (
            <TipItem
              key={key}
              label={t(`caucus.items.${key}.label`)}
              content={t(`caucus.items.${key}.content`)}
            />
          ))}
        </ul>
        <Callout className="mt-5 max-w-prose">
          <p className="font-semibold text-opseu-dark">{t("tipLabel")}</p>
          <p className="mt-1">{t("caucus.tip")}</p>
        </Callout>
        <div className="button-row mt-5 max-w-lg">
          <Link href="/tools/document-generator?preset=letterhead">
            <Button>{t("related.letterhead")}</Button>
          </Link>
        </div>
      </GuideSection>

      <GuideSection
        id="jointTable"
        title={t("jointTable.title")}
        intro={t("jointTable.intro")}
      >
        <ul className="mt-4 list-disc space-y-3 pl-5 text-gray-700">
          {jointTableKeys.map((key) => (
            <TipItem
              key={key}
              label={t(`jointTable.items.${key}.label`)}
              content={t(`jointTable.items.${key}.content`)}
            />
          ))}
        </ul>
        <Callout tone="warning" className="mt-5 max-w-prose">
          <p className="font-semibold text-amber-950">
            {t("jointTable.warningTitle")}
          </p>
          <p className="mt-1">{t("jointTable.warning")}</p>
        </Callout>
      </GuideSection>

      <GuideSection
        id="afterMinutes"
        title={t("afterMinutes.title")}
        intro={t("afterMinutes.intro")}
      >
        <ul className="mt-4 list-disc space-y-3 pl-5 text-gray-700">
          {afterMinutesKeys.map((key) => (
            <TipItem
              key={key}
              label={t(`afterMinutes.items.${key}.label`)}
              content={t(`afterMinutes.items.${key}.content`)}
            />
          ))}
        </ul>
        <Callout className="mt-5 max-w-prose">
          <p className="font-semibold text-opseu-dark">{t("tipLabel")}</p>
          <p className="mt-1">{t("afterMinutes.tip")}</p>
        </Callout>
        <div className="button-row mt-5 max-w-2xl">
          <Link href="/tools/document-generator?preset=letterhead">
            <Button variant="outline">{t("afterMinutes.letterCta")}</Button>
          </Link>
          <Link href="/guide/email-broadcast">
            <Button variant="outline">{t("afterMinutes.emailCta")}</Button>
          </Link>
          <Link href="/tools/flyer-maker">
            <Button variant="outline">{t("afterMinutes.flyerCta")}</Button>
          </Link>
        </div>
      </GuideSection>

      <GuideSection
        id="fullScenario"
        title={t("fullScenario.title")}
        intro={t("fullScenario.intro")}
      >
        <ol className="mt-4 list-decimal space-y-4 pl-5 text-gray-700">
          {fullScenarioKeys.map((key) => (
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
        id="caArticles"
        title={t("caArticles.title")}
        intro={t("caArticles.intro")}
      >
        <ul className="mt-4 list-disc space-y-3 pl-5 text-gray-700">
          {caArticleKeys.map((key) => (
            <TipItem
              key={key}
              label={t(`caArticles.items.${key}.label`)}
              content={t(`caArticles.items.${key}.content`)}
            />
          ))}
        </ul>
      </GuideSection>

      <GuideSection id="notThis" title={t("notThis.title")} intro={t("notThis.intro")}>
        <ul className="mt-4 list-disc space-y-3 pl-5 text-gray-700">
          {notThisKeys.map((key) => (
            <TipItem
              key={key}
              label={t(`notThis.items.${key}.label`)}
              content={t(`notThis.items.${key}.content`)}
            />
          ))}
        </ul>
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
          <Link href="/tools/document-generator?preset=letterhead">
            <Button variant="outline">{nav("documentGenerator")}</Button>
          </Link>
          <Link href="/tools/flyer-maker">
            <Button variant="outline">{nav("flyerMaker")}</Button>
          </Link>
          <Link href="/guide/email-broadcast">
            <Button variant="outline">{nav("emailBroadcastGuide")}</Button>
          </Link>
        </div>
      </section>

      <Callout tone="muted" className="mt-10">
        <p className="font-semibold text-opseu-dark">{t("example.title")}</p>
        <p className="mt-2 leading-relaxed text-gray-700">{t("example.body")}</p>
      </Callout>

      <Callout className="mt-8">
        <p className="font-semibold text-opseu-dark">{t("portal.title")}</p>
        <p className="mt-2 leading-relaxed text-gray-700">{t("portal.body")}</p>
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
