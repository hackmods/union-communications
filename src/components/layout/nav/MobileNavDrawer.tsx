"use client";

import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { DisplaySettingsMenu } from "@/components/layout/DisplaySettingsMenu";
import { LanguageToggle } from "@/components/layout/LanguageToggle";
import { AuthAccountControls } from "@/components/layout/AuthAccountControls";
import { OfficerHubNavLink } from "@/components/layout/OfficerHubNavLink";
import { getFocusable } from "./focusables";
import { cn } from "@/lib/utils";
import { isPublicPrimaryNavActive, PUBLIC_PRIMARY_NAV } from "./nav-config";

export function MobileNavDrawer({
  headerHeight,
  pathname,
  onClose,
  onCloseAfterNav,
  drawerId,
}: {
  headerHeight: number;
  pathname: string;
  onClose: () => void;
  onCloseAfterNav: () => void;
  drawerId: string;
}) {
  const t = useTranslations("nav");
  const drawerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const scrollY = window.scrollY;
    const body = document.body;
    const previous = {
      overflow: body.style.overflow,
      position: body.style.position,
      top: body.style.top,
      left: body.style.left,
      right: body.style.right,
      paddingRight: body.style.paddingRight,
    };
    const scrollbarGap = window.innerWidth - document.documentElement.clientWidth;
    body.style.overflow = "hidden";
    body.style.position = "fixed";
    body.style.top = `-${scrollY}px`;
    body.style.left = "0";
    body.style.right = "0";
    if (scrollbarGap > 0) body.style.paddingRight = `${scrollbarGap}px`;

    const panel = drawerRef.current;
    const focusTimer = window.setTimeout(() => {
      if (panel) getFocusable(panel)[0]?.focus();
    }, 0);
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose();
        return;
      }
      if (event.key !== "Tab" || !panel) return;
      const items = getFocusable(panel);
      if (!items.length) return;
      const first = items[0];
      const last = items[items.length - 1];
      if (event.shiftKey && (document.activeElement === first || !panel.contains(document.activeElement))) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => {
      window.clearTimeout(focusTimer);
      Object.assign(body.style, previous);
      window.scrollTo(0, scrollY);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [onClose]);

  const linkClass = (active: boolean) => {
    return cn(
      "flex min-h-12 items-center rounded-lg px-3 py-2 font-medium text-slate-700 hover:bg-opseu-blue/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-opseu-blue/50",
      active && "bg-opseu-blue/10 font-semibold text-opseu-dark",
    );
  };

  return createPortal(
    <div className="xl:hidden" role="presentation">
      <button
        type="button"
        className="fixed inset-x-0 bottom-0 z-[60] bg-black/40"
        style={{ top: headerHeight }}
        aria-label={t("closeMenu")}
        onClick={onClose}
      />
      <div
        ref={drawerRef}
        id={drawerId}
        role="dialog"
        aria-modal="true"
        aria-label={t("mainNav")}
        data-testid="mobile-nav-drawer"
        style={{ top: headerHeight }}
        className="fixed bottom-0 right-0 z-[70] flex w-[min(100vw,23rem)] max-w-full flex-col border-l border-slate-200 bg-white pb-[env(safe-area-inset-bottom)] shadow-xl"
      >
        <nav className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-4 [-webkit-overflow-scrolling:touch]" aria-label={t("mainNav")}>
          <div className="space-y-1">
            {PUBLIC_PRIMARY_NAV.map((item) => {
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
          </div>
        </nav>

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
              <span aria-hidden="true" className="mr-2">⌕</span>{t("search")}
            </Link>
        </nav>

        <div className="shrink-0 border-t border-slate-200 px-4 pt-3">
          <AuthAccountControls layout="stack" showHubLink={false} onNavigate={onCloseAfterNav} />
        </div>

        <div className="shrink-0 flex flex-wrap items-center gap-3 border-t border-slate-200 px-5 py-4">
          <DisplaySettingsMenu />
          <LanguageToggle />
        </div>
      </div>
    </div>,
    document.body,
  );
}
