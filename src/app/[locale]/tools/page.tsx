import { setRequestLocale, getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { PageShell } from "@/components/layout/PageShell";
import { toolGroups } from "@/components/layout/nav/nav-config";

export default async function ToolsIndexPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("toolsIndex");
  const nav = await getTranslations("nav");

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
