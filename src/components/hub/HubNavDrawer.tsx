"use client";

import { useId, useState, type ReactNode } from "react";
import { signOut } from "next-auth/react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { cn } from "@/lib/utils";
import { MobileSheet } from "@/components/layout/nav/MobileSheet";
import { MobileSiteSection } from "@/components/layout/nav/MobileSiteSection";
import { HubContextSwitcher } from "@/components/hub/HubContextSwitcher";
import {
  hubModuleActive,
  hubToolLinkActive,
  type HubToolGroup,
  type HubToolLink,
} from "@/components/hub/hub-nav-model";
import { Emoji } from "@/components/ui/Emoji";
import type { EmojiId } from "@/lib/constants/emoji";
import { PlatformOperatorAccountLinks } from "@/components/platform/PlatformOperatorAccountLinks";

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
  /** Promoted when the module strip is empty (president setup chrome). */
  setupLinks?: HubToolLink[];
  toolGroups: HubToolGroup[];
  toolsActive: boolean;
  accountLinks: HubDrawerAccountLink[];
  mfaEnabled?: boolean;
  mfaOk?: boolean;
  onClose: () => void;
  onCloseAfterNav: () => void;
  drawerId: string;
  compactDashboard?: boolean;
};

export function HubNavDrawer({
  drawerTop,
  pathname,
  modules,
  setupLinks = [],
  toolGroups,
  toolsActive,
  accountLinks,
  mfaEnabled = false,
  mfaOk = false,
  onClose,
  onCloseAfterNav,
  drawerId,
  compactDashboard = false,
}: HubNavDrawerProps) {
  const t = useTranslations("hub");
  const toolsPanelId = useId();
  const [toolsOpen, setToolsOpen] = useState(toolsActive);

  const linkClass = (active: boolean) =>
    cn(
      "flex min-h-11 items-center rounded-md px-3 py-2 hover:bg-white",
      active && "bg-white font-semibold text-opseu-dark",
    );

  return (
    <MobileSheet
      top={drawerTop}
      drawerId={drawerId}
      label={t("mobileNav")}
      closeLabel={t("closeHubMenu")}
      testId="hub-nav-drawer"
      visibilityClassName={compactDashboard ? "2xl:hidden" : "lg:hidden"}
      panelClassName="max-w-[min(100vw,20rem)] border-gray-200 bg-gray-50"
      onClose={onClose}
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

        {setupLinks.map((link) => {
          const active = hubToolLinkActive(pathname, link.href);
          return (
            <Link
              key={link.href}
              href={link.href}
              onClick={onCloseAfterNav}
              aria-current={active ? "page" : undefined}
              className={linkClass(active)}
            >
              {link.label}
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
          {mfaEnabled ? (
            <Link
              href="/app/mfa"
              onClick={onCloseAfterNav}
              aria-current={
                pathname.startsWith("/app/mfa") ? "page" : undefined
              }
              className={cn(
                "mb-2 inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-medium",
                mfaOk
                  ? "border-emerald-200 bg-emerald-50 text-emerald-900"
                  : "border-amber-200 bg-amber-50 text-amber-950",
              )}
            >
              {mfaOk ? t("mfaOk") : t("mfaRequired")}
            </Link>
          ) : null}
          {accountLinks.map((link) => {
            const active = hubModuleActive(pathname, link.href);
            return (
              <div key={link.href}>
                <Link
                  href={link.href}
                  onClick={onCloseAfterNav}
                  aria-current={active ? "page" : undefined}
                  className={cn(linkClass(active), link.className)}
                >
                  {link.label}
                </Link>
                {link.href === "/app/profile" ? (
                  <PlatformOperatorAccountLinks
                    layout="stack"
                    onNavigate={onCloseAfterNav}
                  />
                ) : null}
              </div>
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
