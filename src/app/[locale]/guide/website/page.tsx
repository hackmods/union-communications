import { setRequestLocale, getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/Button";
import { Callout } from "@/components/ui/Callout";
import { SourcesBlock } from "@/components/comms/SourcesBlock";
import { GuideLayout } from "@/components/comms/GuideLayout";

const whyItemKeys = ["stable", "search", "control"] as const;
const bareMinimumKeys = [
  "about",
  "officers",
  "contact",
  "social",
] as const;
const includeKeys = ["always", "whenActive", "optional", "skip"] as const;
const beforeKeys = ["brand", "email", "officers", "facebook"] as const;
const buildKeys = ["open", "fill", "preview", "download"] as const;
const deployKeys = [
  "account",
  "repo",
  "upload",
  "pages",
  "wait",
] as const;
const domainKeys = ["cname", "dns", "enable"] as const;
const maintainKeys = ["who", "when", "how", "archive"] as const;
const pairKeys = ["boards", "qr", "social", "brand"] as const;

export default async function WebsiteGuidePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("websiteGuide");
  const nav = await getTranslations("nav");
  const ts = await getTranslations("sources");

  return (
    <GuideLayout
      title={t("title")}
      subtitle={t("subtitle")}
      intro={t("intro")}
      relatedLabel={t("relatedLabel")}
      relatedLinks={[
        { href: "/tools/website-template", label: t("related.template") },
        { href: "/brand-kit", label: t("related.brandKit") },
        { href: "/guide/social-media-plan", label: t("related.plan") },
        { href: "/tools/qr-card", label: t("related.qr") },
      ]}
      footer={
        <SourcesBlock pageId="website" title={ts("title")} intro={ts("intro")} />
      }
    >
      <nav
        className="mb-8 flex flex-wrap gap-2"
        aria-label={t("tocLabel")}
      >
        {(
          [
            ["why", "why"],
            ["bare-minimum", "bareMinimum"],
            ["before", "before"],
            ["build", "build"],
            ["deploy", "deploy"],
            ["domain", "domain"],
            ["maintain", "maintain"],
            ["pair", "pair"],
          ] as const
        ).map(([id, key]) => (
          <a
            key={id}
            href={`#${id}`}
            className="inline-flex items-center rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-sm font-medium text-opseu-dark transition-colors hover:border-opseu-blue/40 hover:bg-opseu-blue/5"
          >
            {t(`${key}.navLabel`)}
          </a>
        ))}
      </nav>

      <section id="why" className="scroll-mt-28" aria-labelledby="why-heading">
        <h2 id="why-heading" className="text-2xl font-bold text-opseu-dark">
          {t("why.title")}
        </h2>
        <p className="mt-2 max-w-prose leading-relaxed text-gray-700">
          {t("why.intro")}
        </p>
        <ul className="mt-4 list-disc space-y-3 pl-5 text-gray-700">
          {whyItemKeys.map((key) => (
            <li key={key}>
              <span className="font-semibold text-opseu-dark">
                {t(`why.items.${key}.label`)}:
              </span>{" "}
              {t(`why.items.${key}.content`)}
            </li>
          ))}
        </ul>
        <Callout tone="muted" className="mt-4">
          {t("why.tip")}
        </Callout>
      </section>

      <section
        id="bare-minimum"
        className="mt-12 scroll-mt-28"
        aria-labelledby="bare-minimum-heading"
      >
        <h2
          id="bare-minimum-heading"
          className="text-2xl font-bold text-opseu-dark"
        >
          {t("bareMinimum.title")}
        </h2>
        <p className="mt-2 max-w-prose leading-relaxed text-gray-700">
          {t("bareMinimum.intro")}
        </p>
        <ol className="mt-6 list-decimal space-y-4 pl-5 text-gray-700">
          {bareMinimumKeys.map((key) => (
            <li key={key}>
              <p className="font-semibold text-opseu-dark">
                {t(`bareMinimum.items.${key}.title`)}
              </p>
              <p className="mt-1 leading-relaxed">
                {t(`bareMinimum.items.${key}.content`)}
              </p>
            </li>
          ))}
        </ol>

        <h3 className="mt-8 text-lg font-bold text-opseu-dark">
          {t("include.title")}
        </h3>
        <p className="mt-2 max-w-prose text-sm leading-relaxed text-gray-700">
          {t("include.intro")}
        </p>
        <ul className="mt-4 list-disc space-y-2 pl-5 text-gray-700">
          {includeKeys.map((key) => (
            <li key={key}>
              <span className="font-semibold text-opseu-dark">
                {t(`include.${key}.label`)}:
              </span>{" "}
              {t(`include.${key}.content`)}
            </li>
          ))}
        </ul>
      </section>

      <section
        id="before"
        className="mt-12 scroll-mt-28"
        aria-labelledby="before-heading"
      >
        <h2 id="before-heading" className="text-2xl font-bold text-opseu-dark">
          {t("before.title")}
        </h2>
        <p className="mt-2 max-w-prose leading-relaxed text-gray-700">
          {t("before.intro")}
        </p>
        <ul className="mt-4 list-disc space-y-2 pl-5 text-gray-700">
          {beforeKeys.map((key) => (
            <li key={key}>{t(`before.items.${key}`)}</li>
          ))}
        </ul>
        <Callout className="mt-4">
          {t("before.tip")}
        </Callout>
      </section>

      <section
        id="build"
        className="mt-12 scroll-mt-28"
        aria-labelledby="build-heading"
      >
        <h2 id="build-heading" className="text-2xl font-bold text-opseu-dark">
          {t("build.title")}
        </h2>
        <p className="mt-2 max-w-prose leading-relaxed text-gray-700">
          {t("build.intro")}
        </p>
        <ol className="mt-6 list-decimal space-y-4 pl-5 text-gray-700">
          {buildKeys.map((key) => (
            <li key={key}>
              <p className="font-semibold text-opseu-dark">
                {t(`build.steps.${key}.title`)}
              </p>
              <p className="mt-1 leading-relaxed">
                {t(`build.steps.${key}.content`)}
              </p>
            </li>
          ))}
        </ol>
        <div className="button-row mt-6 max-w-lg">
          <Link href="/tools/website-template">
            <Button>{t("build.cta")}</Button>
          </Link>
        </div>
      </section>

      <section
        id="deploy"
        className="mt-12 scroll-mt-28"
        aria-labelledby="deploy-heading"
      >
        <h2 id="deploy-heading" className="text-2xl font-bold text-opseu-dark">
          {t("deploy.title")}
        </h2>
        <p className="mt-2 max-w-prose leading-relaxed text-gray-700">
          {t("deploy.intro")}
        </p>
        <ol className="mt-6 list-decimal space-y-4 pl-5 text-gray-700">
          {deployKeys.map((key) => (
            <li key={key}>
              <p className="font-semibold text-opseu-dark">
                {t(`deploy.steps.${key}.title`)}
              </p>
              <p className="mt-1 leading-relaxed">
                {t(`deploy.steps.${key}.content`)}
              </p>
            </li>
          ))}
        </ol>
        <Callout tone="muted" className="mt-4">
          {t("deploy.tip")}
        </Callout>
      </section>

      <section
        id="domain"
        className="mt-12 scroll-mt-28"
        aria-labelledby="domain-heading"
      >
        <h2 id="domain-heading" className="text-2xl font-bold text-opseu-dark">
          {t("domain.title")}
        </h2>
        <p className="mt-2 max-w-prose leading-relaxed text-gray-700">
          {t("domain.intro")}
        </p>
        <ol className="mt-6 list-decimal space-y-4 pl-5 text-gray-700">
          {domainKeys.map((key) => (
            <li key={key}>
              <p className="font-semibold text-opseu-dark">
                {t(`domain.steps.${key}.title`)}
              </p>
              <p className="mt-1 leading-relaxed">
                {t(`domain.steps.${key}.content`)}
              </p>
            </li>
          ))}
        </ol>
        <Callout tone="muted" className="mt-4">
          {t("domain.tip")}
        </Callout>
      </section>

      <section
        id="maintain"
        className="mt-12 scroll-mt-28"
        aria-labelledby="maintain-heading"
      >
        <h2 id="maintain-heading" className="text-2xl font-bold text-opseu-dark">
          {t("maintain.title")}
        </h2>
        <p className="mt-2 max-w-prose leading-relaxed text-gray-700">
          {t("maintain.intro")}
        </p>
        <div className="mt-6 space-y-6">
          {maintainKeys.map((key) => (
            <section
              key={key}
              className="border-l-2 border-opseu-blue/30 pl-5"
            >
              <h3 className="text-lg font-bold text-opseu-dark">
                {t(`maintain.items.${key}.title`)}
              </h3>
              <p className="mt-2 max-w-prose leading-relaxed text-gray-700">
                {t(`maintain.items.${key}.content`)}
              </p>
            </section>
          ))}
        </div>
      </section>

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
        <ul className="mt-4 list-disc space-y-3 pl-5 text-gray-700">
          {pairKeys.map((key) => (
            <li key={key}>
              <span className="font-semibold text-opseu-dark">
                {t(`pair.items.${key}.label`)}:
              </span>{" "}
              {t(`pair.items.${key}.content`)}
            </li>
          ))}
        </ul>
      </section>

      <div className="button-row mt-10 max-w-2xl">
        <Link href="/tools/website-template">
          <Button>{t("toolCta")}</Button>
        </Link>
        <Link href="/brand-kit">
          <Button variant="outline">{nav("brandKit")}</Button>
        </Link>
        <Link href="/tools/qr-card">
          <Button variant="outline">{nav("qrCard")}</Button>
        </Link>
        <Link href="/guide/social-media-plan">
          <Button variant="outline">{nav("socialMediaPlan")}</Button>
        </Link>
      </div>
    </GuideLayout>
  );
}
