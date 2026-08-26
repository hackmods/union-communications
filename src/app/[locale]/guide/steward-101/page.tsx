import type { Metadata } from "next";
import type { ReactNode } from "react";
import { buildPublicPageMetadata } from "@/lib/seo/public-page-meta";
import { setRequestLocale, getTranslations } from "next-intl/server";
import { SourcesBlock } from "@/components/comms/SourcesBlock";
import { GuideLayout } from "@/components/comms/GuideLayout";
import {
  RepresentationStepsDiagram,
  ThreeHatsDiagram,
  TrainingPathDiagram,
  WhichHatFlowDiagram,
} from "@/components/comms/StewardGuideDiagrams";
import { Callout } from "@/components/ui/Callout";
import { Button } from "@/components/ui/Button";
import { Link } from "@/i18n/navigation";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  return buildPublicPageMetadata("/guide/steward-101", params);
}

const INTAKE_TEMPLATE_HREF = "/templates/unionops-steward-intake.csv";
const INTAKE_TEMPLATE_DOWNLOAD = "unionops-steward-intake.csv";

const TOC = [
  ["whatIsSteward", "whatIsSteward"],
  ["first48Hours", "first48Hours"],
  ["threeHats", "threeHats"],
  ["whichHat", "whichHat"],
  ["representation", "representation"],
  ["dfr", "dfr"],
  ["scenario", "scenario"],
  ["escalate", "escalate"],
  ["stewardChecklist", "stewardChecklist"],
  ["referenceMaterials", "referenceMaterials"],
] as const;

const whatIsStewardKeys = ["elected", "daily", "notManagement", "withExecutive"] as const;
const first48HoursKeys = ["introduce", "backup", "caArticles", "notes"] as const;
const hatKeys = ["enforcer", "communicator", "organizer"] as const;
const enforcerBulletKeys = ["knowCa", "investigate", "file"] as const;
const communicatorBulletKeys = ["down", "up", "accurate"] as const;
const organizerBulletKeys = ["map", "leaders", "action"] as const;
const hatBulletKeys = {
  enforcer: enforcerBulletKeys,
  communicator: communicatorBulletKeys,
  organizer: organizerBulletKeys,
} as const;
const whichHatKeys = ["desk", "discipline", "mobilize"] as const;
const representationStepKeys = ["before", "during", "after"] as const;
const dfrKeys = ["meaning", "investigate"] as const;
const scenarioKeys = ["text", "prep", "meeting", "after"] as const;
const escalateKeys = ["chief", "president", "rep"] as const;
const stewardChecklistKeys = [
  "introduce",
  "listen",
  "script",
  "notes",
  "escalate",
  "dfr",
] as const;

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
  const ts = await getTranslations("sources");

  const trainingSteps = t.raw("trainingPath.steps") as string[];

  return (
    <GuideLayout
      title={t("title")}
      subtitle={t("subtitle")}
      intro={t("intro")}
      relatedLinks={[
        { href: "/guide", label: t("backToGuide") },
        { href: "/guide/workplace-mapping", label: t("related.workplaceMapping") },
        { href: "/guide/grievance-process", label: t("related.grievance") },
        { href: "/guide/dfr", label: t("related.dfr") },
        { href: "/guide/right-to-refuse", label: t("related.rightToRefuse") },
      ]}
      footer={
        <SourcesBlock
          pageId="steward101"
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

      <section className="mb-8 max-w-3xl">
        <h2 className="text-lg font-bold text-opseu-dark">
          {t("trainingPath.title")}
        </h2>
        <p className="mt-2 leading-relaxed text-gray-700">
          {t("trainingPath.intro")}
        </p>
        <TrainingPathDiagram
          steps={trainingSteps}
          className="mt-4"
        />
      </section>

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
        id="whatIsSteward"
        title={t("whatIsSteward.title")}
        intro={t("whatIsSteward.intro")}
      >
        <ul className="mt-4 list-disc space-y-3 pl-5 text-gray-700">
          {whatIsStewardKeys.map((key) => (
            <TipItem
              key={key}
              label={t(`whatIsSteward.items.${key}.label`)}
              content={t(`whatIsSteward.items.${key}.content`)}
            />
          ))}
        </ul>
        <Callout tone="muted" className="mt-5 max-w-prose">
          <p className="font-semibold text-opseu-dark">{t("unionBasics.title")}</p>
          <p className="mt-2 leading-relaxed text-gray-700">
            {t.rich("unionBasics.body", richMarks)}
          </p>
          <Link
            href="/guide/membership-signup"
            className="mt-2 inline-block font-medium text-opseu-blue underline underline-offset-2 hover:text-opseu-dark"
          >
            {t("unionBasics.membershipLink")} →
          </Link>
        </Callout>
      </GuideSection>

      <GuideSection
        id="first48Hours"
        title={t("first48Hours.title")}
        intro={t("first48Hours.intro")}
      >
        <ul className="mt-4 list-disc space-y-3 pl-5 text-gray-700">
          {first48HoursKeys.map((key) => (
            <TipItem
              key={key}
              label={t(`first48Hours.items.${key}.label`)}
              content={t(`first48Hours.items.${key}.content`)}
            />
          ))}
        </ul>
        <Callout className="mt-5 max-w-prose">
          <p className="font-semibold text-opseu-dark">{t("tipLabel")}</p>
          <p className="mt-1">{t("first48Hours.tip")}</p>
        </Callout>
      </GuideSection>

      <GuideSection
        id="threeHats"
        title={t("threeHats.title")}
        intro={t("threeHats.intro")}
      >
        <ThreeHatsDiagram
          labels={{
            enforcer: t("threeHats.items.enforcer.label"),
            communicator: t("threeHats.items.communicator.label"),
            organizer: t("threeHats.items.organizer.label"),
          }}
          className="mt-5 max-w-2xl"
        />
        <ol className="mt-6 list-decimal space-y-6 pl-5 text-gray-700">
          {hatKeys.map((key) => (
            <li key={key} className="max-w-prose leading-relaxed">
              <span className="font-semibold text-opseu-dark">
                {t(`threeHats.items.${key}.label`)}
              </span>
              {" — "}
              {t(`threeHats.items.${key}.summary`)}
              <ul className="mt-2 list-disc space-y-1 pl-5 text-gray-700">
                {hatBulletKeys[key].map((bulletKey) => (
                  <li key={bulletKey}>
                    {t(`threeHats.items.${key}.bullets.${bulletKey}`)}
                  </li>
                ))}
              </ul>
            </li>
          ))}
        </ol>
        <p className="mt-4 max-w-prose text-sm text-gray-600">
          <Link
            href="/guide/workplace-mapping"
            className="font-medium text-opseu-blue underline underline-offset-2 hover:text-opseu-dark"
          >
            {t("related.workplaceMapping")}
          </Link>
          {" · "}
          <Link
            href="/guide/grievance-process"
            className="font-medium text-opseu-blue underline underline-offset-2 hover:text-opseu-dark"
          >
            {t("related.grievance")}
          </Link>
        </p>
      </GuideSection>

      <GuideSection
        id="whichHat"
        title={t("whichHat.title")}
        intro={t("whichHat.intro")}
      >
        <WhichHatFlowDiagram
          labels={{
            start: t("diagrams.whichHatStart"),
            desk: t("diagrams.whichHatDesk"),
            discipline: t("diagrams.whichHatDiscipline"),
            mobilize: t("diagrams.whichHatMobilize"),
          }}
          className="mt-5"
        />
        <ul className="mt-5 list-disc space-y-3 pl-5 text-gray-700">
          {whichHatKeys.map((key) => (
            <TipItem
              key={key}
              label={t(`whichHat.items.${key}.label`)}
              content={t(`whichHat.items.${key}.content`)}
            />
          ))}
        </ul>
        <Callout tone="warning" className="mt-5 max-w-prose">
          <p className="font-semibold text-amber-950">{t("whichHat.warningTitle")}</p>
          <p className="mt-1">{t("whichHat.warning")}</p>
        </Callout>
      </GuideSection>

      <GuideSection
        id="representation"
        title={t("representation.title")}
        intro={t("representation.intro")}
      >
        <div className="mt-4 max-w-prose space-y-4">
          <div>
            <h3 className="text-lg font-bold text-opseu-dark">
              {t("representation.trigger.title")}
            </h3>
            <p className="mt-2 leading-relaxed text-gray-700">
              {t("representation.trigger.body")}
            </p>
          </div>
          <Callout className="max-w-prose">
            <p className="font-semibold text-opseu-dark">
              {t("representation.script.title")}
            </p>
            <p className="mt-2 leading-relaxed text-gray-700">
              {t.rich("representation.script.body", richMarks)}
            </p>
          </Callout>
        </div>
        <RepresentationStepsDiagram
          labels={{
            before: t("diagrams.repBefore"),
            during: t("diagrams.repDuring"),
            after: t("diagrams.repAfter"),
          }}
          className="mt-5 max-w-2xl"
        />
        <ul className="mt-4 list-disc space-y-3 pl-5 text-gray-700">
          {representationStepKeys.map((key) => (
            <TipItem
              key={key}
              label={t(`representation.${key}.label`)}
              content={t(`representation.${key}.content`)}
            />
          ))}
        </ul>
        <Callout tone="warning" className="mt-5 max-w-prose">
          <p className="font-semibold text-amber-950">
            {t("representation.denied.title")}
          </p>
          <p className="mt-1">{t("representation.denied.body")}</p>
        </Callout>
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
        <p className="mt-4 max-w-prose text-gray-700">
          {t("dfr.linkIntro")}{" "}
          <Link
            href="/guide/dfr"
            className="font-medium text-opseu-blue underline underline-offset-2 hover:text-opseu-dark"
          >
            {t("related.dfr")} →
          </Link>
        </p>
      </GuideSection>

      <GuideSection
        id="scenario"
        title={t("scenario.title")}
        intro={t("scenario.intro")}
      >
        <ol className="mt-4 list-decimal space-y-4 pl-5 text-gray-700">
          {scenarioKeys.map((key) => (
            <li key={key} className="max-w-prose leading-relaxed">
              <span className="font-semibold text-opseu-dark">
                {t(`scenario.phases.${key}.label`)}
              </span>
              {" — "}
              {t(`scenario.phases.${key}.content`)}
            </li>
          ))}
        </ol>
        <Callout tone="muted" className="mt-5 max-w-prose">
          <p className="font-semibold text-opseu-dark">{t("tipLabel")}</p>
          <p className="mt-1">{t("scenario.tip")}</p>
        </Callout>
      </GuideSection>

      <GuideSection
        id="escalate"
        title={t("escalate.title")}
        intro={t("escalate.intro")}
      >
        <ul className="mt-4 list-disc space-y-3 pl-5 text-gray-700">
          {escalateKeys.map((key) => (
            <TipItem
              key={key}
              label={t(`escalate.items.${key}.label`)}
              content={t(`escalate.items.${key}.content`)}
            />
          ))}
        </ul>
        <Callout tone="warning" className="mt-5 max-w-prose">
          <p className="font-semibold text-amber-950">{t("escalate.warningTitle")}</p>
          <p className="mt-1">{t("escalate.warning")}</p>
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

      <GuideSection
        id="referenceMaterials"
        title={t("referenceMaterials.title")}
        intro={t("referenceMaterials.intro")}
      >
        <div className="mt-5 space-y-6">
          <ReferenceBlock title={t("referenceMaterials.pocketCard.title")}>
            <p>{t("referenceMaterials.pocketCard.body")}</p>
            <Link href="/tools/qr-card?preset=stewardRepresentation" className="mt-3 inline-block">
              <Button>{t("referenceMaterials.pocketCard.cta")}</Button>
            </Link>
          </ReferenceBlock>

          <ReferenceBlock title={t("referenceMaterials.intakeSheet.title")}>
            <p>{t("referenceMaterials.intakeSheet.body")}</p>
            <a
              href={INTAKE_TEMPLATE_HREF}
              download={INTAKE_TEMPLATE_DOWNLOAD}
              className="mt-3 inline-block"
            >
              <Button variant="outline">{t("referenceMaterials.intakeSheet.cta")}</Button>
            </a>
            <p className="mt-2 text-sm text-gray-600">
              {t("referenceMaterials.intakeSheet.hint")}
            </p>
          </ReferenceBlock>

          <ReferenceBlock title={t("referenceMaterials.grievanceWorksheet.title")}>
            <p>{t("referenceMaterials.grievanceWorksheet.body")}</p>
            <Link href="/tools/document-generator?preset=grievance-intake" className="mt-3 inline-block">
              <Button variant="outline">
                {t("referenceMaterials.grievanceWorksheet.cta")}
              </Button>
            </Link>
          </ReferenceBlock>

          <ReferenceBlock title={t("referenceMaterials.board.title")}>
            <p>{t("referenceMaterials.board.body")}</p>
            <nav
              className="mt-3 flex flex-wrap items-baseline gap-x-3 gap-y-1"
              aria-label={t("referenceMaterials.board.title")}
            >
              <Link
                href="/tools/org-chart"
                className="font-medium text-opseu-blue underline underline-offset-2 hover:text-opseu-dark"
              >
                {t("referenceMaterials.board.orgChart")}
              </Link>
              <span className="text-gray-300" aria-hidden="true">
                ·
              </span>
              <Link
                href="/tools/board-notice"
                className="font-medium text-opseu-blue underline underline-offset-2 hover:text-opseu-dark"
              >
                {t("referenceMaterials.board.boardNotice")}
              </Link>
            </nav>
          </ReferenceBlock>

          <ReferenceBlock title={t("referenceMaterials.followUp.title")}>
            <p>{t("referenceMaterials.followUp.body")}</p>
            <Link href="/tools/document-generator?preset=simple-letter" className="mt-3 inline-block">
              <Button variant="outline">{t("referenceMaterials.followUp.cta")}</Button>
            </Link>
          </ReferenceBlock>
        </div>
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

      <Callout tone="muted" className="mt-8">
        <p className="font-semibold text-opseu-dark">{t("next.title")}</p>
        <p className="mt-2 leading-relaxed text-gray-700">{t("next.body")}</p>
        <nav
          className="mt-3 flex flex-wrap items-baseline gap-x-3 gap-y-1"
          aria-label={t("next.title")}
        >
          {(
            [
              { href: "/guide/workplace-mapping", label: t("related.workplaceMapping") },
              { href: "/guide/grievance-process", label: t("related.grievance") },
              { href: "/guide/dfr", label: t("related.dfr") },
              { href: "/guide/membership-signup", label: t("related.membership") },
            ] as const
          ).map((link, i) => (
            <span key={link.href} className="inline-flex items-baseline gap-x-3">
              {i > 0 && (
                <span className="text-gray-300" aria-hidden="true">
                  ·
                </span>
              )}
              <Link
                href={link.href}
                className="font-medium text-opseu-blue underline underline-offset-2 hover:text-opseu-dark"
              >
                {link.label}
              </Link>
            </span>
          ))}
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

function ReferenceBlock({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="max-w-prose rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
      <h3 className="font-semibold text-opseu-dark">{title}</h3>
      <div className="mt-2 text-gray-700">{children}</div>
    </div>
  );
}

function TipItem({ label, content }: { label: string; content: string }) {
  return (
    <li className="max-w-prose leading-relaxed">
      <span className="font-semibold text-opseu-dark">{label}.</span> {content}
    </li>
  );
}
