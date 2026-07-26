import { setRequestLocale, getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { PageShell } from "@/components/layout/PageShell";
import { learnGroups, toolGroups } from "@/components/layout/nav/nav-config";

export default async function ToolsIndexPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("toolsIndex");
  const nav = await getTranslations("nav");
  const channelGuides = learnGroups.find(
    (g) => g.labelKey === "learnGroupChannels",
  )?.links;

  return (
    <PageShell className="py-8 md:py-12">
      <header className="max-w-2xl">
        <h1 className="text-2xl font-bold tracking-tight text-opseu-dark md:text-3xl">
          {t("title")}
        </h1>
        <p className="mt-2 text-gray-600">{t("subtitle")}</p>
      </header>

      <div className="mt-8 grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
        {toolGroups.map((group) => (
          <section key={group.labelKey} aria-labelledby={`tools-${group.labelKey}`}>
            <h2
              id={`tools-${group.labelKey}`}
              className="text-sm font-semibold uppercase tracking-wide text-gray-500"
            >
              {nav(group.labelKey)}
            </h2>
            <ul className="mt-3 space-y-1">
              {group.links.map(({ href, key }) => (
                <li key={href}>
                  <Link
                    href={href}
                    className="inline-flex min-h-11 items-center rounded-md px-1 text-opseu-blue underline-offset-2 hover:underline"
                  >
                    {nav(key)}
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>

      {channelGuides ? (
        <section className="mt-10 border-t border-gray-200 pt-8" aria-labelledby="tools-channel-guides">
          <h2
            id="tools-channel-guides"
            className="text-sm font-semibold uppercase tracking-wide text-gray-500"
          >
            {t("channelGuidesTitle")}
          </h2>
          <p className="mt-2 max-w-prose text-sm text-gray-600">
            {t("channelGuidesIntro")}
          </p>
          <nav
            className="mt-3 flex flex-wrap items-baseline gap-x-3 gap-y-1"
            aria-label={t("channelGuidesTitle")}
          >
            {channelGuides.map((link, i) => (
              <span key={link.href} className="inline-flex items-baseline gap-x-3">
                {i > 0 && (
                  <span className="text-gray-300" aria-hidden="true">
                    ·
                  </span>
                )}
                <Link
                  href={link.href}
                  className="inline-flex min-h-11 items-center font-medium text-opseu-blue underline-offset-2 hover:underline"
                >
                  {nav(link.key)}
                </Link>
              </span>
            ))}
          </nav>
        </section>
      ) : null}

      <p className="mt-10 max-w-prose text-sm text-gray-600">
        {t("hint")}{" "}
        <Link
          href="/brand-kit"
          className="font-medium text-opseu-blue underline-offset-2 hover:underline"
        >
          {nav("brandKit")}
        </Link>
        .
      </p>
    </PageShell>
  );
}
