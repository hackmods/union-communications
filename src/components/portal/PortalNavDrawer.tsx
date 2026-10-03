"use client";

import { useId, useState, type ReactNode } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { cn } from "@/lib/utils";
import { MobileSheet } from "@/components/layout/nav/MobileSheet";
import { MobileSiteSection } from "@/components/layout/nav/MobileSiteSection";
import {
  portalNavLinkActive,
  type PortalNavCircle,
  type PortalNavLink,
} from "@/components/portal/portal-nav-model";

type PortalNavDrawerProps = {
  drawerTop: number;
  pathname: string;
  links: readonly PortalNavLink[];
  circles: PortalNavCircle[];
  circlesActive: boolean;
  circlesLabel: string;
  hubHref?: string;
  hubLabel?: string;
  dispatchUnread: number;
  onClose: () => void;
  onCloseAfterNav: () => void;
  drawerId: string;
};

export function PortalNavDrawer({
  drawerTop,
  pathname,
  links,
  circles,
  circlesActive,
  circlesLabel,
  hubHref,
  hubLabel,
  dispatchUnread,
  onClose,
  onCloseAfterNav,
  drawerId,
}: PortalNavDrawerProps) {
  const t = useTranslations("portal");
  const circlesPanelId = useId();
  const [circlesOpen, setCirclesOpen] = useState(circlesActive);

  const linkClass = (active: boolean) =>
    cn(
      "flex min-h-11 min-w-0 items-center rounded-md px-3 py-2 hover:bg-white",
      active && "bg-white font-semibold text-opseu-dark",
    );

  return (
    <MobileSheet
      top={drawerTop}
      drawerId={drawerId}
      label={t("mobileNav")}
      closeLabel={t("closePortalMenu")}
      testId="portal-nav-drawer"
      visibilityClassName="lg:hidden"
      panelClassName="min-w-0 w-full max-w-full min-[480px]:max-w-[min(100%,20rem)] border-gray-200 bg-gray-50"
      onClose={onClose}
    >
      <nav
        className="min-h-0 min-w-0 flex-1 overflow-x-hidden overflow-y-auto overscroll-contain px-3 py-3 text-base"
        aria-label={t("mobileNav")}
      >
        {links.map((link) => {
          const active = portalNavLinkActive(pathname, link.href);
          return (
            <Link
              key={link.id}
              href={link.href}
              onClick={onCloseAfterNav}
              aria-current={active ? "page" : undefined}
              className={linkClass(active)}
            >
              <span>{t(link.labelKey)}</span>
              {link.id === "dispatch" && dispatchUnread > 0 ? (
                <span
                  className="ml-2 rounded-full bg-opseu-blue px-2 py-0.5 text-xs text-white"
                  aria-label={t("unreadShort", { count: dispatchUnread })}
                >
                  {dispatchUnread}
                </span>
              ) : null}
            </Link>
          );
        })}

        <PortalAccordion
          label={circlesLabel}
          open={circlesOpen}
          panelId={circlesPanelId}
          active={circlesActive}
          onToggle={() => setCirclesOpen((v) => !v)}
        >
          {circles.length === 0 ? (
            <p className="px-3 py-2 text-sm text-gray-600">
              {t("circlesEmpty")}
            </p>
          ) : (
            circles.map((circle) => {
              const href = `/portal/circles/${circle.id}`;
              const active = pathname.startsWith(href);
              return (
                <Link
                  key={circle.id}
                  href={href}
                  onClick={onCloseAfterNav}
                  aria-current={active ? "page" : undefined}
                  className={linkClass(active)}
                >
                  {circle.starred ? "★ " : ""}
                  {circle.name}
                </Link>
              );
            })
          )}
        </PortalAccordion>

        {hubHref && hubLabel ? (
          <div className="mt-4 border-t border-gray-200 pt-3">
            <Link
              href={hubHref}
              onClick={onCloseAfterNav}
              className={linkClass(false)}
            >
              {hubLabel}
            </Link>
          </div>
        ) : null}

        <MobileSiteSection
          pathname={pathname}
          onNavigate={onCloseAfterNav}
          heading={t("mobileSiteSection")}
          linkClassName={linkClass}
        />
      </nav>
    </MobileSheet>
  );
}

function PortalAccordion({
  label,
  open,
  panelId,
  active,
  onToggle,
  children,
}: {
  label: string;
  open: boolean;
  panelId: string;
  active: boolean;
  onToggle: () => void;
  children: ReactNode;
}) {
  return (
    <div className="mt-2">
      <button
        type="button"
        className={cn(
          "flex min-h-11 w-full items-center justify-between rounded-md px-3 py-2 text-left hover:bg-white",
          (open || active) && "bg-white font-semibold text-opseu-dark",
        )}
        aria-expanded={open}
        aria-controls={panelId}
        onClick={onToggle}
      >
        <span>{label}</span>
        <span
          aria-hidden="true"
          className={cn(
            "text-[0.65em] transition-transform duration-150",
            open && "rotate-180",
          )}
        >
          ▾
        </span>
      </button>
      {open ? (
        <div id={panelId} className="pb-1 pl-1">
          {children}
        </div>
      ) : null}
    </div>
  );
}
