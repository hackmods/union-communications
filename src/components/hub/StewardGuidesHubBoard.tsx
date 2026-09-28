"use client";

import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { Card, CardTitle } from "@/components/ui/Card";
import { Callout } from "@/components/ui/Callout";
import { OFFICER_LEARNING_MODULES } from "@/lib/officer-learning/modules";

const MODULE_READ_KEYS = {
  1: "readModule1",
  2: "readModule2",
  3: "readModule3",
  4: "readModule4",
  5: "readModule5",
  6: "readModule6",
  7: "readModule7",
  8: "readModule8",
  9: "readModule9",
  10: "readModule10",
  11: "readModule11",
  12: "readModule12",
  13: "readModule13",
  14: "readModule14",
  15: "readModule15",
  16: "readModule16",
  17: "readModule17",
} as const;

const TOOLS = [
  {
    href: "/utilities/rtw-accommodation",
    titleKey: "rtwTitle" as const,
    blurbKey: "rtwBlurb" as const,
    moduleHref: "/learn/officer/human-rights-accommodation",
    moduleKey: "readModule3" as const,
  },
  {
    href: "/utilities/pre-disciplinary-log",
    titleKey: "disciplineTitle" as const,
    blurbKey: "disciplineBlurb" as const,
    moduleHref: "/learn/officer/progressive-discipline",
    moduleKey: "readModule2" as const,
  },
  {
    href: "/utilities/complaint-vs-grievance",
    titleKey: "diagnosticTitle" as const,
    blurbKey: "diagnosticBlurb" as const,
    moduleHref: "/learn/officer/contract-enforcement",
    moduleKey: "readModule1" as const,
  },
] as const;

const READ_FIRST = [
  {
    href: "/learn/officer",
    titleKey: "readOfficerLearningCenter" as const,
  },
  ...OFFICER_LEARNING_MODULES.map((module) => ({
    href: `/learn/officer/${module.slug}`,
    titleKey: MODULE_READ_KEYS[module.number as keyof typeof MODULE_READ_KEYS],
  })),
];

const UTILITIES = [
  {
    href: "/learn/steward",
    titleKey: "utilStewardPlaybooks" as const,
  },
  {
    href: "/create/document-generator",
    titleKey: "utilDocGen" as const,
  },
  {
    href: "/app/snippets",
    titleKey: "utilSnippets" as const,
  },
  {
    href: "/learn/grievance-process",
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
              <p className="mt-2 text-xs text-gray-500">
                {t("moduleHint")}{" "}
                <Link
                  href={tool.moduleHref}
                  className="font-semibold text-opseu-blue underline underline-offset-2"
                >
                  {t(tool.moduleKey)}
                </Link>
              </p>
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
      <ul className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
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
