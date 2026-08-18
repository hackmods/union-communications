"use client";

import { useCallback, useId, useLayoutEffect, useRef, useState } from "react";
import { useSession } from "next-auth/react";
import { useTranslations } from "next-intl";
import { Link, usePathname } from "@/i18n/navigation";
import { getHubNavModules } from "@/lib/modules/registry";
import { getTenantContext } from "@/lib/tenant/loader";
import {
  listHubToolLinks,
  resolveHubToolAccess,
} from "@/components/hub/hub-tool-catalog";
import type { HubModule, UserRole } from "@/types/tenant";
import { cn } from "@/lib/utils";
import { PAGE_SHELL } from "@/lib/constants/page-shell";
import { preferredHubToolsMenuWidth } from "@/lib/utils/flyout-geometry";
import { Emoji } from "@/components/ui/Emoji";
import { HubContextSwitcher } from "@/components/hub/HubContextSwitcher";
import { HubNavDrawer } from "@/components/hub/HubNavDrawer";
import {
  groupHubToolLinks,
  hubModuleActive,
  hubToolLinkActive,
  hubToolsActive,
} from "@/components/hub/hub-nav-model";
import {
  useMfaEnabled,
  useSessionMfaOk,
} from "@/components/hub/MfaPolicyProvider";
import { NavDropdown } from "@/components/layout/nav/NavDropdown";

export function HubNav() {
  const { data: session, status } = useSession();
  const t = useTranslations("hub");
  const pathname = usePathname();
  const mfaEnabled = useMfaEnabled();
  const mfaOk = useSessionMfaOk();
  const barRef = useRef<HTMLElement>(null);
  const toggleRef = useRef<HTMLButtonElement>(null);
  const drawerId = useId();
  const [drawer, setDrawer] = useState<{ path: string } | null>(null);
  const [drawerTop, setDrawerTop] = useState(0);
  const [toolsMenu, setToolsMenu] = useState<{ path: string } | null>(null);

  const drawerOpen = drawer?.path === pathname;
  const toolsOpen = toolsMenu?.path === pathname;

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

  const closeDrawer = useCallback(() => {
    setDrawer(null);
    requestAnimationFrame(() => toggleRef.current?.focus());
  }, []);
  const closeDrawerAfterNav = useCallback(() => {
    requestAnimationFrame(() => setDrawer(null));
  }, []);
  const toggleDrawer = () => {
    setToolsMenu(null);
    setDrawer((prev) => (prev?.path === pathname ? null : { path: pathname }));
  };

  if (status !== "authenticated" || !session?.user) return null;

  const tenant = session.user.unionId
    ? getTenantContext(session.user.unionId)
    : null;
  const enabledModules: HubModule[] =
    tenant?.union.enabledModules ?? ["comms"];
  const roles = (session.user.roles ?? []) as UserRole[];
  const modules = getHubNavModules(enabledModules, roles);
  const toolAccess = resolveHubToolAccess(roles, enabledModules);
  const toolLinks = listHubToolLinks(toolAccess, (key) => t(key));
  const toolGroups = groupHubToolLinks(toolLinks);
  const toolsActive = hubToolsActive(pathname, toolLinks);

  const drawerModules = modules.map((mod) => ({
    id: mod.id,
    href: mod.href,
    label: t(`modules.${mod.nameKey}`),
    emojiId: mod.emojiId,
    dimmed: Boolean(mod.requiresMfa && !mfaOk),
  }));

  const accountLinks = [
    mfaEnabled && {
      href: "/app/mfa",
      label: mfaOk ? t("mfaOk") : t("mfaRequired"),
      className: "text-opseu-blue",
    },
    {
      href: "/app/send-feedback",
      label: t("sendFeedbackLink"),
    },
    {
      href: "/app/profile",
      label: t("profileLink"),
    },
  ].filter(Boolean) as { href: string; label: string; className?: string }[];

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
            href="/app"
            aria-current={pathname === "/app" ? "page" : undefined}
            className="shrink-0 font-semibold whitespace-nowrap text-opseu-dark hover:underline"
          >
            {t("title")}
          </Link>
          <span className="hidden shrink-0 text-gray-400 sm:inline" aria-hidden="true">
            |
          </span>
          <div className="hidden min-w-0 sm:block">
            <HubContextSwitcher />
          </div>
        </div>

        <div className="hidden min-w-0 flex-1 flex-wrap items-center justify-end gap-1 lg:flex">
          {toolGroups.length > 0 && (
            <NavDropdown
              label={t("toolsMenu")}
              open={toolsOpen}
              active={toolsActive}
              onToggle={() =>
                setToolsMenu((prev) =>
                  prev?.path === pathname ? null : { path: pathname },
                )
              }
              onClose={() => setToolsMenu(null)}
              preferredPanelWidth={preferredHubToolsMenuWidth}
              triggerClassName="font-medium whitespace-nowrap hover:bg-white"
            >
              {toolGroups.map((group, groupIndex) => (
                <div
                  key={group.id}
                  className={cn(
                    groupIndex > 0 && "mt-1 border-t border-gray-100 pt-1",
                  )}
                >
                  <p className="px-3 py-1 text-xs font-semibold uppercase tracking-wide text-gray-500">
                    {t(group.labelKey)}
                  </p>
                  {group.links.map((link) => {
                    const active = hubToolLinkActive(pathname, link.href);
                    return (
                      <Link
                        key={link.href}
                        href={link.href}
                        role="menuitem"
                        tabIndex={-1}
                        aria-current={active ? "page" : undefined}
                        onClick={() => {
                          window.setTimeout(() => setToolsMenu(null), 0);
                        }}
                        className={cn(
                          "block px-3 py-2 text-sm outline-none hover:bg-gray-50 focus-visible:bg-opseu-blue/10 focus-visible:ring-2 focus-visible:ring-opseu-blue/40",
                          active &&
                            "bg-opseu-blue/10 font-semibold text-opseu-dark",
                        )}
                      >
                        {link.label}
                      </Link>
                    );
                  })}
                </div>
              ))}
            </NavDropdown>
          )}
          {modules.map((mod) => {
            const href = mod.href;
            const active = hubModuleActive(pathname, href);
            return (
              <Link
                key={mod.id}
                href={href}
                aria-current={active ? "page" : undefined}
                className={linkClass(
                  cn(
                    mod.requiresMfa && !mfaOk ? "opacity-60" : undefined,
                    active && "bg-white font-semibold text-opseu-dark",
                  ),
                )}
              >
                <Emoji id={mod.emojiId} /> {t(`modules.${mod.nameKey}`)}
              </Link>
            );
          })}
          {mfaEnabled && (
            <Link
              href="/app/mfa"
              aria-current={
                pathname.startsWith("/app/mfa") ? "page" : undefined
              }
              className={linkClass("text-opseu-blue")}
            >
              {mfaOk ? t("mfaOk") : t("mfaRequired")}
            </Link>
          )}
          <Link
            href="/app/send-feedback"
            aria-current={
              pathname.startsWith("/app/send-feedback") ? "page" : undefined
            }
            className={linkClass(
              pathname.startsWith("/app/send-feedback")
                ? "bg-white font-semibold text-opseu-dark"
                : undefined,
            )}
          >
            {t("sendFeedbackLink")}
          </Link>
        </div>

        <button
          ref={toggleRef}
          type="button"
          className="relative z-[80] inline-flex min-h-11 min-w-11 items-center justify-center rounded-md border border-gray-200 text-opseu-dark hover:bg-white lg:hidden"
          aria-expanded={drawerOpen}
          aria-controls={drawerId}
          aria-label={drawerOpen ? t("closeHubMenu") : t("openHubMenu")}
          data-testid="hub-nav-toggle"
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
        <HubNavDrawer
          drawerTop={drawerTop}
          pathname={pathname}
          modules={drawerModules}
          toolGroups={toolGroups}
          toolsActive={toolsActive}
          accountLinks={accountLinks}
          onClose={closeDrawer}
          onCloseAfterNav={closeDrawerAfterNav}
          drawerId={drawerId}
        />
      ) : null}
    </nav>
  );
}
