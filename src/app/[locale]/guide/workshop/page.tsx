import type { Metadata } from "next";
import type { ReactNode } from "react";
import { buildPublicPageMetadata } from "@/lib/seo/public-page-meta";
import { setRequestLocale, getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { GuideLayout } from "@/components/comms/GuideLayout";
import { guideTocItems } from "@/lib/comms/guide-toc-items";
import { SourcesBlock } from "@/components/comms/SourcesBlock";
import { WorkshopDemoPath } from "@/components/comms/WorkshopDemoPath";
import {
  guideCtaClassSm,
  guideCtaGhostClassSm,
  guideCtaOutlineClassSm,
} from "@/components/comms/guideCtaClasses";
import { cn } from "@/lib/utils";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  return buildPublicPageMetadata("/guide/workshop", params);
}

const PREREQ_KEYS = ["device", "logo", "colours", "number", "prompt"] as const;
const OUTLINE_KEYS = ["strategy", "identity", "inspiration", "media", "close"] as const;
const OUTLINE_TOC = [
  ["outline-strategy", "strategy"],
  ["outline-identity", "identity"],
  ["outline-inspiration", "inspiration"],
  ["outline-media", "media"],
  ["outline-close", "close"],
] as const;
const WRAP_KEYS = ["bookmark", "logo", "post", "website", "checklist"] as const;

const richMarks = {
  strong: (chunks: ReactNode) => (
    <strong className="font-semibold text-opseu-dark">{chunks}</strong>
  ),
};

export default async function WorkshopGuidePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("workshopGuide");
  const ts = await getTranslations("sources");

  const tocItems = guideTocItems(OUTLINE_TOC, (key) =>
    t(`outlineItems.${key}.navLabel`),
  );

  return (
    <GuideLayout
      title={t("title")}
      subtitle={t("subtitle")}
      intro={t("intro")}
      preset="playbook"
      toc={tocItems}
      tocLabel={t("outlineNavLabel")}
      relatedLabel={t("relatedLabel")}
      relatedLinks={[
        { href: "/guide/resources", label: t("resourcesCta") },
        { href: "/guide/social-media-plan", label: t("roadmapCta") },
        { href: "/tools", label: t("toolsCta") },
      ]}
      footer={
        <SourcesBlock pageId="workshop" title={ts("title")} intro={ts("intro")} />
      }
    >
      <div className="grid gap-3 sm:grid-cols-2">
        <WorkshopNote tone="facilitator" label={t("audienceFacilitatorLabel")}>
          {t("audienceFacilitator")}
        </WorkshopNote>
        <WorkshopNote tone="attendee" label={t("audienceAttendeeLabel")}>
          {t("audienceAttendee")}
        </WorkshopNote>
      </div>

      <section
        className="mt-10 scroll-mt-28"
        aria-labelledby="workshop-prereq-heading"
      >
        <h2
          id="workshop-prereq-heading"
          className="text-xl font-bold text-opseu-dark md:text-2xl"
        >
          {t("prereqTitle")}
        </h2>
        <p className="mt-2 max-w-prose leading-relaxed text-gray-700">
          {t("prereqIntro")}
        </p>
        <ul className="mt-4 list-disc space-y-2 pl-5 text-gray-700">
          {PREREQ_KEYS.map((key) => (
            <li key={key} className="max-w-prose leading-relaxed">
              {t.rich(`prereq.${key}`, richMarks)}
            </li>
          ))}
        </ul>
      </section>

      <section
        className="mt-10 scroll-mt-28 rounded-2xl border-2 border-opseu-blue/40 bg-opseu-blue/5 p-5 sm:p-6"
        aria-label={t("demoKicker")}
      >
        <p className="text-xs font-bold uppercase tracking-wide text-opseu-blue">
          {t("demoKicker")}
        </p>
        <p className="mt-1 max-w-prose text-sm leading-relaxed text-gray-700">
          {t("demoLead")}
        </p>
        <div className="mt-4 rounded-xl border border-opseu-blue/20 bg-white p-4 sm:p-5">
          <WorkshopDemoPath showRoadmapLink />
        </div>
        <p className="mt-4 max-w-prose text-sm leading-relaxed text-gray-700">
          {t("demoNote")}
        </p>
      </section>

      <section
        className="mt-10 scroll-mt-28"
        aria-labelledby="workshop-outline-heading"
      >
        <h2
          id="workshop-outline-heading"
          className="text-xl font-bold text-opseu-dark md:text-2xl"
        >
          {t("outlineTitle")}
        </h2>
        <p className="mt-2 max-w-prose leading-relaxed text-gray-700">
          {t.rich("outlineIntro", richMarks)}
        </p>
        <ol className="mt-8 space-y-8">
          {OUTLINE_KEYS.map((key, index) => (
            <li
              key={key}
              id={`outline-${key}`}
              className="scroll-mt-28 border-l-2 border-opseu-blue/30 pl-5"
            >
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <h3 className="text-lg font-bold text-opseu-dark md:text-xl">
                  <span className="mr-2 font-bold tabular-nums text-opseu-blue">
                    {index + 1}.
                  </span>
                  {t(`outlineItems.${key}.title`)}
                </h3>
                <span className="inline-flex min-h-8 items-center rounded-full bg-opseu-blue px-3 text-xs font-bold uppercase tracking-wide text-white">
                  {t(`outlineItems.${key}.time`)}
                </span>
              </div>
              <WorkshopNote
                className="mt-3"
                tone="attendee"
                label={t("audienceAttendeeLabel")}
              >
                {t.rich(`outlineItems.${key}.do`, richMarks)}
              </WorkshopNote>
              <WorkshopNote
                className="mt-3"
                tone="facilitator"
                label={t("audienceFacilitatorLabel")}
              >
                {t.rich(`outlineItems.${key}.facilitator`, richMarks)}
              </WorkshopNote>
            </li>
          ))}
        </ol>
      </section>

      <section
        className="mt-10 scroll-mt-28"
        aria-labelledby="workshop-wrap-heading"
      >
        <h2
          id="workshop-wrap-heading"
          className="text-xl font-bold text-opseu-dark md:text-2xl"
        >
          {t("wrapTitle")}
        </h2>
        <p className="mt-2 max-w-prose leading-relaxed text-gray-700">
          {t("wrapIntro")}
        </p>
        <ol className="mt-4 list-decimal space-y-3 pl-5 text-gray-700">
          {WRAP_KEYS.map((key) => (
            <li key={key} className="max-w-prose leading-relaxed">
              {t.rich(`wrap.${key}`, richMarks)}
            </li>
          ))}
        </ol>
        <WorkshopNote
          className="mt-4"
          tone="facilitator"
          label={t("audienceFacilitatorLabel")}
        >
          {t("wrapFacilitator")}
        </WorkshopNote>
      </section>

      <div className="button-row mt-10 max-w-xl">
        <Link href="/guide/resources" className={guideCtaClassSm}>
          {t("resourcesCta")}
        </Link>
        <Link href="/guide/social-media-plan" className={guideCtaOutlineClassSm}>
          {t("roadmapCta")}
        </Link>
        <Link href="/tools" className={guideCtaGhostClassSm}>
          {t("toolsCta")}
        </Link>
      </div>
    </GuideLayout>
  );
}

function WorkshopNote({
  tone,
  label,
  children,
  className,
}: {
  tone: "facilitator" | "attendee";
  label: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <blockquote
      className={cn(
        "rounded-r-lg border-l-4 px-4 py-3",
        tone === "facilitator"
          ? "border-amber-500 bg-amber-50 text-amber-950"
          : "border-opseu-blue bg-white text-gray-800 shadow-sm",
        className,
      )}
    >
      <p className="text-xs font-bold uppercase tracking-wide">{label}</p>
      <p className="mt-1 max-w-prose text-sm leading-relaxed">{children}</p>
    </blockquote>
  );
}
