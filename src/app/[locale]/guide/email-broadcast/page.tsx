import type { Metadata } from "next";
import { buildPublicPageMetadata } from "@/lib/seo/public-page-meta";
import { setRequestLocale, getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { Callout } from "@/components/ui/Callout";
import { SourcesBlock } from "@/components/comms/SourcesBlock";
import { GuideLayout } from "@/components/comms/GuideLayout";
import { GuideToolAside } from "@/components/comms/GuideToolAside";
import { guideTocItems } from "@/lib/comms/guide-toc-items";
import { guideCtaOutlineClass } from "@/components/comms/guideCtaClasses";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  return buildPublicPageMetadata("/guide/email-broadcast", params);
}

const TOC = [
  ["when", "when"],
  ["anatomy", "anatomy"],
  ["protect", "protect"],
  ["toolkit", "toolkit"],
  ["checklist", "checklist"],
] as const;

const whenItemKeys = ["meeting", "rsvp", "vote", "bargaining"] as const;
const anatomyItemKeys = ["subject", "facts", "ask", "local"] as const;
const checklistItemKeys = [
  "subject",
  "facts",
  "ask",
  "local",
  "bcc",
  "personal",
  "rsvp",
  "cases",
] as const;

export default async function EmailBroadcastGuidePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("emailBroadcastGuide");
  const nav = await getTranslations("nav");
  const tg = await getTranslations("guideCommon");
  const ts = await getTranslations("sources");

  const tocItems = guideTocItems(TOC, (key) => t(`${key}.navLabel`));

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
            { href: "/tools/document-generator", label: nav("documentGenerator") },
            {
              href: "/tools/board-notice",
              label: nav("boardNotice"),
              variant: "outline",
            },
            {
              href: "/tools/flyer-maker",
              label: nav("flyerMaker"),
              variant: "outline",
            },
          ]}
        />
      }
      relatedLabel={t("relatedLabel")}
      relatedLinks={[
        { href: "/guide/print", label: nav("printGuide") },
        { href: "/guide/website", label: nav("websiteGuide") },
        { href: "/guide/social-media-plan", label: nav("socialMediaPlan") },
        { href: "/tools/document-generator", label: nav("documentGenerator") },
        { href: "/tools/flyer-maker", label: nav("flyerMaker") },
        { href: "/guide/crisis", label: nav("strikeGuide") },
      ]}
      footer={
        <SourcesBlock
          pageId="emailBroadcast"
          title={ts("title")}
          intro={ts("intro")}
        />
      }
    >
      <section
        id="when"
        className="scroll-mt-28 border-l-2 border-opseu-blue/30 pl-5"
        aria-labelledby="when-heading"
      >
        <h2
          id="when-heading"
          className="text-xl font-bold text-opseu-dark md:text-2xl"
        >
          {t("when.title")}
        </h2>
        <p className="mt-3 max-w-prose leading-relaxed text-gray-700">
          {t("when.intro")}
        </p>
        <ul className="mt-4 list-disc space-y-3 pl-5 text-gray-700">
          {whenItemKeys.map((key) => (
            <TipItem
              key={key}
              label={t(`when.items.${key}.label`)}
              content={t(`when.items.${key}.content`)}
            />
          ))}
        </ul>
        <Callout className="mt-5 max-w-prose">
          <p className="font-semibold text-opseu-dark">{t("tipLabel")}</p>
          <p className="mt-1">{t("when.tip")}</p>
        </Callout>
      </section>

      <section
        id="anatomy"
        className="mt-12 scroll-mt-28 border-l-2 border-opseu-blue/30 pl-5"
        aria-labelledby="anatomy-heading"
      >
        <h2
          id="anatomy-heading"
          className="text-xl font-bold text-opseu-dark md:text-2xl"
        >
          {t("anatomy.title")}
        </h2>
        <p className="mt-3 max-w-prose leading-relaxed text-gray-700">
          {t("anatomy.intro")}
        </p>
        <ul className="mt-4 list-disc space-y-3 pl-5 text-gray-700">
          {anatomyItemKeys.map((key) => (
            <TipItem
              key={key}
              label={t(`anatomy.items.${key}.label`)}
              content={t(`anatomy.items.${key}.content`)}
            />
          ))}
        </ul>
      </section>

      <section
        id="protect"
        className="mt-12 scroll-mt-28 border-l-2 border-opseu-blue/30 pl-5"
        aria-labelledby="protect-heading"
      >
        <h2
          id="protect-heading"
          className="text-xl font-bold text-opseu-dark md:text-2xl"
        >
          {t("protect.title")}
        </h2>
        <p className="mt-3 max-w-prose leading-relaxed text-gray-700">
          {t("protect.intro")}
        </p>
        <Callout tone="warning" className="mt-5 max-w-prose">
          <p className="font-semibold text-amber-950">{t("protect.bccTitle")}</p>
          <p className="mt-1">{t("protect.bccBody")}</p>
        </Callout>
        <Callout tone="warning" className="mt-4 max-w-prose">
          <p className="font-semibold text-amber-950">
            {t("protect.employerTitle")}
          </p>
          <p className="mt-1">{t("protect.employerBody")}</p>
        </Callout>
        <p className="mt-5 max-w-prose leading-relaxed text-gray-700">
          {t("protect.cases")}
        </p>
      </section>

      <section
        id="toolkit"
        className="mt-12 scroll-mt-28 border-l-2 border-opseu-blue/30 pl-5"
        aria-labelledby="toolkit-heading"
      >
        <h2
          id="toolkit-heading"
          className="text-xl font-bold text-opseu-dark md:text-2xl"
        >
          {t("toolkit.title")}
        </h2>
        <p className="mt-3 max-w-prose leading-relaxed text-gray-700">
          {t("toolkit.intro")}
        </p>
        <p className="mt-3 max-w-prose leading-relaxed text-gray-700">
          {t("toolkit.tools")}
        </p>
        <Callout className="mt-5 max-w-prose">
          <p className="font-semibold text-opseu-dark">
            {t("toolkit.privacyTitle")}
          </p>
          <p className="mt-1">{t("toolkit.privacyBody")}</p>
        </Callout>
        <Callout tone="muted" className="mt-4 max-w-prose">
          <p className="font-semibold text-opseu-dark">{t("toolkit.hubTitle")}</p>
          <p className="mt-1">{t("toolkit.hubBody")}</p>
        </Callout>
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
        <Link href="/tools/document-generator" className={guideCtaOutlineClass}>
          {nav("documentGenerator")}
        </Link>
        <Link href="/tools/board-notice" className={guideCtaOutlineClass}>
          {nav("boardNotice")}
        </Link>
        <Link href="/tools/flyer-maker" className={guideCtaOutlineClass}>
          {nav("flyerMaker")}
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
