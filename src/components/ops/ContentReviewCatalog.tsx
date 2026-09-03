"use client";

import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import type {
  ContentReviewEntry,
  ContentReviewSection,
} from "@/lib/ops/content-review-catalog";

function TagPill({ tag }: { tag: string }) {
  const t = useTranslations("buildReview");
  return (
    <span className="ml-2 inline-block rounded bg-gray-100 px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-gray-600">
      {t(`tags.${tag}` as "tags.pdf")}
    </span>
  );
}

function ReviewLink({ entry }: { entry: ContentReviewEntry }) {
  const tNav = useTranslations("nav");
  const tReview = useTranslations("buildReview");
  const tHub = useTranslations("hub");

  let label: string;
  if (entry.navKey) {
    label = tNav(entry.navKey as "home");
  } else if (entry.labelKey?.startsWith("hubTool.")) {
    label = tHub(entry.labelKey.replace("hubTool.", "") as "calendarLink");
  } else if (entry.labelKey?.startsWith("modules.")) {
    label = tHub(entry.labelKey as "modules.grievance");
  } else {
    label = tReview(`links.${entry.labelKey}` as "links.portalHome");
  }

  return (
    <Link
      href={entry.href}
      className="font-medium text-opseu-blue underline decoration-opseu-blue/30 underline-offset-2 hover:decoration-opseu-blue"
    >
      {label}
      {entry.tags?.map((tag) => (
        <TagPill key={tag} tag={tag} />
      ))}
    </Link>
  );
}

export function ContentReviewCatalog({ sections }: { sections: ContentReviewSection[] }) {
  const t = useTranslations("buildReview");

  return (
    <div className="space-y-10">
      <nav
        aria-label={t("tocLabel")}
        className="sticky top-0 z-10 -mx-4 border-b border-gray-200 bg-white/95 px-4 py-3 backdrop-blur sm:mx-0 sm:rounded-lg sm:border sm:px-4"
      >
        <ul className="flex flex-wrap gap-x-4 gap-y-2 text-sm">
          {sections.map((section) => (
            <li key={section.id}>
              <a
                href={`#${section.id}`}
                className="text-opseu-blue underline decoration-opseu-blue/30 underline-offset-2 hover:decoration-opseu-blue"
              >
                {t(`sections.${section.labelKey}` as "sections.siteShell")}
              </a>
            </li>
          ))}
        </ul>
      </nav>

      {sections.map((section) => (
        <section key={section.id} id={section.id} className="scroll-mt-24">
          <h2 className="text-xl font-bold text-opseu-dark">
            {t(`sections.${section.labelKey}` as "sections.siteShell")}
          </h2>
          {section.requiresAuth ? (
            <p className="mt-2 text-sm text-amber-800">{t("requiresAuth")}</p>
          ) : null}
          {section.hintKey ? (
            <p className="mt-2 font-mono text-xs text-gray-500">
              {t(`hints.${section.hintKey}` as "hints.tools")}
            </p>
          ) : null}
          <ul className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {section.entries.map((entry) => (
              <li key={entry.href} className="text-sm leading-snug">
                <ReviewLink entry={entry} />
                <span className="mt-0.5 block font-mono text-xs text-gray-400">{entry.href}</span>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}
