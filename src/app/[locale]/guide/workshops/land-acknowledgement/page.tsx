import type { Metadata } from "next";
import type { ReactNode } from "react";
import { buildPublicPageMetadata } from "@/lib/seo/public-page-meta";
import { setRequestLocale, getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { GuideLayout } from "@/components/comms/GuideLayout";
import { guideTocItems } from "@/lib/comms/guide-toc-items";
import { LandAcknowledgementWorksheetButton } from "@/components/comms/LandAcknowledgementWorksheetButton";
import {
  guideCtaClassSm,
  guideCtaOutlineClassSm,
} from "@/components/comms/guideCtaClasses";
import { cn } from "@/lib/utils";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  return buildPublicPageMetadata(
    "/guide/workshops/land-acknowledgement",
    params,
  );
}

const PREP_KEYS = ["who", "materials", "room", "followUp"] as const;
const OUTLINE_KEYS = ["open", "research", "draft", "close"] as const;
const OUTLINE_TOC = [
  ["outline-open", "open"],
  ["outline-research", "research"],
  ["outline-draft", "draft"],
  ["outline-close", "close"],
] as const;
const WRAP_KEYS = ["adopt", "reader", "action", "guide"] as const;

export default async function LandAckWorkshopPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("landAckWorkshopGuide");
  const nav = await getTranslations("nav");

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
        { href: "/guide/land-acknowledgement", label: nav("landAcknowledgementGuide") },
        { href: "/guide/running-meetings", label: nav("runningMeetingsGuide") },
        { href: "/guide/workshops", label: nav("workshopsHub") },
        { href: "/guide/workshop", label: nav("workshopGuide") },
      ]}
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
        aria-labelledby="land-ack-workshop-prereq-heading"
      >
        <h2
          id="land-ack-workshop-prereq-heading"
          className="text-xl font-bold text-opseu-dark md:text-2xl"
        >
          {t("prereqTitle")}
        </h2>
        <p className="mt-2 max-w-prose leading-relaxed text-gray-700">
          {t("prereqIntro")}
        </p>
        <ul className="mt-4 list-disc space-y-3 pl-5 text-gray-700">
          {PREP_KEYS.map((key) => (
            <li key={key} className="max-w-prose leading-relaxed">
              <span className="font-semibold text-opseu-dark">
                {t(`prereq.${key}.label`)}
              </span>
              {" — "}
              {t(`prereq.${key}.content`)}
            </li>
          ))}
        </ul>
      </section>

      <section
        className="mt-10 scroll-mt-28"
        aria-labelledby="land-ack-workshop-outline-heading"
      >
        <h2
          id="land-ack-workshop-outline-heading"
          className="text-xl font-bold text-opseu-dark md:text-2xl"
        >
          {t("outlineTitle")}
        </h2>
        <p className="mt-2 max-w-prose leading-relaxed text-gray-700">
          {t("outlineIntro")}
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
                {t(`outlineItems.${key}.do`)}
              </WorkshopNote>
              <WorkshopNote
                className="mt-3"
                tone="facilitator"
                label={t("audienceFacilitatorLabel")}
              >
                {t(`outlineItems.${key}.facilitator`)}
              </WorkshopNote>
            </li>
          ))}
        </ol>
      </section>

      <section
        className="mt-10 scroll-mt-28"
        aria-labelledby="land-ack-workshop-handout-heading"
      >
        <h2
          id="land-ack-workshop-handout-heading"
          className="text-xl font-bold text-opseu-dark md:text-2xl"
        >
          {t("handoutTitle")}
        </h2>
        <p className="mt-2 max-w-prose leading-relaxed text-gray-700">
          {t("handoutIntro")}
        </p>
        <LandAcknowledgementWorksheetButton className="mt-4" />
      </section>

      <section
        className="mt-10 scroll-mt-28"
        aria-labelledby="land-ack-workshop-wrap-heading"
      >
        <h2
          id="land-ack-workshop-wrap-heading"
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
              {t(`wrap.${key}`)}
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
        <Link href="/guide/land-acknowledgement" className={guideCtaClassSm}>
          {t("guideCta")}
        </Link>
        <Link href="/guide/workshops" className={guideCtaOutlineClassSm}>
          {t("hubCta")}
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
