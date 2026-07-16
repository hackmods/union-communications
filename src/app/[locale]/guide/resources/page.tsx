import { setRequestLocale, getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/Button";
import { GuideLayout } from "@/components/comms/GuideLayout";
import { Callout } from "@/components/ui/Callout";
import {
  COMMS_SOURCES,
  getSourcesByCategory,
  type CommsSourceCategory,
} from "@/lib/constants/comms-sources";

const categoryOrder: CommsSourceCategory[] = [
  "branding",
  "website",
  "union",
  "platform",
  "accessibility",
];

const pathLinks = [
  { href: "/guide/social-media-plan", key: "plan" as const },
  { href: "/guide", key: "blueprint" as const },
  { href: "/guide/union-boards", key: "boards" as const },
  { href: "/guide/print", key: "print" as const },
  { href: "/guide/website", key: "website" as const },
  { href: "/guide/crisis", key: "crisis" as const },
  { href: "/guide/photo-consent", key: "photoConsent" as const },
];

const exploreLinks = [
  { href: "/guide/social-media-plan", key: "cta" as const },
  { href: "/onboarding", key: "onboarding" as const },
  { href: "/tools/logo-builder", key: "logo" as const },
  { href: "/tools/board-notice", key: "board" as const },
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
  const ts = await getTranslations("sources");
  const allSources = Object.values(COMMS_SOURCES);
  const byCategory = getSourcesByCategory(allSources);

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
        <Link href="/guide/social-media-plan" className="mt-4 inline-block">
          <Button size="sm">{t("purpose.cta")}</Button>
        </Link>
      </Callout>

      <section className="border-l-2 border-opseu-blue/30 pl-5">
        <h2 className="text-xl font-bold text-opseu-dark">{t("path.title")}</h2>
        <p className="mt-2 text-gray-700">{t("path.intro")}</p>
        <ul className="mt-4 space-y-3">
          {pathLinks.map(({ href, key }) => (
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

      <Callout tone="muted" className="mt-8">
        <p className="font-semibold text-opseu-dark">{t("demoKit.title")}</p>
        <p className="mt-2 text-gray-700">{t("demoKit.description")}</p>
        <a
          href="/demo/brand-kit-local-243.json"
          download="brand-kit-local-243.json"
          className="mt-3 inline-block text-sm font-medium text-opseu-blue underline"
        >
          {t("demoKit.download")}
        </a>
      </Callout>

      <Callout tone="muted" className="mt-6">
        <p className="font-semibold text-opseu-dark">{t("explore.title")}</p>
        <nav
          className="mt-2 flex flex-wrap items-baseline gap-x-3 gap-y-1"
          aria-label={t("explore.title")}
        >
          {exploreLinks.map(({ href, key }, i) => (
            <span key={`${href}-${key}`} className="inline-flex items-baseline gap-x-3">
              {i > 0 && (
                <span className="text-gray-300" aria-hidden="true">
                  ·
                </span>
              )}
              <Link
                href={href}
                className="font-medium text-opseu-blue underline underline-offset-2 hover:text-opseu-dark"
              >
                {t(`explore.${key}`)}
              </Link>
            </span>
          ))}
        </nav>
      </Callout>

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

      <div className="mt-10">
        <h2 className="text-xl font-bold text-opseu-dark">
          {t("allSources.title")}
        </h2>
        <p className="mt-2 text-gray-600">{t("allSources.intro")}</p>

        <div className="mt-6 space-y-8">
          {categoryOrder.map((category) => {
            const sources = byCategory[category];
            if (sources.length === 0) return null;
            return (
              <section
                key={category}
                className="border-l-2 border-opseu-blue/30 pl-5"
              >
                <h3 className="text-base font-bold text-opseu-dark">
                  {ts(`categories.${category}`)}
                </h3>
                <ul className="mt-3 space-y-3">
                  {sources.map((source) => (
                    <li
                      key={source.id}
                      className="border-b border-gray-100 pb-3 last:border-0 last:pb-0"
                    >
                      <a
                        href={source.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="font-medium text-opseu-blue underline"
                      >
                        {source.label}
                      </a>
                      <p className="mt-1 text-sm text-gray-600">{source.note}</p>
                    </li>
                  ))}
                </ul>
              </section>
            );
          })}
        </div>
      </div>
    </GuideLayout>
  );
}
