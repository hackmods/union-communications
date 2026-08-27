"use client";

import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { Card, CardTitle } from "@/components/ui/Card";
import { Callout } from "@/components/ui/Callout";

const TOOLS = [
  {
    href: "/tools/rtw-accommodation",
    titleKey: "rtwTitle" as const,
    blurbKey: "rtwBlurb" as const,
  },
  {
    href: "/tools/pre-disciplinary-log",
    titleKey: "disciplineTitle" as const,
    blurbKey: "disciplineBlurb" as const,
  },
  {
    href: "/tools/complaint-vs-grievance",
    titleKey: "diagnosticTitle" as const,
    blurbKey: "diagnosticBlurb" as const,
  },
] as const;

export function StewardGuidesHubBoard() {
  const t = useTranslations("stewardGuidesHub");

  return (
    <div className="py-6 md:py-8">
      <header className="max-w-2xl">
        <h1 className="text-2xl font-bold text-opseu-dark md:text-3xl">
          {t("title")}
        </h1>
        <p className="mt-1 text-gray-600">{t("subtitle")}</p>
      </header>

      <Callout tone="muted" className="mt-4 max-w-2xl">
        {t("privacyNote")}
      </Callout>

      <ul className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {TOOLS.map((tool) => (
          <li key={tool.href}>
            <Card density="compact" className="h-full">
              <CardTitle className="text-base">{t(tool.titleKey)}</CardTitle>
              <p className="mt-1 text-sm text-gray-600">{t(tool.blurbKey)}</p>
              <Link
                href={tool.href}
                className="mt-3 inline-flex min-h-11 items-center text-sm font-semibold text-opseu-blue underline underline-offset-2"
              >
                {t("openTool")} →
              </Link>
            </Card>
          </li>
        ))}
      </ul>

      <p className="mt-6 text-sm text-gray-600">
        <Link
          href="/app/informal-log"
          className="font-semibold text-opseu-blue underline underline-offset-2"
        >
          {t("informalLogLink")}
        </Link>
      </p>
    </div>
  );
}
