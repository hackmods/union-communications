"use client";

import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { BrandLogo } from "@/components/brand/BrandLogo";
import { DisplaySettingsMenu } from "@/components/layout/DisplaySettingsMenu";
import { LanguageToggle } from "@/components/layout/LanguageToggle";
import { isOfficerHubPublic } from "@/lib/features/officer-hub-public";
import { cn } from "@/lib/utils";
import { getFocusable } from "./focusables";
import {
  learnGroups,
  linkActive,
  toolGroups,
  type NavGroup,
  type NavLinkKey,
} from "./nav-config";

type AccordionId = "learn" | "tools";

type MobileNavDrawerProps = {
  headerHeight: number;
  pathname: string;
  getStartedHref: string;
  learnActive: boolean;
  toolsActive: boolean;
  onClose: () => void;
  onCloseAfterNav: () => void;
  drawerId: string;
};

/** Mount only while open (parent should conditional-render). */
export function MobileNavDrawer({
  headerHeight,
  pathname,
  getStartedHref: startedHref,
  learnActive,
  toolsActive,
  onClose,
  onCloseAfterNav,
  drawerId,
}: MobileNavDrawerProps) {
  const t = useTranslations("nav");
  const th = useTranslations("hub");
  const drawerRef = useRef<HTMLDivElement>(null);

  const [accordion, setAccordion] = useState<AccordionId | null>(() => {
    if (toolsActive) return "tools";
    if (learnActive) return "learn";
    return null;
  });

  const learnPanelId = useId();
  const toolsPanelId = useId();

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

  const drawerLinkClass = (active: boolean) =>
    cn(
      "flex min-h-11 items-center rounded-md px-3 py-2 hover:bg-opseu-blue/5",
      active && "bg-opseu-blue/10 font-semibold text-opseu-dark",
    );

  const toggleAccordion = (id: AccordionId) => {
    setAccordion((prev) => (prev === id ? null : id));
  };

  return createPortal(
    <div className="lg:hidden" role="presentation">
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
        aria-label={t("mobileNav")}
        data-testid="mobile-nav-drawer"
        style={{ top: headerHeight }}
        className="fixed bottom-0 right-0 z-[70] flex w-[min(100vw,20rem)] max-w-full flex-col border-l border-gray-200 bg-white shadow-xl pb-[env(safe-area-inset-bottom)]"
      >
        <nav
          className="min-h-0 flex-1 overflow-y-auto overscroll-contain [-webkit-overflow-scrolling:touch] px-3 py-3 text-base"
          aria-label={t("mobileNav")}
        >
          <Link
            href="/"
            onClick={onCloseAfterNav}
            className="mb-4 flex items-center gap-2 rounded-md px-3 py-2 font-bold text-opseu-blue hover:bg-opseu-blue/5"
          >
            <BrandLogo size="sm" />
            <span>{th("platformName")}</span>
          </Link>

          <Link
            href={startedHref}
            onClick={onCloseAfterNav}
            aria-current={
              linkActive(pathname, startedHref) ? "page" : undefined
            }
            className={cn(
              drawerLinkClass(linkActive(pathname, startedHref)),
              "border border-opseu-blue/30 font-semibold text-opseu-blue",
            )}
          >
            {t("getStarted")}
          </Link>

          <AccordionSection
            label={t("learn")}
            open={accordion === "learn"}
            panelId={learnPanelId}
            active={learnActive}
            onToggle={() => toggleAccordion("learn")}
          >
            {learnGroups.map((group) => (
              <MobileGroup
                key={group.labelKey}
                group={group}
                pathname={pathname}
                onNavigate={onCloseAfterNav}
                linkClass={drawerLinkClass}
                label={t(group.labelKey)}
                linkLabel={(key) => t(key)}
              />
            ))}
          </AccordionSection>

          <Link
            href="/brand-kit"
            onClick={onCloseAfterNav}
            aria-current={
              linkActive(pathname, "/brand-kit") ? "page" : undefined
            }
            className={cn(
              "mt-2",
              drawerLinkClass(linkActive(pathname, "/brand-kit")),
            )}
          >
            {t("brandKit")}
          </Link>

          <AccordionSection
            label={t("tools")}
            open={accordion === "tools"}
            panelId={toolsPanelId}
            active={toolsActive}
            onToggle={() => toggleAccordion("tools")}
          >
            {toolGroups.map((group) => (
              <MobileGroup
                key={group.labelKey}
                group={group}
                pathname={pathname}
                onNavigate={onCloseAfterNav}
                linkClass={drawerLinkClass}
                label={t(group.labelKey)}
                linkLabel={(key) => t(key)}
              />
            ))}
            <Link
              href="/tools"
              onClick={onCloseAfterNav}
              aria-current={pathname === "/tools" ? "page" : undefined}
              className={cn(
                "mt-1 font-semibold text-opseu-blue",
                drawerLinkClass(pathname === "/tools"),
              )}
            >
              {t("allTools")}
            </Link>
          </AccordionSection>

          {isOfficerHubPublic() ? (
            <Link
              href="/app"
              onClick={onCloseAfterNav}
              aria-current={
                pathname.startsWith("/app") ? "page" : undefined
              }
              className={cn(
                "mt-4 flex min-h-11 items-center justify-center rounded-lg bg-opseu-blue px-3 py-2 font-semibold text-white hover:bg-opseu-dark",
                pathname.startsWith("/app") && "bg-opseu-dark",
              )}
            >
              {th("hubLink")}
            </Link>
          ) : null}

          <div className="mt-6 flex flex-wrap items-center gap-3 border-t border-gray-100 px-1 pt-4">
            <DisplaySettingsMenu />
            <LanguageToggle />
          </div>
        </nav>
      </div>
    </div>,
    document.body,
  );
}

function AccordionSection({
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
          "flex min-h-11 w-full items-center justify-between rounded-md px-3 py-2 text-left hover:bg-opseu-blue/5",
          (open || active) && "font-semibold text-opseu-dark",
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

function MobileGroup({
  group,
  pathname,
  onNavigate,
  linkClass,
  label,
  linkLabel,
}: {
  group: NavGroup;
  pathname: string;
  onNavigate: () => void;
  linkClass: (active: boolean) => string;
  label: string;
  linkLabel: (key: NavLinkKey) => string;
}) {
  return (
    <div className="mt-1">
      <p className="px-3 py-1 text-xs font-medium text-gray-500">{label}</p>
      {group.links.map(({ href, key }) => {
        const active = linkActive(pathname, href);
        return (
          <Link
            key={href}
            href={href}
            onClick={onNavigate}
            aria-current={active ? "page" : undefined}
            className={linkClass(active)}
          >
            {linkLabel(key)}
          </Link>
        );
      })}
    </div>
  );
}
