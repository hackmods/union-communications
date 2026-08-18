"use client";

import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { cn } from "@/lib/utils";
import { getFocusable } from "@/components/layout/nav/focusables";
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
  const drawerRef = useRef<HTMLDivElement>(null);
  const circlesPanelId = useId();
  const [circlesOpen, setCirclesOpen] = useState(circlesActive);

  useEffect(() => {
    const scrollY = window.scrollY;
    const { body } = document;
    const prev = {
      overflow: body.style.overflow,
      position: body.style.position,
      top: body.style.top,
      paddingRight: body.style.paddingRight,
    };
    const scrollbarGap =
      window.innerWidth - document.documentElement.clientWidth;
    body.style.overflow = "hidden";
    body.style.position = "fixed";
    body.style.top = `-${scrollY}px`;
    body.style.left = "0";
    body.style.right = "0";
    if (scrollbarGap > 0) {
      body.style.paddingRight = `${scrollbarGap}px`;
    }

    const panel = drawerRef.current;
    const focusTimer = window.setTimeout(() => {
      const focusable = panel ? getFocusable(panel) : [];
      focusable[0]?.focus();
    }, 0);

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose();
        return;
      }
      if (event.key !== "Tab" || !panel) return;
      const items = getFocusable(panel);
      if (items.length === 0) return;
      const firstItem = items[0];
      const lastItem = items[items.length - 1];
      const active = document.activeElement as HTMLElement | null;
      if (event.shiftKey) {
        if (active === firstItem || !panel.contains(active)) {
          event.preventDefault();
          lastItem.focus();
        }
      } else if (active === lastItem) {
        event.preventDefault();
        firstItem.focus();
      }
    };

    document.addEventListener("keydown", onKeyDown);
    return () => {
      window.clearTimeout(focusTimer);
      body.style.overflow = prev.overflow;
      body.style.position = prev.position;
      body.style.top = prev.top;
      body.style.left = "";
      body.style.right = "";
      body.style.paddingRight = prev.paddingRight;
      window.scrollTo(0, scrollY);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [onClose]);

  const linkClass = (active: boolean) =>
    cn(
      "flex min-h-11 items-center rounded-md px-3 py-2 hover:bg-white",
      active && "bg-white font-semibold text-opseu-dark",
    );

  return createPortal(
    <div className="lg:hidden" role="presentation">
      <button
        type="button"
        className="fixed inset-x-0 bottom-0 z-[60] bg-black/40"
        style={{ top: drawerTop }}
        aria-label={t("closePortalMenu")}
        onClick={onClose}
      />
      <div
        ref={drawerRef}
        id={drawerId}
        role="dialog"
        aria-modal="true"
        aria-label={t("mobileNav")}
        data-testid="portal-nav-drawer"
        style={{ top: drawerTop }}
        className="fixed bottom-0 right-0 z-[70] flex w-[min(100vw,20rem)] max-w-full flex-col border-l border-gray-200 bg-gray-50 shadow-xl pb-[env(safe-area-inset-bottom)]"
      >
        <nav
          className="min-h-0 flex-1 overflow-y-auto overscroll-contain [-webkit-overflow-scrolling:touch] px-3 py-3 text-base"
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
        </nav>
      </div>
    </div>,
    document.body,
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
