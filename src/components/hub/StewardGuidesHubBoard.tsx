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

const READ_FIRST = [
  {
    href: "/guide/officer-learning/contract-enforcement",
    titleKey: "readModule1" as const,
  },
  {
    href: "/guide/officer-learning/progressive-discipline",
    titleKey: "readModule2" as const,
  },
  {
    href: "/guide/officer-learning/human-rights-accommodation",
    titleKey: "readModule3" as const,
  },
] as const;

const UTILITIES = [
  {
    href: "/tools/document-generator",
    titleKey: "utilDocGen" as const,
  },
  {
    href: "/app/snippets",
    titleKey: "utilSnippets" as const,
  },
  {
    href: "/guide/grievance-process",
    titleKey: "utilGrievanceGuide" as const,
  },
  {
    href: "/app/informal-log",
    titleKey: "informalLogLink" as const,
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

      <h2 className="mt-8 text-sm font-semibold uppercase tracking-wide text-gray-500">
        {t("workspacesHeading")}
      </h2>
      <ul className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {TOOLS.map((tool) => (
          <li key={tool.href}>
            <Card
              density="compact"
              className="h-full border-l-2 border-l-opseu-blue/40"
            >
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

      <h2 className="mt-10 text-sm font-semibold uppercase tracking-wide text-gray-500">
        {t("readFirstHeading")}
      </h2>
      <ul className="mt-3 grid gap-2 sm:grid-cols-3">
        {READ_FIRST.map((item) => (
          <li key={item.href}>
            <Link
              href={item.href}
              className="inline-flex min-h-11 items-center text-sm font-semibold text-opseu-blue underline underline-offset-2"
            >
              {t(item.titleKey)}
            </Link>
          </li>
        ))}
      </ul>

      <h2 className="mt-10 text-sm font-semibold uppercase tracking-wide text-gray-500">
        {t("utilitiesHeading")}
      </h2>
      <ul className="mt-3 flex flex-wrap gap-x-4 gap-y-2">
        {UTILITIES.map((item) => (
          <li key={item.href}>
            <Link
              href={item.href}
              className="inline-flex min-h-11 items-center text-sm font-semibold text-opseu-blue underline underline-offset-2"
            >
              {t(item.titleKey)}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
