"use client";

import { useTranslations } from "next-intl";
import { Link, usePathname } from "@/i18n/navigation";
import { publicCatalogItemForPath } from "@/lib/comms/public-catalog";
import { canonicalPublicPath } from "@/lib/seo/public-routes";

type Crumb = { href?: string; label: string };

/** Home / Section [/ Officer|Library] / Current — Create, Utilities, Learn. */
export function PublicCatalogBreadcrumbs() {
  const pathname = canonicalPublicPath(usePathname());
  const nav = useTranslations("nav");
  const t = useTranslations("publicCatalog");
  const tOfficer = useTranslations("officerLearning");

  const section = pathname.startsWith("/create")
    ? ({ href: "/create" as const, label: nav("create") })
    : pathname.startsWith("/utilities")
      ? ({ href: "/utilities" as const, label: nav("utilities") })
      : pathname.startsWith("/learn")
        ? ({ href: "/learn" as const, label: nav("learn") })
        : null;

  if (!section) return null;

  const isSectionPage = pathname === section.href;
  const isOfficerHub = pathname === "/learn/officer";
  const isLibraryHub = pathname === "/learn/library";
  const item =
    isSectionPage || isOfficerHub || isLibraryHub
      ? undefined
      : publicCatalogItemForPath(pathname);

  if (!isSectionPage && !isOfficerHub && !isLibraryHub && !item) return null;

  const crumbs: Crumb[] = [
    { href: "/", label: nav("home") },
    { href: section.href, label: section.label },
  ];

  if (pathname.startsWith("/learn/officer")) {
    crumbs.push({ href: "/learn/officer", label: tOfficer("title") });
  } else if (pathname.startsWith("/learn/library")) {
    crumbs.push({ href: "/learn/library", label: t("libraryHubTitle") });
  }

  if (isSectionPage || isOfficerHub || isLibraryHub) {
    const last = crumbs[crumbs.length - 1];
    crumbs[crumbs.length - 1] = { label: last.label };
  } else if (item) {
    const title =
      item.titleNamespace === "officerLearning"
        ? tOfficer(`modules.${item.titleKey}.title` as never)
        : nav(item.titleKey as never);
    crumbs.push({ label: title });
  }

  return (
    <nav
      aria-label={t("breadcrumbNav")}
      className="mx-auto w-full max-w-[90rem] px-4 pt-4 sm:px-6 xl:px-8"
    >
      <ol className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1 text-sm text-slate-600">
        {crumbs.map((crumb, index) => {
          const isLast = index === crumbs.length - 1;
          return (
            <li key={`${crumb.label}-${index}`} className="flex min-w-0 items-center gap-x-2">
              {index > 0 ? <span aria-hidden="true">/</span> : null}
              {isLast || !crumb.href ? (
                <span
                  className="min-w-0 truncate font-medium text-opseu-dark"
                  aria-current={isLast ? "page" : undefined}
                >
                  {crumb.label}
                </span>
              ) : (
                <Link
                  href={crumb.href}
                  className="rounded-sm underline-offset-2 hover:text-opseu-blue hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-opseu-blue/50"
                >
                  {crumb.label}
                </Link>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
