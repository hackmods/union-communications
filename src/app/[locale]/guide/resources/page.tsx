import { setRequestLocale, getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { Card, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
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
    <div className="mx-auto max-w-3xl px-4 py-12">
      <h1 className="text-3xl font-bold text-opseu-dark">{t("title")}</h1>
      <p className="mt-2 text-lg text-gray-600">{t("subtitle")}</p>
      <p className="mt-4 leading-relaxed text-gray-700">{t("intro")}</p>

      <Card className="mt-8 border-opseu-blue/20 bg-opseu-blue/5">
        <CardTitle>{t("purpose.title")}</CardTitle>
        <p className="mt-3 leading-relaxed text-gray-700">{t("purpose.body")}</p>
        <ul className="mt-3 list-disc space-y-2 pl-5 text-gray-700">
          {(t.raw("purpose.pillars") as string[]).map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
        <Link href="/guide/social-media-plan" className="mt-4 inline-block">
          <Button size="sm">{t("purpose.cta")}</Button>
        </Link>
      </Card>

      <Card className="mt-6">
        <CardTitle>{t("path.title")}</CardTitle>
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
      </Card>

      <Card className="mt-6">
        <CardTitle>{t("checklist.title")}</CardTitle>
        <p className="mt-2 text-gray-700">{t("checklist.intro")}</p>
        <ul className="mt-3 list-disc space-y-2 pl-5 text-gray-700">
          {(t.raw("checklist.items") as string[]).map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </Card>

      <Card className="mt-6">
        <CardTitle>{t("demoKit.title")}</CardTitle>
        <p className="mt-2 text-gray-700">{t("demoKit.description")}</p>
        <a
          href="/demo/brand-kit-local-243.json"
          download="brand-kit-local-243.json"
          className="mt-3 inline-block text-sm font-medium text-opseu-blue underline"
        >
          {t("demoKit.download")}
        </a>
      </Card>

      <Card className="mt-6">
        <CardTitle>{t("explore.title")}</CardTitle>
        <ul className="mt-3 space-y-2">
          {exploreLinks.map(({ href, key }) => (
            <li key={href}>
              <Link href={href} className="text-opseu-blue underline">
                {t(`explore.${key}`)}
              </Link>
            </li>
          ))}
        </ul>
      </Card>

      <Card className="mt-6 border-opseu-blue/20 bg-opseu-blue/5">
        <CardTitle>{t("facilitators.title")}</CardTitle>
        <p className="mt-2 leading-relaxed text-gray-700">
          {t("facilitators.body")}
        </p>
        <ol className="mt-3 list-decimal space-y-2 pl-5 text-gray-700">
          {(t.raw("facilitators.outline") as string[]).map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ol>
        <p className="mt-3 text-sm text-gray-600">{t("facilitators.note")}</p>
      </Card>

      <Card className="mt-6">
        <CardTitle>{t("builtFrom.title")}</CardTitle>
        <ul className="mt-3 list-disc space-y-2 pl-5 text-gray-700">
          {(t.raw("builtFrom.items") as string[]).map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </Card>

      <div className="mt-10">
        <h2 className="text-xl font-bold text-opseu-dark">
          {t("allSources.title")}
        </h2>
        <p className="mt-2 text-gray-600">{t("allSources.intro")}</p>

        <div className="mt-6 space-y-6">
          {categoryOrder.map((category) => {
            const sources = byCategory[category];
            if (sources.length === 0) return null;
            return (
              <Card key={category}>
                <CardTitle className="text-base">
                  {ts(`categories.${category}`)}
                </CardTitle>
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
              </Card>
            );
          })}
        </div>
      </div>
    </div>
  );
}
