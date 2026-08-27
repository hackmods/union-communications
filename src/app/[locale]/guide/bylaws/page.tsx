import type { Metadata } from "next";
import { buildPublicPageMetadata } from "@/lib/seo/public-page-meta";
import { setRequestLocale, getTranslations } from "next-intl/server";
import { SourcesBlock } from "@/components/comms/SourcesBlock";
import { GuideLayout } from "@/components/comms/GuideLayout";
import { Callout } from "@/components/ui/Callout";
import { Button } from "@/components/ui/Button";
import { Link } from "@/i18n/navigation";
import { OfficerLearningModuleCallout } from "@/components/officer-learning/OfficerLearningModuleCallout";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  return buildPublicPageMetadata("/guide/bylaws", params);
}

const TOC = [
  ["gate", "gate"],
  ["mustHave", "mustHave"],
  ["amend", "amend"],
  ["scenario", "scenario"],
  ["checklist", "checklist"],
  ["examples", "examples"],
  ["failureModes", "failureModes"],
  ["tools", "tools"],
] as const;

const gateKeys = ["constitution", "bylaws", "policy", "ca"] as const;
const mustHaveKeys = [
  "executive",
  "quorum",
  "signing",
  "elections",
  "meetings",
  "finances",
  "amendments",
] as const;
const amendKeys = ["notice", "gmm", "threshold", "approval"] as const;
const scenarioKeys = ["d0", "d1", "d2", "d3", "d4", "d5", "d6"] as const;
const checklistKeys = [
  "readConstitution",
  "comparePeers",
  "draftText",
  "postNotice",
  "quorumMath",
  "gmmVote",
  "submitNational",
  "publishMembers",
] as const;
const exampleKeys = ["cupe", "unifor", "opseu", "shared"] as const;
const failureKeys = [
  "lecOnly",
  "policyAsBylaw",
  "noNotice",
  "conflict",
  "noApproval",
] as const;
const toolKeys = ["builder", "boardNotice", "orgChart", "email", "letterhead"] as const;

export default async function BylawsGuidePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("bylawsGuide");
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
        { href: "/guide/officer-learning", label: t("related.officerLearning") },
        {
          href: "/guide/officer-learning/democratic-governance",
          label: t("related.governance"),
        },
        { href: "/tools/bylaw-builder", label: nav("bylawBuilder") },
        { href: "/tools/org-chart", label: nav("orgChart") },
        { href: "/tools/board-notice", label: nav("boardNotice") },
        { href: "/guide/email-broadcast", label: nav("emailBroadcastGuide") },
      ]}
      footer={
        <SourcesBlock
          pageId="bylaws"
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
        id="mustHave"
        title={t("mustHave.title")}
        intro={t("mustHave.intro")}
      >
        <ul className="mt-4 list-disc space-y-3 pl-5 text-gray-700">
          {mustHaveKeys.map((key) => (
            <TipItem
              key={key}
              label={t(`mustHave.items.${key}.label`)}
              content={t(`mustHave.items.${key}.content`)}
            />
          ))}
        </ul>
        <Callout className="mt-5 max-w-prose">
          <p className="font-semibold text-opseu-dark">{t("tipLabel")}</p>
          <p className="mt-1">{t("mustHave.tip")}</p>
        </Callout>
      </GuideSection>

      <GuideSection id="amend" title={t("amend.title")} intro={t("amend.intro")}>
        <ol className="mt-4 list-decimal space-y-4 pl-5 text-gray-700">
          {amendKeys.map((key) => (
            <li key={key} className="max-w-prose leading-relaxed">
              <span className="font-semibold text-opseu-dark">
                {t(`amend.items.${key}.label`)}
              </span>
              {" — "}
              {t(`amend.items.${key}.content`)}
            </li>
          ))}
        </ol>
        <Callout tone="warning" className="mt-5 max-w-prose">
          <p className="font-semibold text-amber-950">
            {t("amend.warningTitle")}
          </p>
          <p className="mt-1">{t("amend.warning")}</p>
        </Callout>
        <div className="button-row mt-5 max-w-2xl">
          <Link href="/tools/board-notice">
            <Button variant="outline">{t("amend.boardNoticeCta")}</Button>
          </Link>
          <Link href="/guide/email-broadcast">
            <Button variant="outline">{t("amend.emailCta")}</Button>
          </Link>
        </div>
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
        id="checklist"
        title={t("checklist.title")}
        intro={t("checklist.intro")}
      >
        <ChecklistFigure
          caption={t("checklist.caption")}
          items={checklistKeys.map((key) => t(`checklist.items.${key}`))}
        />
      </GuideSection>

      <GuideSection
        id="examples"
        title={t("examples.title")}
        intro={t("examples.intro")}
      >
        <ul className="mt-4 list-disc space-y-3 pl-5 text-gray-700">
          {exampleKeys.map((key) => (
            <TipItem
              key={key}
              label={t(`examples.items.${key}.label`)}
              content={t(`examples.items.${key}.content`)}
            />
          ))}
        </ul>
        <Callout className="mt-5 max-w-prose">
          <p className="font-semibold text-opseu-dark">{t("tipLabel")}</p>
          <p className="mt-1">{t("examples.tip")}</p>
        </Callout>
      </GuideSection>

      <GuideSection
        id="failureModes"
        title={t("failureModes.title")}
        intro={t("failureModes.intro")}
      >
        <ul className="mt-4 list-disc space-y-3 pl-5 text-gray-700">
          {failureKeys.map((key) => (
            <TipItem
              key={key}
              label={t(`failureModes.items.${key}.label`)}
              content={t(`failureModes.items.${key}.content`)}
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
          <Link href="/tools/bylaw-builder">
            <Button>{nav("bylawBuilder")}</Button>
          </Link>
          <Link href="/tools/board-notice">
            <Button variant="outline">{nav("boardNotice")}</Button>
          </Link>
          <Link href="/tools/org-chart">
            <Button variant="outline">{nav("orgChart")}</Button>
          </Link>
          <Link href="/tools/document-generator?preset=letterhead">
            <Button variant="outline">{nav("documentGenerator")}</Button>
          </Link>
        </div>
      </section>

      <Callout tone="muted" className="mt-10">
        <p className="font-semibold text-opseu-dark">{t("example.title")}</p>
        <p className="mt-2 leading-relaxed text-gray-700">{t("example.body")}</p>
      </Callout>

      <Callout className="mt-8">
        <p className="font-semibold text-opseu-dark">{t("sourcesNote.title")}</p>
        <p className="mt-2 leading-relaxed text-gray-700">
          {t("sourcesNote.body")}
        </p>
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

function ChecklistFigure({
  caption,
  items,
}: {
  caption: string;
  items: string[];
}) {
  return (
    <figure className="mt-5 max-w-prose rounded-lg border border-gray-200 bg-white p-4">
      <figcaption className="text-sm font-semibold text-opseu-dark">
        {caption}
      </figcaption>
      <ul className="mt-3 space-y-2">
        {items.map((item) => (
          <li
            key={item}
            className="flex gap-3 text-sm leading-relaxed text-gray-700"
          >
            <span
              className="mt-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded border border-gray-300 bg-gray-50 text-xs text-gray-400"
              aria-hidden="true"
            >
              ☐
            </span>
            <span>{item}</span>
          </li>
        ))}
      </ul>
    </figure>
  );
}
