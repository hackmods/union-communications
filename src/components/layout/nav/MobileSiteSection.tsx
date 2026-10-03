"use client";

import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import {
  isPublicPrimaryNavActive,
  PUBLIC_PRIMARY_NAV,
  type PublicPrimaryNavKey,
} from "@/components/layout/nav/nav-config";
import { cn } from "@/lib/utils";

/**
 * Public Site destinations inside Hub/Portal mobile sheets so officers keep
 * Brand Kit / Create / Learn after the public hamburger is hidden on /app|/portal.
 */
export function MobileSiteSection({
  pathname,
  onNavigate,
  heading,
  linkClassName,
  excludeKeys = [],
}: {
  pathname: string;
  onNavigate: () => void;
  heading: string;
  linkClassName: (active: boolean) => string;
  /** Hub/Portal sheets omit public "Platform" so it is not confused with Site Admin. */
  excludeKeys?: readonly PublicPrimaryNavKey[];
}) {
  const t = useTranslations("nav");
  const items = PUBLIC_PRIMARY_NAV.filter(
    (item) => !excludeKeys.includes(item.key),
  );

  return (
    <div className="mt-4 border-t border-gray-200 pt-3" data-testid="mobile-site-section">
      <p className="px-3 pb-1 text-xs font-semibold uppercase tracking-wide text-gray-500">
        {heading}
      </p>
      <div className="space-y-0.5">
        {items.map((item) => {
          const active = isPublicPrimaryNavActive(pathname, item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onNavigate}
              aria-current={active ? "page" : undefined}
              className={linkClassName(active)}
            >
              {t(item.key)}
            </Link>
          );
        })}
        <Link
          href="/search"
          onClick={onNavigate}
          aria-current={pathname.startsWith("/search") ? "page" : undefined}
          className={cn(linkClassName(pathname.startsWith("/search")))}
        >
          <span aria-hidden="true" className="mr-2">
            ⌕
          </span>
          {t("search")}
        </Link>
      </div>
    </div>
  );
}
