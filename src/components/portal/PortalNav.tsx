"use client";

import { useCallback, useEffect, useId, useLayoutEffect, useRef, useState } from "react";
import { useSession } from "next-auth/react";
import { useTranslations } from "next-intl";
import { Link, usePathname } from "@/i18n/navigation";
import { getTenantContext } from "@/lib/tenant/loader";
import {
  canSeeOfficerHubLink,
} from "@/lib/portal/access";
import type { UserRole } from "@/types/tenant";
import type { StationPayload } from "@/types/portal";
import { cn } from "@/lib/utils";
import { PAGE_SHELL } from "@/lib/constants/page-shell";
import { preferredHubToolsMenuWidth } from "@/lib/utils/flyout-geometry";
import { NavDropdown } from "@/components/layout/nav/NavDropdown";
import { PortalNavDrawer } from "@/components/portal/PortalNavDrawer";
import {
  PORTAL_NAV_LINKS,
  circleIdFromPath,
  portalCirclesMenuActive,
  portalNavLinkActive,
  sortCirclesForNav,
  type PortalNavCircle,
} from "@/components/portal/portal-nav-model";

export function PortalNav() {
  const { data: session, status } = useSession();
  const t = useTranslations("portal");
  const pathname = usePathname();
  const barRef = useRef<HTMLElement>(null);
  const toggleRef = useRef<HTMLButtonElement>(null);
  const drawerId = useId();
  const [drawer, setDrawer] = useState<{ path: string } | null>(null);
  const [drawerTop, setDrawerTop] = useState(0);
  const [circlesMenu, setCirclesMenu] = useState<{ path: string } | null>(null);
  const [circles, setCircles] = useState<PortalNavCircle[]>([]);
  const [dispatchUnread, setDispatchUnread] = useState(0);

  const drawerOpen = drawer?.path === pathname;
  const circlesOpen = circlesMenu?.path === pathname;
  const circlesActive = portalCirclesMenuActive(pathname);

  useLayoutEffect(() => {
    const el = barRef.current;
    if (!el) return;
    const update = () => {
      setDrawerTop(Math.ceil(el.getBoundingClientRect().bottom));
    };
    update();
    if (typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(update);
    observer.observe(el);
    return () => observer.disconnect();
  }, [drawerOpen]);

  useEffect(() => {
    let cancelled = false;
    void fetch("/api/portal/station")
      .then(async (res) => {
        if (cancelled || !res.ok) return;
        const data = (await res.json()) as { station: StationPayload };
        if (cancelled) return;
        setDispatchUnread(data.station.dispatchUnread);
        setCircles(
          sortCirclesForNav(
            data.station.circles.map((c) => ({
              id: c.id,
              name: c.name,
              starred: c.membership.starred,
            })),
          ),
        );
      })
      .catch(() => {
        /* Together Circle list is optional chrome — page body still loads. */
      });
    return () => {
      cancelled = true;
    };
  }, [pathname]);

  const closeDrawer = useCallback(() => {
    setDrawer(null);
    requestAnimationFrame(() => toggleRef.current?.focus());
  }, []);
  const closeDrawerAfterNav = useCallback(() => {
    requestAnimationFrame(() => setDrawer(null));
  }, []);
  const toggleDrawer = () => {
    setCirclesMenu(null);
    setDrawer((prev) => (prev?.path === pathname ? null : { path: pathname }));
  };

  if (status !== "authenticated" || !session?.user) return null;

  const tenant = session.user.unionId
    ? getTenantContext(session.user.unionId)
    : null;
  const roles = (session.user.roles ?? []) as UserRole[];
  const showHub =
    Boolean(tenant?.union.enabledModules.includes("portal")) &&
    canSeeOfficerHubLink(roles);
  const currentCircleId = circleIdFromPath(pathname);
  const currentCircle = circles.find((c) => c.id === currentCircleId);
  const circlesLabel = currentCircle?.name ?? t("circlesMenu");

  const linkClass = (extra?: string) =>
    cn(
      "inline-flex items-center whitespace-nowrap rounded-md px-2 py-1 hover:bg-white",
      extra,
    );

  return (
    <nav
      ref={barRef}
      className={cn(
        "sticky z-40 border-b border-gray-200 bg-gray-50",
        "top-[var(--site-header-height,3.5rem)]",
        drawerOpen && "z-[80]",
      )}
      aria-label={t("navLabel")}
    >
      <div
        className={cn(
          PAGE_SHELL.chrome,
          "flex items-center justify-between gap-3 py-2 text-sm",
        )}
      >
        <div className="flex min-w-0 items-center gap-2">
          <Link
            href="/portal"
            aria-current={pathname === "/portal" ? "page" : undefined}
            className="shrink-0 font-semibold whitespace-nowrap text-opseu-dark hover:underline"
          >
            {t("stationTitle")}
          </Link>
        </div>

        <div className="hidden min-w-0 flex-1 flex-wrap items-center justify-end gap-1 lg:flex">
          <NavDropdown
            label={circlesLabel}
            open={circlesOpen}
            active={circlesActive}
            onToggle={() =>
              setCirclesMenu((prev) =>
                prev?.path === pathname ? null : { path: pathname },
              )
            }
            onClose={() => setCirclesMenu(null)}
            preferredPanelWidth={preferredHubToolsMenuWidth}
            triggerClassName="font-medium whitespace-nowrap hover:bg-white"
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
                    role="menuitem"
                    tabIndex={-1}
                    aria-current={active ? "page" : undefined}
                    onClick={() => {
                      window.setTimeout(() => setCirclesMenu(null), 0);
                    }}
                    className={cn(
                      "block px-3 py-2 text-sm outline-none hover:bg-gray-50 focus-visible:bg-opseu-blue/10 focus-visible:ring-2 focus-visible:ring-opseu-blue/40",
                      active &&
                        "bg-opseu-blue/10 font-semibold text-opseu-dark",
                    )}
                  >
                    {circle.starred ? "★ " : ""}
                    {circle.name}
                  </Link>
                );
              })
            )}
          </NavDropdown>
          {PORTAL_NAV_LINKS.filter((link) => link.id !== "station").map(
            (link) => {
              const active = portalNavLinkActive(pathname, link.href);
              return (
                <Link
                  key={link.id}
                  href={link.href}
                  aria-current={active ? "page" : undefined}
                  className={linkClass(
                    active ? "bg-white font-semibold text-opseu-dark" : undefined,
                  )}
                >
                  {t(link.labelKey)}
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
            },
          )}
          {showHub ? (
            <Link href="/app" className={linkClass("text-opseu-blue")}>
              {t("hubLink")}
            </Link>
          ) : null}
        </div>

        <button
          ref={toggleRef}
          type="button"
          className="relative z-[80] inline-flex min-h-11 min-w-11 items-center justify-center rounded-md border border-gray-200 text-opseu-dark hover:bg-white lg:hidden"
          aria-expanded={drawerOpen}
          aria-controls={drawerId}
          aria-label={drawerOpen ? t("closePortalMenu") : t("openPortalMenu")}
          data-testid="portal-nav-toggle"
          onClick={toggleDrawer}
        >
          {drawerOpen ? (
            <span aria-hidden="true" className="text-xl leading-none">
              ×
            </span>
          ) : (
            <span aria-hidden="true" className="flex flex-col gap-1.5">
              <span className="block h-0.5 w-5 bg-current" />
              <span className="block h-0.5 w-5 bg-current" />
              <span className="block h-0.5 w-5 bg-current" />
            </span>
          )}
        </button>
      </div>

      {drawerOpen ? (
        <PortalNavDrawer
          drawerTop={drawerTop}
          pathname={pathname}
          links={PORTAL_NAV_LINKS}
          circles={circles}
          circlesActive={circlesActive}
          circlesLabel={circlesLabel}
          hubHref={showHub ? "/app" : undefined}
          hubLabel={showHub ? t("hubLink") : undefined}
          dispatchUnread={dispatchUnread}
          onClose={closeDrawer}
          onCloseAfterNav={closeDrawerAfterNav}
          drawerId={drawerId}
        />
      ) : null}
    </nav>
  );
}
