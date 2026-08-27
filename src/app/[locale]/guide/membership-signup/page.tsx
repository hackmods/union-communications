import type { Metadata } from "next";
import { buildPublicPageMetadata } from "@/lib/seo/public-page-meta";
import { setRequestLocale, getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { GuideLayout } from "@/components/comms/GuideLayout";
import { SourcesBlock } from "@/components/comms/SourcesBlock";
import { Callout } from "@/components/ui/Callout";
import { Button } from "@/components/ui/Button";
import { OfficerLearningModuleCallout } from "@/components/officer-learning/OfficerLearningModuleCallout";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  return buildPublicPageMetadata("/guide/membership-signup", params);
}

const TOC = [
  ["why", "why"],
  ["conversation", "conversation"],
  ["paper", "paper"],
  ["digital", "digital"],
  ["privacy", "privacy"],
  ["materials", "materials"],
  ["onboarding", "onboarding"],
  ["checklist", "checklist"],
] as const;

const whyItemKeys = ["density", "vote", "bargain", "comms"] as const;
const conversationItemKeys = ["listen", "connect", "explain", "ask"] as const;
const paperItemKeys = ["legible", "handoff", "storage", "processing"] as const;
const digitalItemKeys = ["urls", "qr", "test", "collection"] as const;
const materialSteps = ["brandKit", "printMaterials", "welcome"] as const;
const onboardingItemKeys = ["welcome", "steward", "broadcast", "confirm"] as const;
const checklistItemKeys = [
  "url",
  "phone",
  "readable",
  "contact",
  "privacy",
  "handoff",
] as const;

export default async function MembershipSignupGuidePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("membershipSignupGuide");
  const nav = await getTranslations("nav");
  const ts = await getTranslations("sources");
  const labour = await getTranslations("guide");

  return (
    <GuideLayout
      title={t("title")}
      subtitle={t("subtitle")}
      intro={t("intro")}
      relatedLabel={t("relatedLabel")}
      relatedLinks={[
        { href: "/guide/steward-playbooks", label: t("related.stewardPlaybooks") },
        { href: "/guide/officer-learning", label: t("related.officerLearning") },
        { href: "/brand-kit", label: nav("brandKit") },
        { href: "/tools/qr-board", label: nav("qrBoard") },
        { href: "/tools/qr-card", label: nav("qrCard") },
        { href: "/tools/solidarity-poster", label: nav("solidarityPoster") },
        {
          href: "/tools/document-generator",
          label: nav("documentGenerator"),
        },
        { href: "/guide/print", label: nav("printGuide") },
        { href: "/guide/email-broadcast", label: nav("emailBroadcastGuide") },
        { href: "/guide/union-boards", label: nav("unionBoardsGuide") },
        {
          href: "/guide/workplace-mapping",
          label: labour("labourGuides.workplaceMapping"),
        },
      ]}
      footer={
        <SourcesBlock
          pageId="membershipSignup"
          title={ts("title")}
          intro={ts("intro")}
        />
      }
    >
      <OfficerLearningModuleCallout slug="building-collective-power" moduleNumber={6} />

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

      <section
        id="why"
        className="scroll-mt-28 border-l-2 border-opseu-blue/30 pl-5"
        aria-labelledby="why-heading"
      >
        <h2
          id="why-heading"
          className="text-xl font-bold text-opseu-dark md:text-2xl"
        >
          {t("why.title")}
        </h2>
        <p className="mt-3 max-w-prose leading-relaxed text-gray-700">
          {t("why.intro")}
        </p>
        <ul className="mt-4 list-disc space-y-3 pl-5 text-gray-700">
          {whyItemKeys.map((key) => (
            <TipItem
              key={key}
              label={t(`why.items.${key}.label`)}
              content={t(`why.items.${key}.content`)}
            />
          ))}
        </ul>
      </section>

      <section
        id="conversation"
        className="mt-12 scroll-mt-28 border-l-2 border-opseu-blue/30 pl-5"
        aria-labelledby="conversation-heading"
      >
        <h2
          id="conversation-heading"
          className="text-xl font-bold text-opseu-dark md:text-2xl"
        >
          {t("conversation.title")}
        </h2>
        <p className="mt-3 max-w-prose leading-relaxed text-gray-700">
          {t("conversation.intro")}
        </p>
        <ul className="mt-4 list-disc space-y-3 pl-5 text-gray-700">
          {conversationItemKeys.map((key) => (
            <TipItem
              key={key}
              label={t(`conversation.items.${key}.label`)}
              content={t(`conversation.items.${key}.content`)}
            />
          ))}
        </ul>
      </section>

      <section
        id="paper"
        className="mt-12 scroll-mt-28 border-l-2 border-opseu-blue/30 pl-5"
        aria-labelledby="paper-heading"
      >
        <h2
          id="paper-heading"
          className="text-xl font-bold text-opseu-dark md:text-2xl"
        >
          {t("paper.title")}
        </h2>
        <p className="mt-3 max-w-prose leading-relaxed text-gray-700">
          {t("paper.intro")}
        </p>
        <ul className="mt-4 list-disc space-y-3 pl-5 text-gray-700">
          {paperItemKeys.map((key) => (
            <TipItem
              key={key}
              label={t(`paper.items.${key}.label`)}
              content={t(`paper.items.${key}.content`)}
            />
          ))}
        </ul>
        <p className="mt-5 max-w-prose leading-relaxed text-gray-700">
          <Link
            href="/guide/print"
            className="font-medium text-opseu-blue underline underline-offset-2 hover:text-opseu-dark"
          >
            {nav("printGuide")}
          </Link>
        </p>
      </section>

      <section
        id="digital"
        className="mt-12 scroll-mt-28 border-l-2 border-opseu-blue/30 pl-5"
        aria-labelledby="digital-heading"
      >
        <h2
          id="digital-heading"
          className="text-xl font-bold text-opseu-dark md:text-2xl"
        >
          {t("digital.title")}
        </h2>
        <p className="mt-3 max-w-prose leading-relaxed text-gray-700">
          {t("digital.intro")}
        </p>
        <ul className="mt-4 list-disc space-y-3 pl-5 text-gray-700">
          {digitalItemKeys.map((key) => (
            <TipItem
              key={key}
              label={t(`digital.items.${key}.label`)}
              content={t(`digital.items.${key}.content`)}
            />
          ))}
        </ul>
        <Callout className="mt-5 max-w-prose">
          <p className="mt-1">{t("digital.testTip")}</p>
        </Callout>
      </section>

      <section
        id="privacy"
        className="mt-12 scroll-mt-28 border-l-2 border-opseu-blue/30 pl-5"
        aria-labelledby="privacy-heading"
      >
        <h2
          id="privacy-heading"
          className="text-xl font-bold text-opseu-dark md:text-2xl"
        >
          {t("privacy.title")}
        </h2>
        <p className="mt-3 max-w-prose leading-relaxed text-gray-700">
          {t("privacy.intro")}
        </p>
        <Callout tone="warning" className="mt-5 max-w-prose">
          <p className="font-semibold text-amber-950">
            {t("privacy.employerDriveTitle")}
          </p>
          <p className="mt-1">{t("privacy.employerDriveBody")}</p>
        </Callout>
        <Callout tone="warning" className="mt-4 max-w-prose">
          <p className="font-semibold text-amber-950">
            {t("privacy.personalContactTitle")}
          </p>
          <p className="mt-1">{t("privacy.personalContactBody")}</p>
        </Callout>
        <p className="mt-5 max-w-prose leading-relaxed text-gray-700">
          {t("privacy.cases")}
        </p>
      </section>

      <section
        id="materials"
        className="mt-12 scroll-mt-28 border-l-2 border-opseu-blue/30 pl-5"
        aria-labelledby="materials-heading"
      >
        <h2
          id="materials-heading"
          className="text-xl font-bold text-opseu-dark md:text-2xl"
        >
          {t("materials.title")}
        </h2>
        <p className="mt-3 max-w-prose leading-relaxed text-gray-700">
          {t("materials.intro")}
        </p>
        <ol className="mt-6 space-y-8">
          {materialSteps.map((key, i) => (
            <li key={key}>
              <div className="flex items-baseline gap-3">
                <span
                  className="text-sm font-bold tabular-nums text-opseu-blue"
                  aria-hidden="true"
                >
                  {String(i + 1).padStart(2, "0")}
                </span>
                <h3 className="text-lg font-bold text-opseu-dark">
                  {t(`materials.steps.${key}.title`)}
                </h3>
              </div>
              <p className="mt-3 max-w-prose leading-relaxed text-gray-700">
                {t(`materials.steps.${key}.body`)}
              </p>
              {key === "brandKit" ? (
                <div className="mt-4">
                  <Link href="/brand-kit">
                    <Button>{t("materials.steps.brandKit.cta")}</Button>
                  </Link>
                </div>
              ) : null}
              {key === "printMaterials" ? (
                <nav
                  className="mt-4 flex flex-wrap gap-3"
                  aria-label={t("materials.steps.printMaterials.title")}
                >
                  <Link href="/tools/qr-board?preset=membershipFtPt">
                    <Button variant="outline">
                      {t("materials.steps.printMaterials.qrBoard")}
                    </Button>
                  </Link>
                  <Link href="/tools/qr-card?preset=joinUnion">
                    <Button variant="outline">
                      {t("materials.steps.printMaterials.qrCard")}
                    </Button>
                  </Link>
                  <Link href="/tools/solidarity-poster">
                    <Button variant="outline">
                      {t("materials.steps.printMaterials.poster")}
                    </Button>
                  </Link>
                </nav>
              ) : null}
              {key === "welcome" ? (
                <div className="mt-4">
                  <Link href="/tools/document-generator?preset=welcome-letter">
                    <Button variant="outline">
                      {t("materials.steps.welcome.cta")}
                    </Button>
                  </Link>
                </div>
              ) : null}
            </li>
          ))}
        </ol>
      </section>

      <section
        id="onboarding"
        className="mt-12 scroll-mt-28 border-l-2 border-opseu-blue/30 pl-5"
        aria-labelledby="onboarding-heading"
      >
        <h2
          id="onboarding-heading"
          className="text-xl font-bold text-opseu-dark md:text-2xl"
        >
          {t("onboarding.title")}
        </h2>
        <p className="mt-3 max-w-prose leading-relaxed text-gray-700">
          {t("onboarding.intro")}
        </p>
        <ul className="mt-4 list-disc space-y-3 pl-5 text-gray-700">
          {onboardingItemKeys.map((key) => (
            <TipItem
              key={key}
              label={t(`onboarding.items.${key}.label`)}
              content={t(`onboarding.items.${key}.content`)}
            />
          ))}
        </ul>
        <div className="mt-5 flex flex-wrap gap-3">
          <Link href="/tools/document-generator?preset=welcome-letter">
            <Button variant="outline">{t("materials.steps.welcome.cta")}</Button>
          </Link>
          <Link href="/guide/email-broadcast">
            <Button variant="outline">{nav("emailBroadcastGuide")}</Button>
          </Link>
        </div>
      </section>

      <section
        id="checklist"
        className="mt-12 scroll-mt-28 border-l-2 border-opseu-blue/30 pl-5"
        aria-labelledby="checklist-heading"
      >
        <h2
          id="checklist-heading"
          className="text-xl font-bold text-opseu-dark md:text-2xl"
        >
          {t("checklist.title")}
        </h2>
        <p className="mt-3 max-w-prose leading-relaxed text-gray-700">
          {t("checklist.intro")}
        </p>
        <ul className="mt-4 list-disc space-y-2 pl-5 text-gray-700">
          {checklistItemKeys.map((key) => (
            <li key={key} className="max-w-prose leading-relaxed">
              {t(`checklist.items.${key}`)}
            </li>
          ))}
        </ul>
      </section>

      <div className="button-row mt-10 max-w-2xl">
        <Link href="/brand-kit">
          <Button>{nav("brandKit")}</Button>
        </Link>
        <Link href="/tools/qr-board?preset=membershipFtPt">
          <Button variant="outline">{nav("qrBoard")}</Button>
        </Link>
        <Link href="/tools/qr-card?preset=joinUnion">
          <Button variant="outline">{nav("qrCard")}</Button>
        </Link>
        <Link href="/tools/document-generator?preset=welcome-letter">
          <Button variant="outline">{nav("documentGenerator")}</Button>
        </Link>
      </div>
    </GuideLayout>
  );
}

function TipItem({ label, content }: { label: string; content: string }) {
  return (
    <li className="max-w-prose leading-relaxed">
      <span className="font-semibold text-opseu-dark">{label}.</span> {content}
    </li>
  );
}
