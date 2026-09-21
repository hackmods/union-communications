"use client";

import { useTranslations } from "next-intl";
import { Link, usePathname } from "@/i18n/navigation";
import { publicCatalogItemForPath } from "@/lib/comms/public-catalog";
import { canonicalPublicPath } from "@/lib/seo/public-routes";

export function PublicCatalogBreadcrumbs() {
  const pathname = canonicalPublicPath(usePathname());
  const nav = useTranslations("nav");
  const t = useTranslations("publicCatalog");
  const tOfficer = useTranslations("officerLearning");
  const section = pathname.startsWith("/create")
    ? { href: "/create" as const, label: nav("create") }
    : pathname.startsWith("/learn")
      ? { href: "/learn" as const, label: nav("learn") }
      : null;

  if (!section) return null;

  const isSectionPage = pathname === section.href;
  const item = isSectionPage ? undefined : publicCatalogItemForPath(pathname);
  if (!isSectionPage && !item) return null;

  const title = item
    ? item.titleNamespace === "officerLearning"
      ? tOfficer(`modules.${item.titleKey}.title` as never)
      : nav(item.titleKey as never)
    : section.label;

  return (
    <nav
      aria-label={t("breadcrumbNav")}
      className="mx-auto w-full max-w-[90rem] px-4 pt-4 sm:px-6 xl:px-8"
    >
      <ol className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1 text-sm text-slate-600">
        <li>
          <Link
            href="/"
            className="rounded-sm underline-offset-2 hover:text-opseu-blue hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-opseu-blue/50"
          >
            {nav("home")}
          </Link>
        </li>
        <li aria-hidden="true">/</li>
        {item ? (
          <>
            <li>
              <Link
                href={section.href}
                className="rounded-sm underline-offset-2 hover:text-opseu-blue hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-opseu-blue/50"
              >
                {section.label}
              </Link>
            </li>
            <li aria-hidden="true">/</li>
            <li className="min-w-0 truncate font-medium text-opseu-dark" aria-current="page">
              {title}
            </li>
          </>
        ) : (
          <li className="font-medium text-opseu-dark" aria-current="page">
            {title}
          </li>
        )}
      </ol>
    </nav>
  );
}
