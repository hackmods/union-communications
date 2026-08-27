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
  return buildPublicPageMetadata("/guide", params);
}

const TOC = [
  ["startHere", "startHere"],
  ["channels", "channels"],
  ["platforms", "platforms"],
  ["tone", "tone"],
  ["frequency", "frequency"],
  ["trolls", "trolls"],
  ["accessibility", "accessibility"],
  ["fullWeek", "fullWeek"],
] as const;

const startKeys = ["brand", "firstWeek", "resources", "officers"] as const;
const channelKeys = ["social", "print", "boards", "web"] as const;
const platformKeys = ["facebook", "instagram", "website", "startOne"] as const;
const toneKeys = ["we", "honest", "plain", "crisis"] as const;
const frequencyKeys = ["normal", "mix", "strike", "quiet"] as const;
const trollKeys = ["spam", "management", "pin", "never"] as const;
const a11yKeys = ["alt", "contrast", "captions", "mobile"] as const;
const weekKeys = ["mon", "wed", "thu", "fri"] as const;

const pathLinks = [
  { href: "/guide/social-media-plan", key: "plan" as const },
  { href: "/guide/resources", key: "resources" as const },
  { href: "/guide/crisis", key: "crisis" as const },
  { href: "/guide/steward-101", key: "steward101" as const },
  { href: "/guide/officer-learning", key: "officerLearning" as const },
  { href: "/guide/grievance-process", key: "grievance" as const },
  { href: "/guide/dfr", key: "dfr" as const },
  { href: "/guide/seniority-bumping", key: "seniority" as const },
  { href: "/guide/right-to-refuse", key: "rightToRefuse" as const },
  { href: "/guide/joint-committee", key: "jointCommittee" as const },
  { href: "/guide/workplace-mapping", key: "workplaceMapping" as const },
  { href: "/guide/bylaws", key: "bylaws" as const },
];

export default async function GuidePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("guide");
  const nav = await getTranslations("nav");
  const crisis = await getTranslations("crisisGuide");
  const ts = await getTranslations("sources");

  return (
    <GuideLayout
      size="wide"
      title={t("title")}
      subtitle={t("subtitle")}
      intro={t("intro")}
      relatedLabel={t("path.title")}
      relatedLinks={pathLinks.map(({ href, key }) => ({
        href,
        label: t(`path.${key}`),
      }))}
      footer={
        <SourcesBlock pageId="blueprint" title={ts("title")} intro={ts("intro")} />
      }
    >
      <Callout className="mb-8 max-w-3xl">
        <p className="font-semibold text-opseu-dark">{crisis("title")}</p>
        <p className="mt-1">{crisis("subtitle")}</p>
        <Link
          href="/guide/crisis"
          className="mt-2 inline-block font-medium text-opseu-blue underline"
        >
          {nav("strikeGuide")} →
        </Link>
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

      <GuideSection
        id="startHere"
        title={t("startHere.title")}
        intro={t("startHere.intro")}
      >
        <ItemList section="startHere" keys={startKeys} t={t} />
        <Callout className="mt-5 max-w-prose">
          <p className="font-semibold text-opseu-dark">{t("tipLabel")}</p>
          <p className="mt-1">{t("startHere.tip")}</p>
        </Callout>
        <div className="button-row mt-5 max-w-lg">
          <Link href="/brand-kit">
            <Button variant="outline">{nav("brandKit")}</Button>
          </Link>
          <Link href="/guide/social-media-plan">
            <Button variant="outline">{nav("socialMediaPlan")}</Button>
          </Link>
        </div>
      </GuideSection>

      <GuideSection id="channels" title={t("channels.title")} intro={t("channels.intro")}>
        <ItemList section="channels" keys={channelKeys} t={t} />
        <Callout tone="warning" className="mt-5 max-w-prose">
          <p className="font-semibold text-amber-950">
            {t("channels.warningTitle")}
          </p>
          <p className="mt-1">{t("channels.warning")}</p>
        </Callout>
      </GuideSection>

      <GuideSection
        id="platforms"
        title={t("platforms.title")}
        intro={t("platforms.intro")}
      >
        <ItemList section="platforms" keys={platformKeys} t={t} />
        <Callout className="mt-5 max-w-prose">
          <p className="font-semibold text-opseu-dark">{t("tipLabel")}</p>
          <p className="mt-1">{t("platforms.tip")}</p>
        </Callout>
      </GuideSection>

      <GuideSection id="tone" title={t("tone.title")} intro={t("tone.intro")}>
        <ItemList section="tone" keys={toneKeys} t={t} />
      </GuideSection>

      <GuideSection
        id="frequency"
        title={t("frequency.title")}
        intro={t("frequency.intro")}
      >
        <ItemList section="frequency" keys={frequencyKeys} t={t} />
        <Callout tone="muted" className="mt-5 max-w-prose">
          <p className="font-semibold text-opseu-dark">{t("tipLabel")}</p>
          <p className="mt-1">{t("frequency.tip")}</p>
        </Callout>
      </GuideSection>

      <GuideSection id="trolls" title={t("trolls.title")} intro={t("trolls.intro")}>
        <ItemList section="trolls" keys={trollKeys} t={t} />
        <Callout tone="warning" className="mt-5 max-w-prose">
          <p className="font-semibold text-amber-950">{t("trolls.warningTitle")}</p>
          <p className="mt-1">{t("trolls.warning")}</p>
        </Callout>
      </GuideSection>

      <GuideSection
        id="accessibility"
        title={t("accessibility.title")}
        intro={t("accessibility.intro")}
      >
        <ItemList section="accessibility" keys={a11yKeys} t={t} />
        <div className="button-row mt-5 max-w-lg">
          <Link href="/tools/alt-text">
            <Button variant="outline">{nav("altText")}</Button>
          </Link>
        </div>
      </GuideSection>

      <GuideSection
        id="fullWeek"
        title={t("fullWeek.title")}
        intro={t("fullWeek.intro")}
      >
        <ol className="mt-4 list-decimal space-y-4 pl-5 text-gray-700">
          {weekKeys.map((key) => (
            <li key={key} className="max-w-prose leading-relaxed">
              <span className="font-semibold text-opseu-dark">
                {t(`fullWeek.phases.${key}.label`)}
              </span>
              {" — "}
              {t(`fullWeek.phases.${key}.content`)}
            </li>
          ))}
        </ol>
        <Callout className="mt-5 max-w-prose">
          <p className="font-semibold text-opseu-dark">{t("tipLabel")}</p>
          <p className="mt-1">{t("fullWeek.tip")}</p>
        </Callout>
      </GuideSection>

      <div className="mt-10 grid gap-4 lg:grid-cols-2">
        <Callout tone="muted">
          <p className="font-semibold text-opseu-dark">{t("channelGuides.title")}</p>
          <nav
            className="mt-2 flex flex-wrap items-baseline gap-x-3 gap-y-1"
            aria-label={t("channelGuides.title")}
          >
            {(
              [
                { href: "/guide/union-boards", key: "unionBoards" as const },
                { href: "/guide/print", key: "print" as const },
                { href: "/guide/website", key: "website" as const },
                { href: "/guide/email-broadcast", key: "email" as const },
                { href: "/guide/short-form", key: "shortForm" as const },
                {
                  href: "/guide/membership-signup",
                  key: "membershipSignup" as const,
                },
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
                  {t(`channelGuides.${link.key}`)}
                </Link>
              </span>
            ))}
          </nav>
        </Callout>

        <Callout tone="muted">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <p className="font-semibold text-opseu-dark">{t("labourGuides.title")}</p>
            <Link
              href="/guide/steward-playbooks"
              className="text-sm font-medium text-opseu-blue underline underline-offset-2 hover:text-opseu-dark"
            >
              {t("labourGuides.seeAll")} →
            </Link>
          </div>
          <nav
            className="mt-2 flex flex-wrap items-baseline gap-x-3 gap-y-1"
            aria-label={t("labourGuides.title")}
          >
            {(
              [
                { href: "/guide/steward-101", key: "steward101" as const },
                {
                  href: "/guide/officer-learning",
                  key: "officerLearning" as const,
                },
                {
                  href: "/guide/grievance-process",
                  key: "grievance" as const,
                },
                { href: "/guide/dfr", key: "dfr" as const },
                { href: "/guide/seniority-bumping", key: "seniority" as const },
                {
                  href: "/guide/right-to-refuse",
                  key: "rightToRefuse" as const,
                },
                {
                  href: "/guide/joint-committee",
                  key: "jointCommittee" as const,
                },
                {
                  href: "/guide/workplace-mapping",
                  key: "workplaceMapping" as const,
                },
                { href: "/guide/bylaws", key: "bylaws" as const },
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
                  {t(`labourGuides.${link.key}`)}
                </Link>
              </span>
            ))}
          </nav>
        </Callout>
      </div>
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
        <li key={key} className="max-w-prose leading-relaxed">
          <span className="font-semibold text-opseu-dark">
            {t(`${section}.items.${key}.label`)}.
          </span>{" "}
          {t(`${section}.items.${key}.content`)}
        </li>
      ))}
    </ul>
  );
}
