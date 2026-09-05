import type { Metadata } from "next";
import type { ReactNode } from "react";
import { buildPublicPageMetadata } from "@/lib/seo/public-page-meta";
import { setRequestLocale, getTranslations } from "next-intl/server";
import { SourcesBlock } from "@/components/comms/SourcesBlock";
import { GuideLayout } from "@/components/comms/GuideLayout";
import { GuideToolAside } from "@/components/comms/GuideToolAside";
import {
  AffiliationExampleDiagram,
  AffiliationTracksDiagram,
} from "@/components/comms/StewardGuideDiagrams";
import {
  guideCtaClass,
  guideCtaOutlineClass,
} from "@/components/comms/guideCtaClasses";
import { Callout } from "@/components/ui/Callout";
import { Link } from "@/i18n/navigation";
import { OfficerLearningModuleCallout } from "@/components/officer-learning/OfficerLearningModuleCallout";
import { COMMS_SOURCES } from "@/lib/constants/comms-sources";

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
const toolKeys = ["orgChart", "website", "bylaws", "meetings"] as const;

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
          ]}
        />
      }
      relatedLinks={[
        { href: "/guide/steward-playbooks", label: t("backToPlaybooks") },
        { href: "/guide", label: t("backToGuide") },
        { href: "/guide/officer-learning", label: t("related.officerLearning") },
        { href: "/guide/steward-101", label: t("related.steward101") },
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
      <Callout className="mb-8">
        <p className="font-semibold text-opseu-dark">{t("disclaimer.title")}</p>
        <p className="mt-2 leading-relaxed text-gray-700">
          {t("disclaimer.body")}
        </p>
      </Callout>

      <OfficerLearningModuleCallout
        slug="democratic-governance"
        moduleNumber={4}
      />

      <GuideSection id="why" title={t("why.title")} intro={t("why.intro")}>
        <ul className="mt-4 list-disc space-y-3 pl-5 text-gray-700">
          {whyKeys.map((key) => (
            <TipItem
              key={key}
              label={t(`why.items.${key}.label`)}
              content={t(`why.items.${key}.content`)}
            />
          ))}
        </ul>
      </GuideSection>

      <GuideSection
        id="history"
        title={t("history.title")}
        intro={t("history.intro")}
      >
        <ul className="mt-4 list-disc space-y-3 pl-5 text-gray-700">
          {historyKeys.map((key) => (
            <TipItem
              key={key}
              label={t(`history.items.${key}.label`)}
              content={t(`history.items.${key}.content`)}
            />
          ))}
        </ul>
        <Callout className="mt-5 max-w-prose">
          <p className="font-semibold text-opseu-dark">{t("tipLabel")}</p>
          <p className="mt-1">{t("history.tip")}</p>
        </Callout>
      </GuideSection>

      <GuideSection
        id="tracks"
        title={t("tracks.title")}
        intro={t("tracks.intro")}
      >
        <AffiliationTracksDiagram
          className="mt-5 max-w-3xl"
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
        <p className="mt-5 max-w-prose leading-relaxed text-gray-700">
          {t("tracks.nupgeLead")}{" "}
          <RegistryLink id="nupge-labour-map">
            {t("tracks.nupgeLink")}
          </RegistryLink>
          {t("tracks.nupgeTail")}
        </p>
        <p className="mt-3 max-w-prose leading-relaxed text-gray-700">
          {t("tracks.clcLead")}{" "}
          <RegistryLink id="clc-federations">{t("tracks.clcLink")}</RegistryLink>
          {t("tracks.clcTail")}
        </p>
      </GuideSection>

      <GuideSection
        id="example"
        title={t("example.title")}
        intro={t("example.intro")}
      >
        <AffiliationExampleDiagram
          className="mt-5"
          local={t("example.diagram.local")}
          area={t("example.diagram.area")}
          council={t("example.diagram.council")}
          union={t("example.diagram.union")}
          ofl={t("example.diagram.ofl")}
          nupge={t("example.diagram.nupge")}
          clc={t("example.diagram.clc")}
          caption={t("example.diagram.caption")}
        />
        <ul className="mt-5 list-disc space-y-3 pl-5 text-gray-700">
          <TipItem
            label={t("example.items.local.label")}
            content={t("example.items.local.content")}
          />
          <li className="max-w-prose leading-relaxed">
            <span className="font-semibold text-opseu-dark">
              {t("example.items.council.label")}.
            </span>{" "}
            {t("example.items.council.before")}{" "}
            <RegistryLink id="nrlc-who-we-are">
              {t("example.items.council.link")}
            </RegistryLink>{" "}
            {t("example.items.council.after")}
          </li>
          <TipItem
            label={t("example.items.area.label")}
            content={t("example.items.area.content")}
          />
          <TipItem
            label={t("example.items.union.label")}
            content={t("example.items.union.content")}
          />
          <li className="max-w-prose leading-relaxed">
            <span className="font-semibold text-opseu-dark">
              {t("example.items.nupge.label")}.
            </span>{" "}
            {t("example.items.nupge.before")}{" "}
            <RegistryLink id="nupge">{t("example.items.nupge.link")}</RegistryLink>{" "}
            {t("example.items.nupge.after")}
          </li>
        </ul>
        <Callout className="mt-5 max-w-prose">
          <p className="font-semibold text-opseu-dark">{t("tipLabel")}</p>
          <p className="mt-1">{t("example.tip")}</p>
        </Callout>
      </GuideSection>

      <GuideSection
        id="layers"
        title={t("layers.title")}
        intro={t("layers.intro")}
      >
        <ul className="mt-4 list-disc space-y-3 pl-5 text-gray-700">
          {layerKeys.map((key) => (
            <TipItem
              key={key}
              label={t(`layers.items.${key}.label`)}
              content={t(`layers.items.${key}.content`)}
            />
          ))}
        </ul>
      </GuideSection>

      <GuideSection
        id="mapYours"
        title={t("mapYours.title")}
        intro={t("mapYours.intro")}
      >
        <ol className="mt-4 list-decimal space-y-4 pl-5 text-gray-700">
          {mapYoursKeys.map((key) => (
            <TipItem
              key={key}
              label={t(`mapYours.items.${key}.label`)}
              content={t(`mapYours.items.${key}.content`)}
            />
          ))}
        </ol>
        <Callout className="mt-5 max-w-prose">
          <p className="font-semibold text-opseu-dark">{t("tipLabel")}</p>
          <p className="mt-1">{t("mapYours.tip")}</p>
        </Callout>
      </GuideSection>

      <GuideSection
        id="notThis"
        title={t("notThis.title")}
        intro={t("notThis.intro")}
      >
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

      <GuideSection id="tools" title={t("tools.title")} intro={t("tools.intro")}>
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
          <Link href="/tools/org-chart" className={guideCtaClass}>
            {nav("orgChart")}
          </Link>
          <Link
            href="/tools/website-template"
            className={guideCtaOutlineClass}
          >
            {nav("websiteTemplate")}
          </Link>
          <Link href="/guide/bylaws" className={guideCtaOutlineClass}>
            {nav("bylawsGuide")}
          </Link>
        </div>
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
  children: ReactNode;
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
