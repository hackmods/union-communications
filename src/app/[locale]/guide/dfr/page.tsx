import type { Metadata } from "next";
import { buildPublicPageMetadata } from "@/lib/seo/public-page-meta";
import { setRequestLocale, getTranslations } from "next-intl/server";
import { SourcesBlock } from "@/components/comms/SourcesBlock";
import { GuideLayout } from "@/components/comms/GuideLayout";
import { Callout } from "@/components/ui/Callout";
import { Link } from "@/i18n/navigation";
import { OfficerLearningModuleCallout } from "@/components/officer-learning/OfficerLearningModuleCallout";
import { guideCtaClass } from "@/components/comms/guideCtaClasses";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  return buildPublicPageMetadata("/guide/dfr", params);
}

const TOC = [
  ["gate", "gate"],
  ["scope", "scope"],
  ["legalTest", "legalTest"],
  ["intake", "intake"],
  ["investigate", "investigate"],
  ["clocks", "clocks"],
  ["decline", "decline"],
  ["fullScenario", "fullScenario"],
  ["failureModes", "failureModes"],
  ["memberTalk", "memberTalk"],
] as const;

const gateKeys = ["steward", "member", "officer", "conflict"] as const;
const scopeKeys = ["ontario", "college", "federal"] as const;
const legalTestKeys = [
  "arbitrary",
  "discriminatory",
  "badFaith",
  "honest",
] as const;
const intakeKeys = ["log", "calendar", "member", "conflict"] as const;
const investigateKeys = [
  "interview",
  "documents",
  "witnesses",
  "notes",
] as const;
const clocksKeys = ["trigger", "count", "extension", "late"] as const;
const declineKeys = ["written", "review", "escalate", "silence"] as const;
const fullScenarioKeys = ["d0", "d2", "d4", "d6"] as const;
const failureModeKeys = [
  "missedClock",
  "noFile",
  "noLetter",
  "overPromise",
  "personalBias",
] as const;
const memberTalkKeys = ["promise", "status", "confidential", "respect"] as const;

export default async function DfrGuidePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("dfrGuide");
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
        { href: "/guide/seniority-bumping", label: t("related.seniority") },
        { href: "/guide/right-to-refuse", label: t("related.rightToRefuse") },
        { href: "/guide/joint-committee", label: t("related.jointCommittee") },
      ]}
      footer={
        <SourcesBlock pageId="dfr" title={ts("title")} intro={ts("intro")} />
      }
    >
      <Callout className="mb-8">
        <p className="font-semibold text-opseu-dark">{t("disclaimer.title")}</p>
        <p className="mt-2 leading-relaxed text-gray-700">
          {t("disclaimer.body")}
        </p>
      </Callout>

      <OfficerLearningModuleCallout slug="contract-enforcement" moduleNumber={1} />

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
        id="scope"
        title={t("scope.title")}
        intro={t("scope.intro")}
      >
        <ul className="mt-4 list-disc space-y-3 pl-5 text-gray-700">
          {scopeKeys.map((key) => (
            <TipItem
              key={key}
              label={t(`scope.items.${key}.label`)}
              content={t(`scope.items.${key}.content`)}
            />
          ))}
        </ul>
      </GuideSection>

      <GuideSection
        id="legalTest"
        title={t("legalTest.title")}
        intro={t("legalTest.intro")}
      >
        <ul className="mt-4 list-disc space-y-3 pl-5 text-gray-700">
          {legalTestKeys.map((key) => (
            <TipItem
              key={key}
              label={t(`legalTest.items.${key}.label`)}
              content={t(`legalTest.items.${key}.content`)}
            />
          ))}
        </ul>
      </GuideSection>

      <GuideSection
        id="intake"
        title={t("intake.title")}
        intro={t("intake.intro")}
      >
        <ul className="mt-4 list-disc space-y-3 pl-5 text-gray-700">
          {intakeKeys.map((key) => (
            <TipItem
              key={key}
              label={t(`intake.items.${key}.label`)}
              content={t(`intake.items.${key}.content`)}
            />
          ))}
        </ul>
        <Callout className="mt-5 max-w-prose">
          <p className="font-semibold text-opseu-dark">{t("tipLabel")}</p>
          <p className="mt-1">{t("intake.tip")}</p>
        </Callout>
      </GuideSection>

      <GuideSection
        id="investigate"
        title={t("investigate.title")}
        intro={t("investigate.intro")}
      >
        <ul className="mt-4 list-disc space-y-3 pl-5 text-gray-700">
          {investigateKeys.map((key) => (
            <TipItem
              key={key}
              label={t(`investigate.items.${key}.label`)}
              content={t(`investigate.items.${key}.content`)}
            />
          ))}
        </ul>
      </GuideSection>

      <GuideSection
        id="clocks"
        title={t("clocks.title")}
        intro={t("clocks.intro")}
      >
        <ul className="mt-4 list-disc space-y-3 pl-5 text-gray-700">
          {clocksKeys.map((key) => (
            <TipItem
              key={key}
              label={t(`clocks.items.${key}.label`)}
              content={t(`clocks.items.${key}.content`)}
            />
          ))}
        </ul>
        <Callout tone="warning" className="mt-5 max-w-prose">
          <p className="font-semibold text-amber-950">
            {t("clocks.warningTitle")}
          </p>
          <p className="mt-1">{t("clocks.warning")}</p>
        </Callout>
      </GuideSection>

      <GuideSection
        id="decline"
        title={t("decline.title")}
        intro={t("decline.intro")}
      >
        <ul className="mt-4 list-disc space-y-3 pl-5 text-gray-700">
          {declineKeys.map((key) => (
            <TipItem
              key={key}
              label={t(`decline.items.${key}.label`)}
              content={t(`decline.items.${key}.content`)}
            />
          ))}
        </ul>
        <Callout className="mt-5 max-w-prose">
          <p className="font-semibold text-opseu-dark">{t("tipLabel")}</p>
          <p className="mt-1">{t("decline.tip")}</p>
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
        id="failureModes"
        title={t("failureModes.title")}
        intro={t("failureModes.intro")}
      >
        <ul className="mt-4 list-disc space-y-3 pl-5 text-gray-700">
          {failureModeKeys.map((key) => (
            <TipItem
              key={key}
              label={t(`failureModes.items.${key}.label`)}
              content={t(`failureModes.items.${key}.content`)}
            />
          ))}
        </ul>
      </GuideSection>

      <GuideSection
        id="memberTalk"
        title={t("memberTalk.title")}
        intro={t("memberTalk.intro")}
      >
        <ul className="mt-4 list-disc space-y-3 pl-5 text-gray-700">
          {memberTalkKeys.map((key) => (
            <TipItem
              key={key}
              label={t(`memberTalk.items.${key}.label`)}
              content={t(`memberTalk.items.${key}.content`)}
            />
          ))}
        </ul>
      </GuideSection>

      <Callout tone="muted" className="mt-10">
        <p className="font-semibold text-opseu-dark">{t("hub.title")}</p>
        <p className="mt-2 leading-relaxed text-gray-700">{t("hub.body")}</p>
        <div className="button-row mt-4">
          <Link href="/app/grievances" className={guideCtaClass}>
            {t("hub.cta")}
          </Link>
        </div>
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
