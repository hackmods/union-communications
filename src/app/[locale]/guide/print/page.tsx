import type { Metadata } from "next";
import { buildPublicPageMetadata } from "@/lib/seo/public-page-meta";
import { setRequestLocale, getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { Callout } from "@/components/ui/Callout";
import { SourcesBlock } from "@/components/comms/SourcesBlock";
import { GuideLayout } from "@/components/comms/GuideLayout";
import { GuideToolAside } from "@/components/comms/GuideToolAside";
import { guideTocItems } from "@/lib/comms/guide-toc-items";
import {
  guideCtaClass,
  guideCtaOutlineClass,
} from "@/components/comms/guideCtaClasses";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  return buildPublicPageMetadata("/guide/print", params);
}

const TOC = [
  ["when", "when"],
  ["flyers", "flyers"],
  ["boards", "boards"],
  ["logistics", "logistics"],
  ["digital", "digital"],
] as const;

const whenItemKeys = ["divide", "offline", "presence"] as const;
const flyerItemKeys = ["glance", "words", "action", "qr", "type"] as const;
const boardItemKeys = ["place", "expired", "agreement"] as const;
const logisticsItemKeys = ["bw", "contrast", "union", "proof"] as const;
const digitalItemKeys = ["facts", "order", "qr"] as const;

export default async function PrintGuidePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("printGuide");
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
            { href: "/tools/flyer-maker", label: nav("flyerMaker") },
            {
              href: "/tools/board-notice",
              label: nav("boardNotice"),
              variant: "outline",
            },
            {
              href: "/tools/solidarity-poster",
              label: nav("solidarityPoster"),
              variant: "outline",
            },
          ]}
        />
      }
      relatedLabel={t("relatedLabel")}
      relatedLinks={[
        { href: "/guide/social-media-plan", label: nav("socialMediaPlan") },
        { href: "/guide/email-broadcast", label: nav("emailBroadcastGuide") },
        { href: "/guide/union-boards", label: nav("unionBoardsGuide") },
      ]}
      footer={
        <SourcesBlock pageId="print" title={ts("title")} intro={ts("intro")} />
      }
    >
      <section
        id="when"
        className="scroll-mt-28 border-l-2 border-opseu-blue/30 pl-5"
        aria-labelledby="when-heading"
      >
        <h2 id="when-heading" className="text-xl font-bold text-opseu-dark md:text-2xl">
          {t("when.title")}
        </h2>
        <p className="mt-1 text-sm font-semibold uppercase tracking-wide text-opseu-blue">
          {t("when.whyTitle")}
        </p>
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
        id="flyers"
        className="mt-12 scroll-mt-28 border-l-2 border-opseu-blue/30 pl-5"
        aria-labelledby="flyers-heading"
      >
        <h2 id="flyers-heading" className="text-xl font-bold text-opseu-dark md:text-2xl">
          {t("flyers.title")}
        </h2>
        <p className="mt-3 max-w-prose leading-relaxed text-gray-700">
          {t("flyers.intro")}
        </p>
        <h3 className="mt-6 text-lg font-bold text-opseu-dark">
          {t("flyers.practicesTitle")}
        </h3>
        <ul className="mt-3 list-disc space-y-3 pl-5 text-gray-700">
          {flyerItemKeys.map((key) => (
            <TipItem
              key={key}
              label={t(`flyers.items.${key}.label`)}
              content={t(`flyers.items.${key}.content`)}
            />
          ))}
        </ul>
        <Callout className="mt-5 max-w-prose">
          <p className="font-semibold text-opseu-dark">{t("tipLabel")}</p>
          <p className="mt-1">{t("flyers.tip")}</p>
        </Callout>
        <div className="button-row mt-5 max-w-lg">
          <Link href="/tools/flyer-maker" className={guideCtaClass}>
            {nav("flyerMaker")}
          </Link>
          <Link href="/tools/qr-card" className={guideCtaOutlineClass}>
            {nav("qrCard")}
          </Link>
        </div>
      </section>

      <section
        id="boards"
        className="mt-12 scroll-mt-28 border-l-2 border-opseu-blue/30 pl-5"
        aria-labelledby="boards-heading"
      >
        <h2 id="boards-heading" className="text-xl font-bold text-opseu-dark md:text-2xl">
          {t("boards.title")}
        </h2>
        <p className="mt-3 max-w-prose leading-relaxed text-gray-700">
          {t("boards.intro")}
        </p>
        <h3 className="mt-6 text-lg font-bold text-opseu-dark">
          {t("boards.realitiesTitle")}
        </h3>
        <ul className="mt-3 list-disc space-y-3 pl-5 text-gray-700">
          {boardItemKeys.map((key) => (
            <TipItem
              key={key}
              label={t(`boards.items.${key}.label`)}
              content={t(`boards.items.${key}.content`)}
            />
          ))}
        </ul>
        <Callout tone="warning" className="mt-5 max-w-prose">
          <p className="font-semibold text-amber-950">{t("boards.warningTitle")}</p>
          <p className="mt-1">{t("boards.warning")}</p>
        </Callout>
        <div className="button-row mt-5 max-w-lg">
          <Link href="/tools/board-notice" className={guideCtaClass}>
            {nav("boardNotice")}
          </Link>
          <Link href="/guide/union-boards" className={guideCtaOutlineClass}>
            {nav("unionBoardsGuide")}
          </Link>
        </div>
      </section>

      <section
        id="logistics"
        className="mt-12 scroll-mt-28 border-l-2 border-opseu-blue/30 pl-5"
        aria-labelledby="logistics-heading"
      >
        <h2
          id="logistics-heading"
          className="text-xl font-bold text-opseu-dark md:text-2xl"
        >
          {t("logistics.title")}
        </h2>
        <p className="mt-3 max-w-prose leading-relaxed text-gray-700">
          {t("logistics.intro")}
        </p>
        <ul className="mt-4 list-disc space-y-3 pl-5 text-gray-700">
          {logisticsItemKeys.map((key) => (
            <TipItem
              key={key}
              label={t(`logistics.items.${key}.label`)}
              content={t(`logistics.items.${key}.content`)}
            />
          ))}
        </ul>
        <Callout tone="muted" className="mt-5 max-w-prose">
          <p className="font-semibold text-opseu-dark">{t("tipLabel")}</p>
          <p className="mt-1">{t("logistics.tip")}</p>
        </Callout>
      </section>

      <section
        id="digital"
        className="mt-12 scroll-mt-28 border-l-2 border-opseu-blue/30 pl-5"
        aria-labelledby="digital-heading"
      >
        <h2 id="digital-heading" className="text-xl font-bold text-opseu-dark md:text-2xl">
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
          <p className="font-semibold text-opseu-dark">{t("tipLabel")}</p>
          <p className="mt-1">{t("digital.tip")}</p>
        </Callout>
      </section>

      <div className="button-row mt-10 max-w-2xl">
        <Link href="/tools/flyer-maker" className={guideCtaOutlineClass}>
          {nav("flyerMaker")}
        </Link>
        <Link href="/tools/board-notice" className={guideCtaOutlineClass}>
          {nav("boardNotice")}
        </Link>
        <Link href="/tools/qr-card" className={guideCtaOutlineClass}>
          {nav("qrCard")}
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
