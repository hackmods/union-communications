import type { Metadata } from "next";
import type { ReactNode } from "react";
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
import { COMMS_SOURCES } from "@/lib/constants/comms-sources";
import { cn } from "@/lib/utils";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  return buildPublicPageMetadata("/guide/website", params);
}

const whyItemKeys = ["stable", "search", "control"] as const;
const bareMinimumKeys = ["about", "officers", "contact", "social"] as const;
const includeKeys = ["always", "whenActive", "optional", "skip"] as const;
const beforeKeys = ["brand", "email", "officers", "facebook"] as const;
const buildKeys = ["open", "fill", "preview", "download"] as const;
const deployKeys = ["account", "repo", "upload", "pages", "wait"] as const;
const domainKeys = ["cname", "dns", "enable"] as const;
const maintainKeys = ["who", "when", "how", "archive"] as const;
const pairKeys = ["boards", "qr", "social", "brand"] as const;
const termKeys = ["repository", "commit", "deploy"] as const;

const TOC = [
  ["why", "why"],
  ["bare-minimum", "bareMinimum"],
  ["before", "before"],
  ["build", "build"],
  ["deploy", "deploy"],
  ["domain", "domain"],
  ["maintain", "maintain"],
] as const;

const includeTone: Record<(typeof includeKeys)[number], string> = {
  always: "border-green-200 bg-green-50",
  whenActive: "border-opseu-blue/20 bg-opseu-blue/5",
  optional: "border-gray-200 bg-gray-50",
  skip: "border-amber-200 bg-amber-50",
};

const githubPages = COMMS_SOURCES["github-pages"];
const githubDomain = COMMS_SOURCES["github-pages-custom-domain"];

export default async function WebsiteGuidePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("websiteGuide");
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
            { href: "/tools/website-template", label: t("related.template") },
            {
              href: "/tools/qr-card",
              label: t("related.qr"),
              variant: "outline",
            },
            {
              href: "/tools/org-chart",
              label: t("related.orgChart"),
              variant: "outline",
            },
          ]}
        />
      }
      relatedLabel={t("relatedLabel")}
      relatedLinks={[
        { href: "/tools/website-template", label: t("related.template") },
        { href: "/tools/org-chart", label: t("related.orgChart") },
        { href: "/brand-kit", label: t("related.brandKit") },
        { href: "/guide/social-media-plan", label: t("related.plan") },
        { href: "/guide/email-broadcast", label: nav("emailBroadcastGuide") },
        { href: "/tools/qr-card", label: t("related.qr") },
      ]}
      footer={
        <SourcesBlock pageId="website" title={ts("title")} intro={ts("intro")} />
      }
    >
      <section
        id="at-a-glance"
        className="scroll-mt-28"
        aria-labelledby="glance-heading"
      >
        <h2 id="glance-heading" className="text-2xl font-bold text-opseu-dark">
          {t("glance.title")}
        </h2>
        <p className="mt-2 max-w-prose leading-relaxed text-gray-700">
          {t("glance.intro")}
        </p>
        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          <GlanceCard
            href="#part-1"
            kicker={t("glance.part1.kicker")}
            title={t("glance.part1.title")}
            body={t("glance.part1.body")}
            cta={t("glance.part1.cta")}
          />
          <GlanceCard
            href="#part-2"
            kicker={t("glance.part2.kicker")}
            title={t("glance.part2.title")}
            body={t("glance.part2.body")}
            cta={t("glance.part2.cta")}
          />
        </div>
        <div className="button-row mt-5 max-w-lg">
          <Link href="/tools/website-template" className={guideCtaClass}>
            {t("glance.templateCta")}
          </Link>
        </div>
      </section>

      <PartFrame
        id="part-1"
        kicker={t("part1.kicker")}
        title={t("part1.title")}
        intro={t("part1.intro")}
        className="mt-12"
      >
        <section
          id="why"
          className="mt-10 scroll-mt-28"
          aria-labelledby="why-heading"
        >
          <h3 id="why-heading" className="text-xl font-bold text-opseu-dark">
            {t("why.title")}
          </h3>
          <p className="mt-2 max-w-prose leading-relaxed text-gray-700">
            {t("why.intro")}
          </p>
          <ul className="mt-4 grid gap-3">
            {whyItemKeys.map((key) => (
              <li
                key={key}
                className="rounded-xl border border-gray-200 bg-white px-4 py-3"
              >
                <p className="font-semibold text-opseu-dark">
                  {t(`why.items.${key}.label`)}
                </p>
                <p className="mt-1 text-sm leading-relaxed text-gray-700">
                  {t(`why.items.${key}.content`)}
                </p>
              </li>
            ))}
          </ul>
          <Callout tone="muted" className="mt-4">
            {t("why.tip")}
          </Callout>
        </section>

        <section
          id="bare-minimum"
          className="mt-10 scroll-mt-28"
          aria-labelledby="bare-minimum-heading"
        >
          <h3
            id="bare-minimum-heading"
            className="text-xl font-bold text-opseu-dark"
          >
            {t("bareMinimum.title")}
          </h3>
          <p className="mt-2 max-w-prose leading-relaxed text-gray-700">
            {t("bareMinimum.intro")}
          </p>
          <StepList>
            {bareMinimumKeys.map((key, index) => (
              <StepItem
                key={key}
                index={index + 1}
                title={t(`bareMinimum.items.${key}.title`)}
              >
                {t(`bareMinimum.items.${key}.content`)}
              </StepItem>
            ))}
          </StepList>

          <h4 className="mt-8 text-lg font-bold text-opseu-dark">
            {t("include.title")}
          </h4>
          <p className="mt-2 max-w-prose text-sm leading-relaxed text-gray-700">
            {t("include.intro")}
          </p>
          <ul className="mt-4 grid gap-3 sm:grid-cols-2">
            {includeKeys.map((key) => (
              <li
                key={key}
                className={cn(
                  "rounded-xl border px-4 py-3",
                  includeTone[key],
                )}
              >
                <p className="font-semibold text-opseu-dark">
                  {t(`include.${key}.label`)}
                </p>
                <p className="mt-1 text-sm leading-relaxed text-gray-700">
                  {t(`include.${key}.content`)}
                </p>
              </li>
            ))}
          </ul>
        </section>

        <section
          id="before"
          className="mt-10 scroll-mt-28"
          aria-labelledby="before-heading"
        >
          <h3 id="before-heading" className="text-xl font-bold text-opseu-dark">
            {t("before.title")}
          </h3>
          <p className="mt-2 max-w-prose leading-relaxed text-gray-700">
            {t("before.intro")}
          </p>
          <ul className="mt-4 space-y-2">
            {beforeKeys.map((key) => (
              <li
                key={key}
                className="rounded-xl border border-gray-200 bg-white px-4 py-3 leading-relaxed text-gray-700"
              >
                {t(`before.items.${key}`)}
              </li>
            ))}
          </ul>
          <Callout className="mt-4">{t("before.tip")}</Callout>
        </section>

        <section
          id="build"
          className="mt-10 scroll-mt-28"
          aria-labelledby="build-heading"
        >
          <h3 id="build-heading" className="text-xl font-bold text-opseu-dark">
            {t("build.title")}
          </h3>
          <p className="mt-2 max-w-prose leading-relaxed text-gray-700">
            {t("build.intro")}
          </p>
          <StepList>
            {buildKeys.map((key, index) => (
              <StepItem
                key={key}
                index={index + 1}
                title={t(`build.steps.${key}.title`)}
              >
                {t(`build.steps.${key}.content`)}
              </StepItem>
            ))}
          </StepList>
          <Callout tone="success" className="mt-4">
            {t("build.done")}
          </Callout>
          <div className="button-row mt-6 max-w-lg">
            <Link href="/tools/website-template" className={guideCtaClass}>
              {t("build.cta")}
            </Link>
          </div>
        </section>
      </PartFrame>

      <PartFrame
        id="part-2"
        kicker={t("part2.kicker")}
        title={t("part2.title")}
        intro={t("part2.intro")}
        className="mt-12 bg-gray-50"
      >
        <Callout tone="warning" className="mt-5">
          <p className="font-semibold text-amber-950">{t("part2.handoffTitle")}</p>
          <p className="mt-1">{t("part2.handoff")}</p>
        </Callout>
        <Callout tone="muted" className="mt-4">
          <p className="font-semibold text-opseu-dark">{t("wordpress.title")}</p>
          <p className="mt-1">{t("wordpress.body")}</p>
        </Callout>
        <Callout tone="muted" className="mt-4">
          <p className="font-semibold text-opseu-dark">{t("squarespace.title")}</p>
          <p className="mt-1">{t("squarespace.body")}</p>
        </Callout>

        <section
          className="mt-8 rounded-xl border border-gray-200 bg-white px-4 py-4 sm:px-5"
          aria-labelledby="terms-heading"
        >
          <h3 id="terms-heading" className="text-base font-bold text-opseu-dark">
            {t("terms.title")}
          </h3>
          <dl className="mt-3 space-y-3">
            {termKeys.map((key) => (
              <div
                key={key}
                className="sm:grid sm:grid-cols-[8.75rem_1fr] sm:gap-4"
              >
                <dt className="font-semibold text-opseu-dark">
                  {t(`terms.${key}.term`)}
                </dt>
                <dd className="mt-0.5 text-sm leading-relaxed text-gray-700 sm:mt-0">
                  {t(`terms.${key}.meaning`)}
                </dd>
              </div>
            ))}
          </dl>
        </section>

        <section
          id="deploy"
          className="mt-10 scroll-mt-28"
          aria-labelledby="deploy-heading"
        >
          <h3 id="deploy-heading" className="text-xl font-bold text-opseu-dark">
            {t("deploy.title")}
          </h3>
          <p className="mt-2 max-w-prose leading-relaxed text-gray-700">
            {t("deploy.intro")}
          </p>
          <StepList>
            {deployKeys.map((key, index) => (
              <StepItem
                key={key}
                index={index + 1}
                title={t(`deploy.steps.${key}.title`)}
              >
                {t(`deploy.steps.${key}.content`)}
              </StepItem>
            ))}
          </StepList>
          <Callout tone="muted" className="mt-4">
            {t("deploy.tip")}
          </Callout>
          {githubPages ? (
            <p className="mt-4 text-sm text-gray-700">
              {t("deploy.docsLead")}{" "}
              <a
                href={githubPages.url}
                target="_blank"
                rel="noopener noreferrer"
                className="font-medium text-opseu-blue underline underline-offset-2"
              >
                {t("deploy.docsLabel")}
              </a>
            </p>
          ) : null}
        </section>

        <section
          id="domain"
          className="mt-10 scroll-mt-28 rounded-xl border border-amber-200 bg-amber-50/60 p-4 sm:p-5"
          aria-labelledby="domain-heading"
        >
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center rounded-md bg-amber-100 px-2 py-0.5 text-xs font-bold uppercase tracking-wide text-amber-950">
              {t("domain.badge")}
            </span>
          </div>
          <h3
            id="domain-heading"
            className="mt-3 text-xl font-bold text-opseu-dark"
          >
            {t("domain.title")}
          </h3>
          <p className="mt-2 max-w-prose leading-relaxed text-gray-700">
            {t("domain.intro")}
          </p>
          <StepList>
            {domainKeys.map((key, index) => (
              <StepItem
                key={key}
                index={index + 1}
                title={t(`domain.steps.${key}.title`)}
              >
                {t(`domain.steps.${key}.content`)}
              </StepItem>
            ))}
          </StepList>
          <Callout tone="muted" className="mt-4">
            {t("domain.tip")}
          </Callout>
          {githubDomain ? (
            <p className="mt-4 text-sm text-gray-700">
              {t("domain.docsLead")}{" "}
              <a
                href={githubDomain.url}
                target="_blank"
                rel="noopener noreferrer"
                className="font-medium text-opseu-blue underline underline-offset-2"
              >
                {t("domain.docsLabel")}
              </a>
            </p>
          ) : null}
        </section>

        <section
          id="maintain"
          className="mt-10 scroll-mt-28"
          aria-labelledby="maintain-heading"
        >
          <h3
            id="maintain-heading"
            className="text-xl font-bold text-opseu-dark"
          >
            {t("maintain.title")}
          </h3>
          <p className="mt-2 max-w-prose leading-relaxed text-gray-700">
            {t("maintain.intro")}
          </p>
          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            {maintainKeys.map((key) => (
              <section
                key={key}
                className="rounded-xl border border-gray-200 bg-white px-4 py-4"
              >
                <h4 className="font-bold text-opseu-dark">
                  {t(`maintain.items.${key}.title`)}
                </h4>
                <p className="mt-2 text-sm leading-relaxed text-gray-700">
                  {t(`maintain.items.${key}.content`)}
                </p>
              </section>
            ))}
          </div>
        </section>
      </PartFrame>

      <section
        id="pair"
        className="mt-12 scroll-mt-28"
        aria-labelledby="pair-heading"
      >
        <h2 id="pair-heading" className="text-2xl font-bold text-opseu-dark">
          {t("pair.title")}
        </h2>
        <p className="mt-2 max-w-prose leading-relaxed text-gray-700">
          {t("pair.intro")}
        </p>
        <ul className="mt-4 grid gap-3 sm:grid-cols-2">
          {pairKeys.map((key) => (
            <li
              key={key}
              className="rounded-xl border border-gray-200 bg-white px-4 py-4"
            >
              <p className="font-semibold text-opseu-dark">
                {t(`pair.items.${key}.label`)}
              </p>
              <p className="mt-1 text-sm leading-relaxed text-gray-700">
                {t(`pair.items.${key}.content`)}
              </p>
            </li>
          ))}
        </ul>
      </section>

      <div className="button-row mt-10 max-w-2xl">
        <Link href="/brand-kit" className={guideCtaOutlineClass}>
          {nav("brandKit")}
        </Link>
        <Link href="/tools/qr-card" className={guideCtaOutlineClass}>
          {nav("qrCard")}
        </Link>
        <Link href="/guide/social-media-plan" className={guideCtaOutlineClass}>
          {nav("firstWeek")}
        </Link>
      </div>
    </GuideLayout>
  );
}

function GlanceCard({
  href,
  kicker,
  title,
  body,
  cta,
}: {
  href: string;
  kicker: string;
  title: string;
  body: string;
  cta: string;
}) {
  return (
    <a
      href={href}
      className="flex flex-col rounded-xl border border-gray-200 bg-white px-4 py-4 transition-colors hover:border-opseu-blue/40 hover:bg-opseu-blue/5"
    >
      <span className="text-xs font-bold uppercase tracking-wide text-opseu-blue">
        {kicker}
      </span>
      <span className="mt-1 text-lg font-bold text-opseu-dark">{title}</span>
      <span className="mt-2 flex-1 text-sm leading-relaxed text-gray-700">
        {body}
      </span>
      <span className="mt-3 text-sm font-semibold text-opseu-blue">{cta}</span>
    </a>
  );
}

function PartFrame({
  id,
  kicker,
  title,
  intro,
  className,
  children,
}: {
  id: string;
  kicker: string;
  title: string;
  intro: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <section
      id={id}
      className={cn(
        "scroll-mt-28 rounded-2xl border border-gray-200 bg-white p-5 sm:p-6 md:p-8",
        className,
      )}
      aria-labelledby={`${id}-heading`}
    >
      <p className="text-xs font-bold uppercase tracking-wide text-opseu-blue">
        {kicker}
      </p>
      <h2 id={`${id}-heading`} className="mt-1 text-2xl font-bold text-opseu-dark">
        {title}
      </h2>
      <p className="mt-2 max-w-prose leading-relaxed text-gray-700">{intro}</p>
      {children}
    </section>
  );
}

function StepList({ children }: { children: ReactNode }) {
  return <ol className="mt-6 space-y-4">{children}</ol>;
}

function StepItem({
  index,
  title,
  children,
}: {
  index: number;
  title: string;
  children: ReactNode;
}) {
  return (
    <li className="flex gap-3 sm:gap-4">
      <span
        className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-opseu-blue text-xs font-bold text-white"
        aria-hidden="true"
      >
        {index}
      </span>
      <div className="min-w-0">
        <p className="font-semibold text-opseu-dark">{title}</p>
        <p className="mt-1 leading-relaxed text-gray-700">{children}</p>
      </div>
    </li>
  );
}
