"use client";

import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { signOut } from "next-auth/react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { cn } from "@/lib/utils";
import { getFocusable } from "@/components/layout/nav/focusables";
import { HubContextSwitcher } from "@/components/hub/HubContextSwitcher";
import {
  hubModuleActive,
  hubToolLinkActive,
  type HubToolGroup,
  type HubToolLink,
} from "@/components/hub/hub-nav-model";
import { Emoji } from "@/components/ui/Emoji";
import type { EmojiId } from "@/lib/constants/emoji";

export type HubDrawerModule = {
  id: string;
  href: string;
  label: string;
  emojiId: EmojiId;
  dimmed: boolean;
};

export type HubDrawerAccountLink = {
  href: string;
  label: string;
  className?: string;
};

type HubNavDrawerProps = {
  drawerTop: number;
  pathname: string;
  modules: HubDrawerModule[];
  toolGroups: HubToolGroup[];
  toolsActive: boolean;
  accountLinks: HubDrawerAccountLink[];
  onClose: () => void;
  onCloseAfterNav: () => void;
  drawerId: string;
};

export function HubNavDrawer({
  drawerTop,
  pathname,
  modules,
  toolGroups,
  toolsActive,
  accountLinks,
  onClose,
  onCloseAfterNav,
  drawerId,
}: HubNavDrawerProps) {
  const t = useTranslations("hub");
  const drawerRef = useRef<HTMLDivElement>(null);
  const toolsPanelId = useId();
  const [toolsOpen, setToolsOpen] = useState(toolsActive);

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
        aria-label={t("closeHubMenu")}
        onClick={onClose}
      />
      <div
        ref={drawerRef}
        id={drawerId}
        role="dialog"
        aria-modal="true"
        aria-label={t("mobileNav")}
        data-testid="hub-nav-drawer"
        style={{ top: drawerTop }}
        className="fixed bottom-0 right-0 z-[70] flex w-[min(100vw,20rem)] max-w-full flex-col border-l border-gray-200 bg-gray-50 shadow-xl pb-[env(safe-area-inset-bottom)]"
      >
        <nav
          className="min-h-0 flex-1 overflow-y-auto overscroll-contain [-webkit-overflow-scrolling:touch] px-3 py-3 text-base"
          aria-label={t("mobileNav")}
        >
          <div className="mb-3 rounded-md bg-white px-3 py-3">
            <HubContextSwitcher variant="drawer" />
          </div>

          {modules.map((mod) => {
            const active = hubModuleActive(pathname, mod.href);
            return (
              <Link
                key={mod.id}
                href={mod.href}
                onClick={onCloseAfterNav}
                aria-current={active ? "page" : undefined}
                className={cn(linkClass(active), mod.dimmed && "opacity-60")}
              >
                <Emoji id={mod.emojiId} />
                <span className="ml-2">{mod.label}</span>
              </Link>
            );
          })}

          {toolGroups.length > 0 ? (
            <HubAccordion
              label={t("toolsMenu")}
              open={toolsOpen}
              panelId={toolsPanelId}
              active={toolsActive}
              onToggle={() => setToolsOpen((v) => !v)}
            >
              {toolGroups.map((group) => (
                <div key={group.id} className="mt-1">
                  <p className="px-3 py-1 text-xs font-semibold uppercase tracking-wide text-gray-500">
                    {t(group.labelKey)}
                  </p>
                  {group.links.map((link) => (
                    <HubDrawerToolLink
                      key={link.href}
                      link={link}
                      pathname={pathname}
                      onNavigate={onCloseAfterNav}
                      className={linkClass}
                    />
                  ))}
                </div>
              ))}
            </HubAccordion>
          ) : null}

          <div className="mt-4 border-t border-gray-200 pt-3">
            {accountLinks.map((link) => {
              const active = hubModuleActive(pathname, link.href);
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={onCloseAfterNav}
                  aria-current={active ? "page" : undefined}
                  className={cn(linkClass(active), link.className)}
                >
                  {link.label}
                </Link>
              );
            })}
            <button
              type="button"
              className={cn(linkClass(false), "w-full text-left text-opseu-dark")}
              onClick={() => {
                onCloseAfterNav();
                void signOut({ callbackUrl: "/" });
              }}
            >
              {t("signOut")}
            </button>
          </div>
        </nav>
      </div>
    </div>,
    document.body,
  );
}

function HubDrawerToolLink({
  link,
  pathname,
  onNavigate,
  className,
}: {
  link: HubToolLink;
  pathname: string;
  onNavigate: () => void;
  className: (active: boolean) => string;
}) {
  const active = hubToolLinkActive(pathname, link.href);
  return (
    <Link
      href={link.href}
      onClick={onNavigate}
      aria-current={active ? "page" : undefined}
      className={className(active)}
    >
      {link.label}
    </Link>
  );
}

function HubAccordion({
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
