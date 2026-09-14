import type { Metadata } from "next";
import type { ReactNode } from "react";
import { buildPublicPageMetadata } from "@/lib/seo/public-page-meta";
import { setRequestLocale, getTranslations } from "next-intl/server";
import { SourcesBlock } from "@/components/comms/SourcesBlock";
import { GuideToolAside } from "@/components/comms/GuideToolAside";
import { GuideExpandSection } from "@/components/comms/GuideExpandSection";
import {
  AffiliationExampleDiagram,
  AffiliationTracksDiagram,
} from "@/components/comms/StewardGuideDiagrams";
import {
  guideCtaClass,
  guideCtaOutlineClass,
} from "@/components/comms/guideCtaClasses";
import { Link } from "@/i18n/navigation";
import { OfficerLearningModuleCallout } from "@/components/officer-learning/OfficerLearningModuleCallout";
import { AffiliationMapWorksheetButton } from "@/components/comms/AffiliationMapWorksheetButton";
import { COMMS_SOURCES } from "@/lib/constants/comms-sources";
import {
  GuideLayout,
  GuideActionRow,
  GuideBulletList,
  GuideCallout,
  GuideCatalogCard,
  GuideOutlineList,
  GuideOutlineStep,
  GuideProse,
  GuideSection,
  GuideSubHeading,
  GuideTipGrid,
  GuideTipItem,
  GuideWideFigure,
} from "@/components/comms/guide-ui";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  return buildPublicPageMetadata("/guide/union-history", params);
}

const TOC = [
  ["why", "why"],
  ["history", "history"],
  ["tracks", "tracks"],
  ["example", "example"],
  ["layers", "layers"],
  ["mapYours", "mapYours"],
  ["notThis", "notThis"],
  ["tools", "tools"],
] as const;

const whyKeys = ["rally", "campaign", "education", "strike"] as const;
const historyKeys = [
  "nineHour",
  "winnipeg",
  "rand",
  "clcMerge",
  "publicSector",
  "quebec",
] as const;
const layerKeys = [
  "local",
  "area",
  "council",
  "union",
  "ofl",
  "nupge",
  "clc",
] as const;
const mapYoursKeys = [
  "name",
  "parent",
  "federation",
  "council",
  "provincial",
  "internal",
] as const;
const notThisKeys = [
  "oneStack",
  "nupgeParent",
  "areaEqualsCouncil",
  "quebec",
  "unaffiliated",
] as const;
const confirmKeys = ["executive", "council", "quebec", "split"] as const;
const toolRows = [
  { key: "orgChart", href: "/tools/org-chart" },
  { key: "website", href: "/tools/website-template" },
  { key: "bylaws", href: "/guide/bylaws" },
  { key: "meetings", href: "/guide/running-meetings" },
] as const;

function RegistryLink({
  id,
  children,
}: {
  id: string;
  children: ReactNode;
}) {
  const source = COMMS_SOURCES[id];
  if (!source) return children;
  return (
    <a
      href={source.url}
      target="_blank"
      rel="noopener noreferrer"
      className="font-medium text-opseu-blue underline underline-offset-2"
    >
      {children}
    </a>
  );
}

export default async function UnionHistoryGuidePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<ReactNode> {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("unionHistoryGuide");
  const nav = await getTranslations("nav");
  const tg = await getTranslations("guideCommon");
  const ts = await getTranslations("sources");

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
              href: "/tools/org-chart",
              label: nav("orgChart"),
            },
            {
              href: "/tools/website-template",
              label: nav("websiteTemplate"),
              variant: "outline",
            },
            {
              href: "/guide/bylaws",
              label: nav("bylawsGuide"),
              variant: "outline",
            },
            {
              href: "/guide/running-meetings",
              label: nav("runningMeetingsGuide"),
              variant: "outline",
            },
            {
              href: "/brand-kit",
              label: nav("brandKit"),
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
        { href: "/guide/steward-101", label: t("related.steward101") },
        { href: "/guide/bylaws", label: t("related.bylaws") },
        { href: "/guide/running-meetings", label: t("related.runningMeetings") },
        {
          href: "/guide/land-acknowledgement",
          label: t("related.landAcknowledgement"),
        },
        {
          href: "/guide/workplace-mapping",
          label: t("related.workplaceMapping"),
        },
      ]}
      footer={
        <SourcesBlock
          pageId="unionHistory"
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

      <OfficerLearningModuleCallout
        slug="democratic-governance"
        moduleNumber={4}
      />

      <GuideSection id="why" title={t("why.title")} intro={t("why.intro")}>
        <GuideTipGrid>
          {whyKeys.map((key) => (
            <GuideTipItem
              key={key}
              label={t(`why.items.${key}.label`)}
              content={t(`why.items.${key}.content`)}
            />
          ))}
        </GuideTipGrid>
      </GuideSection>

      <GuideSection
        id="history"
        title={t("history.title")}
        intro={t("history.intro")}
      >
        <GuideExpandSection
          title={t("history.expandTitle")}
          summary={t("history.expandSummary")}
          className="mt-5"
        >
          <GuideTipGrid className="mt-3" columns={3} dense>
            {historyKeys.map((key) => (
              <GuideTipItem
                key={key}
                label={t(`history.items.${key}.label`)}
                content={t(`history.items.${key}.content`)}
              />
            ))}
          </GuideTipGrid>
        </GuideExpandSection>
        <GuideCallout className="mt-5">
          <p className="font-semibold text-opseu-dark">{t("tipLabel")}</p>
          <p className="mt-1">{t("history.tip")}</p>
        </GuideCallout>
      </GuideSection>

      <GuideSection
        id="tracks"
        title={t("tracks.title")}
        intro={t("tracks.intro")}
      >
        <GuideWideFigure>
          <AffiliationTracksDiagram
            className="w-full max-w-3xl"
            familyTitle={t("tracks.diagram.familyTitle")}
            geoTitle={t("tracks.diagram.geoTitle")}
            family={[
              t("tracks.diagram.familyLocal"),
              t("tracks.diagram.familyUnion"),
              t("tracks.diagram.familyNational"),
              t("tracks.diagram.familyCongress"),
            ]}
            geo={[
              t("tracks.diagram.geoLocal"),
              t("tracks.diagram.geoCouncil"),
              t("tracks.diagram.geoFed"),
              t("tracks.diagram.geoCongress"),
            ]}
            caption={t("tracks.diagram.caption")}
          />
        </GuideWideFigure>
        <GuideProse className="mt-5">
          {t("tracks.nupgeLead")}{" "}
          <RegistryLink id="nupge-labour-map">
            {t("tracks.nupgeLink")}
          </RegistryLink>
          {t("tracks.nupgeTail")}
        </GuideProse>
        <GuideProse className="mt-3">
          {t("tracks.clcLead")}{" "}
          <RegistryLink id="clc-federations">{t("tracks.clcLink")}</RegistryLink>
          {t("tracks.clcTail")}
        </GuideProse>
        <GuideCallout tone="warning" className="mt-5">
          <p className="font-semibold text-amber-950">{t("tracks.warningTitle")}</p>
          <p className="mt-2 leading-relaxed">{t("tracks.warningBody")}</p>
        </GuideCallout>
      </GuideSection>

      <GuideSection
        id="example"
        title={t("example.title")}
        intro={t("example.intro")}
      >
        <GuideWideFigure>
          <AffiliationExampleDiagram
            className="w-full"
            local={t("example.diagram.local")}
            area={t("example.diagram.area")}
            council={t("example.diagram.council")}
            union={t("example.diagram.union")}
            ofl={t("example.diagram.ofl")}
            nupge={t("example.diagram.nupge")}
            clc={t("example.diagram.clc")}
            caption={t("example.diagram.caption")}
          />
        </GuideWideFigure>
        <GuideTipGrid className="mt-5">
          <GuideTipItem
            label={t("example.items.local.label")}
            content={t("example.items.local.content")}
          />
          <GuideTipItem
            label={t("example.items.council.label")}
            content={
              <>
                {t("example.items.council.before")}{" "}
                <RegistryLink id="nrlc-who-we-are">
                  {t("example.items.council.link")}
                </RegistryLink>{" "}
                {t("example.items.council.after")}
              </>
            }
          />
          <GuideTipItem
            label={t("example.items.area.label")}
            content={t("example.items.area.content")}
          />
          <GuideTipItem
            label={t("example.items.union.label")}
            content={t("example.items.union.content")}
          />
          <GuideTipItem
            label={t("example.items.nupge.label")}
            content={
              <>
                {t("example.items.nupge.before")}{" "}
                <RegistryLink id="nupge">
                  {t("example.items.nupge.link")}
                </RegistryLink>{" "}
                {t("example.items.nupge.after")}
              </>
            }
          />
        </GuideTipGrid>
        <GuideCallout className="mt-5">
          <p className="font-semibold text-opseu-dark">{t("tipLabel")}</p>
          <p className="mt-1">{t("example.tip")}</p>
        </GuideCallout>
      </GuideSection>

      <GuideSection
        id="layers"
        title={t("layers.title")}
        intro={t("layers.intro")}
      >
        <GuideTipGrid columns={3} dense>
          {layerKeys.map((key) => (
            <GuideTipItem
              key={key}
              label={t(`layers.items.${key}.label`)}
              content={t(`layers.items.${key}.content`)}
            />
          ))}
        </GuideTipGrid>
      </GuideSection>

      <GuideSection
        id="mapYours"
        title={t("mapYours.title")}
        intro={t("mapYours.intro")}
      >
        <GuideOutlineList className="mt-4 space-y-6">
          {mapYoursKeys.map((key, index) => (
            <GuideOutlineStep
              key={key}
              id={`map-${key}`}
              step={index + 1}
              title={t(`mapYours.items.${key}.label`)}
            >
              <GuideProse className="mt-2">
                {t(`mapYours.items.${key}.content`)}
              </GuideProse>
            </GuideOutlineStep>
          ))}
        </GuideOutlineList>
        <GuideCallout className="mt-5">
          <p className="font-semibold text-opseu-dark">
            {t("mapYours.confirm.title")}
          </p>
          <GuideBulletList className="mt-3" columns={2}>
            {confirmKeys.map((key) => (
              <li key={key} className="leading-relaxed">
                {t(`mapYours.confirm.items.${key}`)}
              </li>
            ))}
          </GuideBulletList>
        </GuideCallout>
        <div className="mt-8">
          <GuideSubHeading>{t("worksheet.heading")}</GuideSubHeading>
          <GuideProse className="mt-2">{t("worksheet.intro")}</GuideProse>
          <AffiliationMapWorksheetButton className="mt-4" />
          <GuideProse className="mt-2 text-sm text-gray-600">
            {t("worksheet.hint")}
          </GuideProse>
        </div>
        <GuideCallout className="mt-5">
          <p className="font-semibold text-opseu-dark">{t("tipLabel")}</p>
          <p className="mt-1">{t("mapYours.tip")}</p>
        </GuideCallout>
      </GuideSection>

      <GuideSection
        id="notThis"
        title={t("notThis.title")}
        intro={t("notThis.intro")}
      >
        <GuideTipGrid>
          {notThisKeys.map((key) => (
            <GuideTipItem
              key={key}
              label={t(`notThis.items.${key}.label`)}
              content={t(`notThis.items.${key}.content`)}
            />
          ))}
        </GuideTipGrid>
      </GuideSection>

      <GuideSection id="tools" title={t("tools.title")} intro={t("tools.intro")}>
        <ul className="mt-4 grid list-none gap-5 p-0 sm:grid-cols-2">
          {toolRows.map(({ key, href }) => (
            <GuideCatalogCard
              key={key}
              titleAs="h3"
              href={href}
              title={t(`tools.items.${key}.label`)}
              body={t(`tools.items.${key}.content`)}
            />
          ))}
        </ul>
        <AffiliationMapWorksheetButton className="mt-5" />
        <GuideActionRow>
          <Link href="/tools/org-chart" className={guideCtaClass}>
            {nav("orgChart")}
          </Link>
          <Link href="/tools/website-template" className={guideCtaOutlineClass}>
            {nav("websiteTemplate")}
          </Link>
          <Link href="/guide/bylaws" className={guideCtaOutlineClass}>
            {nav("bylawsGuide")}
          </Link>
          <Link
            href="/guide/running-meetings"
            className={guideCtaOutlineClass}
          >
            {nav("runningMeetingsGuide")}
          </Link>
        </GuideActionRow>
      </GuideSection>
    </GuideLayout>
  );
}
