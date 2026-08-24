import type { Metadata } from "next";
import { buildPublicPageMetadata } from "@/lib/seo/public-page-meta";
import { setRequestLocale, getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/Button";
import { GuideLayout } from "@/components/comms/GuideLayout";
import { GuideRelatedLinkList } from "@/components/comms/GuideRelatedLinkList";
import { Callout } from "@/components/ui/Callout";
import { ResourcesSourcesList } from "@/components/comms/ResourcesSourcesList";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  return buildPublicPageMetadata("/guide/resources", params);
}

const commsPathLinks = [
  { href: "/guide", key: "blueprint" as const },
  { href: "/guide/social-media-plan", key: "plan" as const },
  { href: "/guide/workshop", key: "workshop" as const },
  { href: "/guide/union-boards", key: "boards" as const },
  { href: "/guide/print", key: "print" as const },
  { href: "/guide/website", key: "website" as const },
  { href: "/guide/email-broadcast", key: "email" as const },
  { href: "/guide/short-form", key: "shortForm" as const },
  { href: "/guide/crisis", key: "crisis" as const },
  { href: "/guide/photo-consent", key: "photoConsent" as const },
];

const labourPathLinks = [
  { href: "/guide/dfr", key: "dfr" as const },
  { href: "/guide/seniority-bumping", key: "seniority" as const },
  { href: "/guide/right-to-refuse", key: "rightToRefuse" as const },
  { href: "/guide/joint-committee", key: "jointCommittee" as const },
];

const exploreLinks = [
  { href: "/guide/social-media-plan", key: "cta" as const },
  { href: "/onboarding", key: "onboarding" as const },
  { href: "/tools/logo-builder", key: "logo" as const },
  { href: "/tools/board-notice", key: "board" as const },
  { href: "/tools/flyer-maker", key: "flyer" as const },
  { href: "/tools/graphic-maker", key: "graphic" as const },
  { href: "/tools/website-template", key: "website" as const },
  { href: "/guide/crisis", key: "crisis" as const },
];

export default async function ResourcesPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("resources");

  return (
    <GuideLayout
      title={t("title")}
      subtitle={t("subtitle")}
      intro={t("intro")}
    >
      <Callout className="mb-8">
        <p className="font-semibold text-opseu-dark">{t("purpose.title")}</p>
        <p className="mt-2 leading-relaxed text-gray-700">{t("purpose.body")}</p>
        <ul className="mt-3 list-disc space-y-2 pl-5 text-gray-700">
          {(t.raw("purpose.pillars") as string[]).map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
        <Link href="/brand-kit" className="mt-4 inline-block">
          <Button size="sm">{t("purpose.cta")}</Button>
        </Link>
      </Callout>

      <section className="border-l-2 border-opseu-blue/30 pl-5">
        <h2 className="text-xl font-bold text-opseu-dark">{t("path.title")}</h2>
        <p className="mt-2 text-gray-700">{t("path.intro")}</p>
        <ul className="mt-4 space-y-3">
          {commsPathLinks.map(({ href, key }) => (
            <li key={href}>
              <Link
                href={href}
                className="font-medium text-opseu-blue underline"
              >
                {t(`path.links.${key}`)}
              </Link>
              <p className="mt-0.5 text-sm text-gray-600">
                {t(`path.blurb.${key}`)}
              </p>
            </li>
          ))}
        </ul>
      </section>

      <section className="mt-8 border-l-2 border-amber-500/40 pl-5">
        <h2 className="text-xl font-bold text-opseu-dark">
          {t("labourPath.title")}
        </h2>
        <p className="mt-2 text-gray-700">{t("labourPath.intro")}</p>
        <ul className="mt-4 space-y-3">
          {labourPathLinks.map(({ href, key }) => (
            <li key={href}>
              <Link
                href={href}
                className="font-medium text-opseu-blue underline"
              >
                {t(`labourPath.links.${key}`)}
              </Link>
              <p className="mt-0.5 text-sm text-gray-600">
                {t(`labourPath.blurb.${key}`)}
              </p>
            </li>
          ))}
        </ul>
      </section>

      <section className="mt-8 border-l-2 border-opseu-blue/30 pl-5">
        <h2 className="text-xl font-bold text-opseu-dark">
          {t("checklist.title")}
        </h2>
        <p className="mt-2 text-gray-700">{t("checklist.intro")}</p>
        <ul className="mt-3 list-disc space-y-2 pl-5 text-gray-700">
          {(t.raw("checklist.items") as string[]).map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </section>

      <section className="mt-8 border-l-2 border-opseu-blue/30 pl-5">
        <h2 className="text-xl font-bold text-opseu-dark">{t("demoKit.title")}</h2>
        <p className="mt-2 text-gray-700">{t("demoKit.description")}</p>
        <a
          href="/demo/brand-kit-local-243.json"
          download="brand-kit-local-243.json"
          className="mt-3 inline-block text-sm font-medium text-opseu-blue underline"
        >
          {t("demoKit.download")}
        </a>
      </section>

      <section className="mt-8 border-l-2 border-opseu-blue/30 pl-5">
        <h2 className="text-xl font-bold text-opseu-dark">{t("explore.title")}</h2>
        <nav className="mt-2 text-sm" aria-label={t("explore.title")}>
          <GuideRelatedLinkList
            links={exploreLinks.map(({ href, key }) => ({
              href,
              label: t(`explore.${key}`),
            }))}
          />
        </nav>
      </section>

      <section className="mt-8 border-l-2 border-opseu-blue/30 pl-5">
        <h2 className="text-xl font-bold text-opseu-dark">
          {t("presentation.title")}
        </h2>
        <p className="mt-2 max-w-prose leading-relaxed text-gray-700">
          {t("presentation.body")}
        </p>
        <ol className="mt-3 list-decimal space-y-2 pl-5 text-gray-700">
          {(t.raw("presentation.outline") as string[]).map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ol>
        <p className="mt-3 max-w-prose leading-relaxed text-gray-700">
          {t("presentation.tinker")}
        </p>
        <p className="mt-3 text-sm text-gray-600">{t("presentation.note")}</p>
      </section>

      <section className="mt-8 border-l-2 border-opseu-blue/30 pl-5">
        <h2 className="text-xl font-bold text-opseu-dark">
          {t("facilitators.title")}
        </h2>
        <p className="mt-2 max-w-prose leading-relaxed text-gray-700">
          {t("facilitators.body")}
        </p>
        <ol className="mt-3 list-decimal space-y-2 pl-5 text-gray-700">
          {(t.raw("facilitators.outline") as string[]).map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ol>
        <p className="mt-3 text-sm text-gray-600">{t("facilitators.note")}</p>
      </section>

      <section className="mt-8 border-l-2 border-opseu-blue/30 pl-5">
        <h2 className="text-xl font-bold text-opseu-dark">
          {t("builtFrom.title")}
        </h2>
        <ul className="mt-3 list-disc space-y-2 pl-5 text-gray-700">
          {(t.raw("builtFrom.items") as string[]).map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </section>

      <section className="mt-8 border-l-2 border-opseu-blue/30 pl-5">
        <h2 className="text-xl font-bold text-opseu-dark">
          {t("federations.title")}
        </h2>
        <p className="mt-2 max-w-prose leading-relaxed text-gray-700">
          {t("federations.body")}
        </p>
      </section>

      <ResourcesSourcesList />
    </GuideLayout>
  );
}
