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
  return buildPublicPageMetadata("/guide/right-to-refuse", params);
}

const TOC = [
  ["gate", "gate"],
  ["ontarioScope", "ontarioScope"],
  ["stageOne", "stageOne"],
  ["stageTwo", "stageTwo"],
  ["reassignment", "reassignment"],
  ["reprisal", "reprisal"],
  ["fullScenario", "fullScenario"],
  ["stewardChecklist", "stewardChecklist"],
  ["boards", "boards"],
] as const;

const gateKeys = ["ohsa", "jhsc", "grievance", "both"] as const;
const ontarioScopeKeys = ["coverage", "federal", "modified", "unionRole"] as const;
const stageOneKeys = [
  "report",
  "safePlace",
  "accompany",
  "investigate",
  "stewardNotes",
  "resolve",
] as const;
const stageTwoKeys = [
  "trigger",
  "whoCalls",
  "inspector",
  "stewardRecords",
  "factsOnly",
] as const;
const reassignmentKeys = ["inform", "pay", "noSilent", "board"] as const;
const reprisalKeys = ["document", "sameDay", "sources", "notRoutine"] as const;
const fullScenarioKeys = ["t0", "t1", "t2", "t3", "t4"] as const;
const stewardChecklistKeys = [
  "beforeKnow",
  "beforeContacts",
  "duringPresent",
  "duringNotes",
  "afterFile",
  "afterBoard",
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
        { href: "/guide/steward-playbooks", label: t("backToPlaybooks") },
        { href: "/guide", label: t("backToGuide") },
        { href: "/guide/officer-learning", label: t("related.officerLearning") },
        { href: "/guide/grievance-process", label: t("related.grievance") },
        { href: "/guide/dfr", label: t("related.dfr") },
        { href: "/guide/joint-committee", label: t("related.jointCommittee") },
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
        id="ontarioScope"
        title={t("ontarioScope.title")}
        intro={t("ontarioScope.intro")}
      >
        <ul className="mt-4 list-disc space-y-3 pl-5 text-gray-700">
          {ontarioScopeKeys.map((key) => (
            <TipItem
              key={key}
              label={t(`ontarioScope.items.${key}.label`)}
              content={t(`ontarioScope.items.${key}.content`)}
            />
          ))}
        </ul>
      </GuideSection>

      <GuideSection
        id="stageOne"
        title={t("stageOne.title")}
        intro={t("stageOne.intro")}
      >
        <ul className="mt-4 list-disc space-y-3 pl-5 text-gray-700">
          {stageOneKeys.map((key) => (
            <TipItem
              key={key}
              label={t(`stageOne.items.${key}.label`)}
              content={t(`stageOne.items.${key}.content`)}
            />
          ))}
        </ul>
        <Callout className="mt-5 max-w-prose">
          <p className="font-semibold text-opseu-dark">{t("tipLabel")}</p>
          <p className="mt-1">{t("stageOne.tip")}</p>
        </Callout>
      </GuideSection>

      <GuideSection
        id="stageTwo"
        title={t("stageTwo.title")}
        intro={t("stageTwo.intro")}
      >
        <ul className="mt-4 list-disc space-y-3 pl-5 text-gray-700">
          {stageTwoKeys.map((key) => (
            <TipItem
              key={key}
              label={t(`stageTwo.items.${key}.label`)}
              content={t(`stageTwo.items.${key}.content`)}
            />
          ))}
        </ul>
        <Callout tone="warning" className="mt-5 max-w-prose">
          <p className="font-semibold text-amber-950">
            {t("stageTwo.warningTitle")}
          </p>
          <p className="mt-1">{t("stageTwo.warning")}</p>
        </Callout>
      </GuideSection>

      <GuideSection
        id="reassignment"
        title={t("reassignment.title")}
        intro={t("reassignment.intro")}
      >
        <ul className="mt-4 list-disc space-y-3 pl-5 text-gray-700">
          {reassignmentKeys.map((key) => (
            <TipItem
              key={key}
              label={t(`reassignment.items.${key}.label`)}
              content={t(`reassignment.items.${key}.content`)}
            />
          ))}
        </ul>
      </GuideSection>

      <GuideSection
        id="reprisal"
        title={t("reprisal.title")}
        intro={t("reprisal.intro")}
      >
        <ul className="mt-4 list-disc space-y-3 pl-5 text-gray-700">
          {reprisalKeys.map((key) => (
            <TipItem
              key={key}
              label={t(`reprisal.items.${key}.label`)}
              content={t(`reprisal.items.${key}.content`)}
            />
          ))}
        </ul>
        <Callout tone="warning" className="mt-5 max-w-prose">
          <p className="font-semibold text-amber-950">
            {t("reprisal.warningTitle")}
          </p>
          <p className="mt-1">{t("reprisal.warning")}</p>
        </Callout>
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
        id="stewardChecklist"
        title={t("stewardChecklist.title")}
        intro={t("stewardChecklist.intro")}
      >
        <ul className="mt-4 list-disc space-y-3 pl-5 text-gray-700">
          {stewardChecklistKeys.map((key) => (
            <TipItem
              key={key}
              label={t(`stewardChecklist.items.${key}.label`)}
              content={t(`stewardChecklist.items.${key}.content`)}
            />
          ))}
        </ul>
      </GuideSection>

      <section
        id="boards"
        className="mt-12 scroll-mt-28 border-l-2 border-opseu-blue/30 pl-5"
      >
        <h2 className="text-xl font-bold text-opseu-dark md:text-2xl">
          {t("boards.title")}
        </h2>
        <p className="mt-3 max-w-prose leading-relaxed text-gray-700">
          {t("boards.body")}
        </p>
        <div className="button-row mt-5 max-w-lg">
          <Link href="/tools/qr-card?preset=rightToRefuse">
            <Button>{t("boards.exportCta")}</Button>
          </Link>
        </div>
        <p className="mt-3 text-sm text-gray-700">{t("boards.exportHint")}</p>
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
