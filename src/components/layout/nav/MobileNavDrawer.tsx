"use client";

import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { AuthAccountControls } from "@/components/layout/AuthAccountControls";
import { OfficerHubNavLink } from "@/components/layout/OfficerHubNavLink";
import { LocalPortalNavLink } from "@/components/layout/LocalPortalNavLink";
import { MobileSheet } from "./MobileSheet";
import { cn } from "@/lib/utils";
import {
  isPublicPrimaryNavActive,
  primaryNavForContext,
  type ShellContext,
} from "./nav-config";

export function MobileNavDrawer({
  drawerTop,
  pathname,
  shellContext,
  onClose,
  onCloseAfterNav,
  drawerId,
}: {
  drawerTop: number;
  pathname: string;
  shellContext: ShellContext;
  onClose: () => void;
  onCloseAfterNav: () => void;
  drawerId: string;
}) {
  const t = useTranslations("nav");
  const primaryNav = primaryNavForContext(shellContext);

  const linkClass = (active: boolean) => {
    return cn(
      "flex min-h-12 items-center rounded-lg px-3 py-2 font-medium text-slate-700 hover:bg-opseu-blue/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-opseu-blue/50",
      active && "bg-opseu-blue/10 font-semibold text-opseu-dark",
    );
  };

  return (
    <MobileSheet
      top={drawerTop}
      drawerId={drawerId}
      label={t("mainNav")}
      closeLabel={t("closeMenu")}
      testId="mobile-nav-drawer"
      visibilityClassName="xl:hidden"
      onClose={onClose}
    >
      <nav
        className="min-h-0 min-w-0 flex-1 overflow-x-hidden overflow-y-auto overscroll-contain px-4 py-4"
        aria-label={t("mainNav")}
      >
        <div className="space-y-1">
          {primaryNav.map((item) => {
            const active = isPublicPrimaryNavActive(pathname, item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onCloseAfterNav}
                aria-current={active ? "page" : undefined}
                className={linkClass(active)}
              >
                {t(item.key)}
              </Link>
            );
          })}
          <OfficerHubNavLink layout="mobile" onNavigate={onCloseAfterNav} />
          <LocalPortalNavLink layout="mobile" onNavigate={onCloseAfterNav} />
        </div>
      </nav>

      {shellContext === "public" ? (
        <nav
          aria-label={t("utilityNav")}
          className="shrink-0 border-t border-slate-200 px-4 pt-3"
        >
          <Link
            href="/search"
            onClick={onCloseAfterNav}
            aria-current={pathname.startsWith("/search") ? "page" : undefined}
            className="flex min-h-11 items-center rounded-lg px-3 py-2 font-medium text-slate-700 hover:bg-opseu-blue/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-opseu-blue/50"
          >
            <span aria-hidden="true" className="mr-2">
              ⌕
            </span>
            {t("search")}
          </Link>
        </nav>
      ) : null}

      <div className="shrink-0 border-t border-slate-200 px-4 py-3">
        <AuthAccountControls
          layout="stack"
          showHubLink={false}
          showPortalLink={false}
          onNavigate={onCloseAfterNav}
        />
      </div>
    </MobileSheet>
  );
}
