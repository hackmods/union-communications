import type { Metadata } from "next";
import type { ReactNode } from "react";
import { buildPublicPageMetadata } from "@/lib/seo/public-page-meta";
import { setRequestLocale, getTranslations } from "next-intl/server";
import { SourcesBlock } from "@/components/comms/SourcesBlock";
import { GuideToolAside } from "@/components/comms/GuideToolAside";
import { GuideBrandExportNudge } from "@/components/comms/GuideBrandExportNudge";
import { GuideExpandSection } from "@/components/comms/GuideExpandSection";
import {
  RepresentationStepsDiagram,
  ThreeHatsDiagram,
  TrainingPathDiagram,
  WhichHatFlowDiagram,
} from "@/components/comms/StewardGuideDiagrams";
import { Steward101ModuleNav } from "@/components/comms/Steward101ModuleNav";
import { OfficerLearningModuleCallout } from "@/components/officer-learning/OfficerLearningModuleCallout";
import { Link } from "@/i18n/navigation";
import {
  guideCtaClassBlock,
  guideCtaOutlineClass,
  guideCtaOutlineClassBlock,
} from "@/components/comms/guideCtaClasses";
import { SpreadsheetXlsxButton } from "@/components/comms/SpreadsheetXlsxButton";
import { documentGeneratorPresetHref } from "@/lib/constants/document-generator-links";
import {
  GuideLayout,
  GuideActionRow,
  GuideBulletList,
  GuideCallout,
  GuideCatalogCard,
  GuideLinkList,
  GuideOutlineList,
  GuideOutlineStep,
  GuideProse,
  GuideSubsection,
  GuideTipGrid,
  GuideTipItem,
  GuideTrainingPhase,
  GuideWideFigure,
} from "@/components/comms/guide-ui";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  return buildPublicPageMetadata("/guide/steward-101", params);
}

const INTAKE_TEMPLATE_HREF = "/templates/unionops-steward-intake.csv";
const INTAKE_TEMPLATE_DOWNLOAD = "unionops-steward-intake.csv";

const MODULE_KEYS = ["orient", "hats", "protect", "equip"] as const;
const PHASE_IDS = {
  orient: "phase-orient",
  hats: "phase-hats",
  protect: "phase-protect",
  equip: "phase-equip",
} as const;

const TOC = [
  ["whatIsSteward", "whatIsSteward"],
  ["first48Hours", "first48Hours"],
  ["threeHats", "threeHats"],
  ["whichHat", "whichHat"],
  ["representation", "representation"],
  ["scenario", "scenario"],
  ["escalate", "escalate"],
  ["dfr", "dfr"],
  ["stewardChecklist", "stewardChecklist"],
  ["tools", "tools"],
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
  const tg = await getTranslations("guideCommon");
  const nav = await getTranslations("nav");
  const ts = await getTranslations("sources");

  const trainingSteps = t.raw("trainingPath.steps") as Parameters<
    typeof TrainingPathDiagram
  >[0]["steps"];

  const moduleNavItems = MODULE_KEYS.map((key) => ({
    href: `#${PHASE_IDS[key]}`,
    number: t(`modules.${key}.number`),
    title: t(`modules.${key}.title`),
    time: t(`modules.${key}.time`),
    summary: t(`modules.${key}.summary`),
  }));

  const tocItems = TOC.map(([id, key]) => ({
    id,
    label: t(`${key}.navLabel`),
  }));

  return (
    <GuideLayout
      title={t("title")}
      subtitle={t("subtitle")}
      intro={t("intro")}
      preset="playbook"
      toc={tocItems}
      tocLabel={t("tocLabel")}
      aside={
        <GuideToolAside
          title={tg("asideTitle")}
          intro={tg("asideIntro")}
          links={[
            {
              href: "/tools/qr-card?preset=stewardRepresentation",
              label: t("related.pocketCard"),
            },
            {
              href: documentGeneratorPresetHref("grievance-intake"),
              label: nav("documentGenerator"),
              variant: "outline",
            },
            {
              href: "/tools/complaint-vs-grievance",
              label: t("related.diagnostic"),
              variant: "outline",
            },
          ]}
        />
      }
      relatedLabel={t("relatedLabel")}
      relatedLinks={[
        { href: "/guide/steward-playbooks", label: t("backToPlaybooks") },
        { href: "/guide", label: t("backToGuide") },
        { href: "/guide/officer-learning", label: t("related.officerLearning") },
        { href: "/guide/union-history", label: t("related.unionHistory") },
        { href: "/guide/grievance-process", label: t("related.grievance") },
        { href: "/guide/dfr", label: t("related.dfr") },
        { href: "/brand-kit", label: t("related.brandKit") },
        {
          href: "/tools/qr-card?preset=stewardRepresentation",
          label: t("related.pocketCard"),
        },
        {
          href: "/tools/complaint-vs-grievance",
          label: t("related.diagnostic"),
        },
        {
          href: "/tools/pre-disciplinary-log",
          label: t("related.discipline"),
        },
      ]}
      footer={
        <SourcesBlock
          pageId="steward101"
          title={ts("title")}
          intro={ts("intro")}
        />
      }
    >
      <GuideCallout className="mb-8">
        <p className="font-semibold text-opseu-dark">{t("disclaimer.title")}</p>
        <p className="mt-2 leading-relaxed text-gray-700">
          {t("disclaimer.body")}
        </p>
      </GuideCallout>

      <OfficerLearningModuleCallout slug="contract-enforcement" moduleNumber={1} />

      <Steward101ModuleNav
        ariaLabel={t("modules.navLabel")}
        timeBudgetTitle={t("modules.timeBudget.title")}
        timeBudgetBody={t("modules.timeBudget.body")}
        modules={moduleNavItems}
      />

      <GuideTrainingPhase
        id={PHASE_IDS.orient}
        number={t("modules.orient.number")}
        title={t("modules.orient.title")}
        timeEstimate={t("modules.orient.time")}
        intro={t("modules.orient.intro")}
      >
        <GuideSubsection
          id="whatIsSteward"
          title={t("whatIsSteward.title")}
          intro={t("whatIsSteward.intro")}
        >
          <GuideTipGrid className="mt-4">
            {whatIsStewardKeys.map((key) => (
              <GuideTipItem
                key={key}
                label={t(`whatIsSteward.items.${key}.label`)}
                content={t(`whatIsSteward.items.${key}.content`)}
              />
            ))}
          </GuideTipGrid>
          <GuideCallout tone="muted" className="mt-5">
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
          </GuideCallout>
        </GuideSubsection>

        <GuideSubsection
          id="first48Hours"
          title={t("first48Hours.title")}
          intro={t("first48Hours.intro")}
        >
          <GuideTipGrid className="mt-4">
            {first48HoursKeys.map((key) => (
              <GuideTipItem
                key={key}
                label={t(`first48Hours.items.${key}.label`)}
                content={t(`first48Hours.items.${key}.content`)}
              />
            ))}
          </GuideTipGrid>
          <GuideCallout className="mt-5">
            <p className="font-semibold text-opseu-dark">{t("tipLabel")}</p>
            <p className="mt-1">{t("first48Hours.tip")}</p>
          </GuideCallout>
        </GuideSubsection>
      </GuideTrainingPhase>

      <GuideTrainingPhase
        id={PHASE_IDS.hats}
        number={t("modules.hats.number")}
        title={t("modules.hats.title")}
        timeEstimate={t("modules.hats.time")}
        intro={t("modules.hats.intro")}
      >
        <GuideSubsection
          id="threeHats"
          title={t("threeHats.title")}
          intro={t("threeHats.intro")}
        >
          <GuideWideFigure>
            <ThreeHatsDiagram
              labels={{
                enforcer: t("threeHats.items.enforcer.label"),
                communicator: t("threeHats.items.communicator.label"),
                organizer: t("threeHats.items.organizer.label"),
              }}
              className="w-full max-w-3xl"
            />
          </GuideWideFigure>
          <GuideExpandSection
            title={t("threeHats.navLabel")}
            summary={t("threeHats.intro")}
            className="mt-5"
          >
            <GuideOutlineList className="mt-2 space-y-6">
              {hatKeys.map((key, index) => (
                <GuideOutlineStep
                  key={key}
                  id={`hat-${key}`}
                  step={index + 1}
                  title={t(`threeHats.items.${key}.label`)}
                >
                  <GuideProse className="mt-2">
                    {t(`threeHats.items.${key}.summary`)}
                  </GuideProse>
                  <GuideBulletList className="mt-3">
                    {hatBulletKeys[key].map((bulletKey) => (
                      <li key={bulletKey} className="leading-relaxed">
                        {t(`threeHats.items.${key}.bullets.${bulletKey}`)}
                      </li>
                    ))}
                  </GuideBulletList>
                </GuideOutlineStep>
              ))}
            </GuideOutlineList>
            <nav
              className="mt-4"
              aria-label={t("threeHats.navLabel")}
            >
              <GuideLinkList
                links={[
                  {
                    href: "/guide/workplace-mapping",
                    label: t("related.workplaceMapping"),
                  },
                  {
                    href: "/guide/grievance-process",
                    label: t("related.grievance"),
                  },
                ]}
              />
            </nav>
          </GuideExpandSection>
        </GuideSubsection>

        <GuideSubsection
          id="whichHat"
          title={t("whichHat.title")}
          intro={t("whichHat.intro")}
        >
          <GuideWideFigure>
            <WhichHatFlowDiagram
              labels={{
                start: t("diagrams.whichHatStart"),
                desk: t("diagrams.whichHatDesk"),
                discipline: t("diagrams.whichHatDiscipline"),
                mobilize: t("diagrams.whichHatMobilize"),
              }}
              className="w-full"
            />
          </GuideWideFigure>
          <GuideTipGrid className="mt-5">
            {whichHatKeys.map((key) => (
              <GuideTipItem
                key={key}
                label={t(`whichHat.items.${key}.label`)}
                content={t(`whichHat.items.${key}.content`)}
              />
            ))}
          </GuideTipGrid>
          <GuideCallout tone="warning" className="mt-5">
            <p className="font-semibold text-amber-950">{t("whichHat.warningTitle")}</p>
            <p className="mt-1">{t("whichHat.warning")}</p>
          </GuideCallout>
        </GuideSubsection>
      </GuideTrainingPhase>

      <GuideTrainingPhase
        id={PHASE_IDS.protect}
        number={t("modules.protect.number")}
        title={t("modules.protect.title")}
        timeEstimate={t("modules.protect.time")}
        intro={t("modules.protect.intro")}
      >
        <GuideSubsection
          id="representation"
          title={t("representation.title")}
          intro={t("representation.intro")}
        >
          <div className="mt-4 space-y-4">
            <div>
              <h4 className="text-[clamp(1rem,0.95rem+0.25vw,1.125rem)] font-bold text-opseu-dark">
                {t("representation.trigger.title")}
              </h4>
              <GuideProse className="mt-2">
                {t("representation.trigger.body")}
              </GuideProse>
            </div>
            <GuideCallout>
              <p className="font-semibold text-opseu-dark">
                {t("representation.script.title")}
              </p>
              <p className="mt-2 leading-relaxed text-gray-700">
                {t.rich("representation.script.body", richMarks)}
              </p>
            </GuideCallout>
          </div>
          <GuideWideFigure>
            <RepresentationStepsDiagram
              labels={{
                before: t("diagrams.repBefore"),
                during: t("diagrams.repDuring"),
                after: t("diagrams.repAfter"),
              }}
              className="w-full max-w-3xl"
            />
          </GuideWideFigure>
          <GuideTipGrid className="mt-4">
            {representationStepKeys.map((key) => (
              <GuideTipItem
                key={key}
                label={t(`representation.${key}.label`)}
                content={t(`representation.${key}.content`)}
              />
            ))}
          </GuideTipGrid>
          <GuideCallout tone="warning" className="mt-5">
            <p className="font-semibold text-amber-950">
              {t("representation.denied.title")}
            </p>
            <p className="mt-1">{t("representation.denied.body")}</p>
          </GuideCallout>
        </GuideSubsection>

        <GuideExpandSection
          id="scenario"
          title={t("scenario.title")}
          summary={t("scenario.intro")}
        >
          <GuideOutlineList className="mt-2 space-y-6">
            {scenarioKeys.map((key, index) => (
              <GuideOutlineStep
                key={key}
                id={`scenario-${key}`}
                step={index + 1}
                title={t(`scenario.phases.${key}.label`)}
              >
                <GuideProse className="mt-2">
                  {t(`scenario.phases.${key}.content`)}
                </GuideProse>
              </GuideOutlineStep>
            ))}
          </GuideOutlineList>
          <GuideCallout tone="muted" className="mt-5">
            <p className="font-semibold text-opseu-dark">{t("tipLabel")}</p>
            <p className="mt-1">{t("scenario.tip")}</p>
          </GuideCallout>
        </GuideExpandSection>

        <GuideSubsection
          id="escalate"
          title={t("escalate.title")}
          intro={t("escalate.intro")}
        >
          <GuideTipGrid className="mt-4">
            {escalateKeys.map((key) => (
              <GuideTipItem
                key={key}
                label={t(`escalate.items.${key}.label`)}
                content={t(`escalate.items.${key}.content`)}
              />
            ))}
          </GuideTipGrid>
          <GuideCallout tone="warning" className="mt-5">
            <p className="font-semibold text-amber-950">{t("escalate.warningTitle")}</p>
            <p className="mt-1">{t("escalate.warning")}</p>
          </GuideCallout>
        </GuideSubsection>
      </GuideTrainingPhase>

      <GuideTrainingPhase
        id={PHASE_IDS.equip}
        number={t("modules.equip.number")}
        title={t("modules.equip.title")}
        timeEstimate={t("modules.equip.time")}
        intro={t("modules.equip.intro")}
      >
        <GuideSubsection id="dfr" title={t("dfr.title")} intro={t("dfr.intro")}>
          <GuideBulletList className="mt-4" columns={2}>
            {dfrKeys.map((key) => (
              <li key={key} className="leading-relaxed">
                {t.rich(`dfr.items.${key}`, richMarks)}
              </li>
            ))}
          </GuideBulletList>
          <GuideCallout className="mt-5">
            <p className="font-semibold text-opseu-dark">{t("goldenRule.title")}</p>
            <p className="mt-2 leading-relaxed text-gray-700">
              {t("goldenRule.body")}
            </p>
          </GuideCallout>
          <GuideProse className="mt-4">
            {t("dfr.linkIntro")}{" "}
            <Link
              href="/guide/dfr"
              className="font-medium text-opseu-blue underline underline-offset-2 hover:text-opseu-dark"
            >
              {t("related.dfr")} →
            </Link>
          </GuideProse>
        </GuideSubsection>

        <GuideSubsection
          id="stewardChecklist"
          title={t("stewardChecklist.title")}
          intro={t("stewardChecklist.intro")}
        >
          <GuideTipGrid className="mt-4">
            {stewardChecklistKeys.map((key) => (
              <GuideTipItem
                key={key}
                label={t(`stewardChecklist.items.${key}.label`)}
                content={t(`stewardChecklist.items.${key}.content`)}
              />
            ))}
          </GuideTipGrid>
        </GuideSubsection>

        <GuideExpandSection title={t("modules.trainingPathTitle")}>
          <GuideProse>{t("trainingPath.intro")}</GuideProse>
          <GuideWideFigure>
            <TrainingPathDiagram steps={trainingSteps} className="w-full" />
          </GuideWideFigure>
        </GuideExpandSection>
      </GuideTrainingPhase>

      <section
        id="tools"
        className="mt-12 scroll-mt-28 rounded-2xl border border-gray-200 bg-gradient-to-br from-white to-opseu-blue/[0.03] p-5 shadow-sm md:p-8"
      >
        <h2 className="text-[clamp(1.25rem,1.1rem+0.6vw,1.5rem)] font-bold text-opseu-dark">
          {t("tools.title")}
        </h2>
        <GuideProse className="mt-3">{t("tools.intro")}</GuideProse>

        <GuideBrandExportNudge className="mt-5" />

        <ul className="mt-6 grid list-none gap-6 p-0 md:grid-cols-2">
          <GuideCatalogCard
            title={t("referenceMaterials.pocketCard.title")}
            body={t("referenceMaterials.pocketCard.body")}
            action={
              <Link
                href="/tools/qr-card?preset=stewardRepresentation"
                className={guideCtaClassBlock}
              >
                {t("referenceMaterials.pocketCard.cta")}
              </Link>
            }
          />
          <GuideCatalogCard
            title={t("referenceMaterials.intakeSheet.title")}
            body={t("referenceMaterials.intakeSheet.body")}
            meta={t("referenceMaterials.intakeSheet.hint")}
            action={
              <>
                <a
                  href={INTAKE_TEMPLATE_HREF}
                  download={INTAKE_TEMPLATE_DOWNLOAD}
                  className={guideCtaOutlineClassBlock}
                >
                  {t("referenceMaterials.intakeSheet.cta")}
                </a>
                <SpreadsheetXlsxButton
                  csvHref={INTAKE_TEMPLATE_HREF}
                  downloadBasename={INTAKE_TEMPLATE_DOWNLOAD}
                  className="w-full sm:flex-1"
                  buttonClassName="min-h-11 w-full"
                />
              </>
            }
          />
          <GuideCatalogCard
            title={t("referenceMaterials.grievanceWorksheet.title")}
            body={t("referenceMaterials.grievanceWorksheet.body")}
            action={
              <Link
                href={documentGeneratorPresetHref("grievance-intake")}
                className={guideCtaOutlineClassBlock}
              >
                {t("referenceMaterials.grievanceWorksheet.cta")}
              </Link>
            }
          />
        </ul>

        <p className="mt-4 text-sm text-gray-700">{t("tools.exportHint")}</p>

        <GuideActionRow>
          <Link
            href="/tools/complaint-vs-grievance"
            className={guideCtaOutlineClass}
          >
            {t("referenceMaterials.stewardGuides.diagnostic")}
          </Link>
          <Link href="/tools/pre-disciplinary-log" className={guideCtaOutlineClass}>
            {t("referenceMaterials.stewardGuides.discipline")}
          </Link>
          <Link href="/tools/rtw-accommodation" className={guideCtaOutlineClass}>
            {t("referenceMaterials.stewardGuides.rtw")}
          </Link>
          <Link href="/app/grievances" className={guideCtaOutlineClass}>
            {t("hub.cta")}
          </Link>
        </GuideActionRow>

        <GuideExpandSection
          title={t("modules.moreReferenceTitle")}
          summary={t("modules.moreReferenceSummary")}
          className="mt-6"
        >
          <ul className="grid list-none gap-6 p-0 md:grid-cols-2">
            <GuideCatalogCard
              title={t("referenceMaterials.board.title")}
              body={
                <>
                  <p>{t("referenceMaterials.board.body")}</p>
                  <nav
                    className="mt-3"
                    aria-label={t("referenceMaterials.board.title")}
                  >
                    <GuideLinkList
                      links={[
                        {
                          href: "/tools/org-chart",
                          label: t("referenceMaterials.board.orgChart"),
                        },
                        {
                          href: "/tools/board-notice",
                          label: t("referenceMaterials.board.boardNotice"),
                        },
                      ]}
                    />
                  </nav>
                </>
              }
            />
            <GuideCatalogCard
              title={t("referenceMaterials.followUp.title")}
              body={t("referenceMaterials.followUp.body")}
              action={
                <Link
                  href={documentGeneratorPresetHref("simple-letter")}
                  className={guideCtaOutlineClass}
                >
                  {t("referenceMaterials.followUp.cta")}
                </Link>
              }
            />
          </ul>
        </GuideExpandSection>
      </section>

      <GuideCallout tone="muted" className="mt-10" measure="fill">
        <p className="font-semibold text-opseu-dark">{t("hub.title")}</p>
        <p className="mt-2 max-w-prose leading-relaxed text-gray-700">
          {t("hub.body")}
        </p>
      </GuideCallout>

      <GuideCallout tone="muted" className="mt-8" measure="fill">
        <p className="font-semibold text-opseu-dark">{t("next.title")}</p>
        <p className="mt-2 max-w-prose leading-relaxed text-gray-700">
          {t("next.body")}
        </p>
        <nav className="mt-3" aria-label={t("next.title")}>
          <GuideLinkList
            links={[
              {
                href: "/guide/workplace-mapping",
                label: t("related.workplaceMapping"),
              },
              {
                href: "/guide/grievance-process",
                label: t("related.grievance"),
              },
              { href: "/guide/dfr", label: t("related.dfr") },
              {
                href: "/guide/membership-signup",
                label: t("related.membership"),
              },
            ]}
          />
        </nav>
      </GuideCallout>
    </GuideLayout>
  );
}

