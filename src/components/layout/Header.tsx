"use client";

import { useEffect, useId, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { Link, usePathname } from "@/i18n/navigation";
import { LanguageToggle } from "./LanguageToggle";
import { DisplaySettingsMenu } from "./DisplaySettingsMenu";
import { BrandLogo } from "@/components/brand/BrandLogo";
import { PAGE_SHELL } from "@/lib/constants/page-shell";
import { cn } from "@/lib/utils";
import { isOfficerHubPublic } from "@/lib/features/officer-hub-public";

const learnGroups = [
  {
    labelKey: "learnGroupGuides" as const,
    links: [
      { href: "/guide/resources", key: "resources" as const },
      { href: "/guide", key: "guide" as const },
      { href: "/guide/crisis", key: "strikeGuide" as const },
      { href: "/guide/photo-consent", key: "photoConsent" as const },
    ],
  },
  {
    labelKey: "learnGroupChannels" as const,
    links: [
      { href: "/guide/print", key: "printGuide" as const },
      { href: "/guide/union-boards", key: "unionBoardsGuide" as const },
      { href: "/guide/website", key: "websiteGuide" as const },
    ],
  },
  {
    labelKey: "learnGroupLibraries" as const,
    links: [
      { href: "/examples", key: "socialExamples" as const },
      { href: "/captions", key: "captions" as const },
    ],
  },
] as const;

const toolGroups = [
  {
    labelKey: "toolsGroupBrand" as const,
    links: [
      { href: "/tools/logo-builder", key: "logoBuilder" as const },
      { href: "/tools/resizer", key: "resizer" as const },
      { href: "/tools/document-generator", key: "documentGenerator" as const },
    ],
  },
  {
    labelKey: "toolsGroupBoards" as const,
    links: [
      { href: "/tools/board-banner", key: "boardBanner" as const },
      { href: "/tools/board-notice", key: "boardNotice" as const },
      { href: "/tools/solidarity-poster", key: "solidarityPoster" as const },
      { href: "/tools/qr-board", key: "qrBoard" as const },
      { href: "/tools/qr-card", key: "qrCard" as const },
    ],
  },
  {
    labelKey: "toolsGroupPrint" as const,
    links: [{ href: "/tools/flyer-maker", key: "flyerMaker" as const }],
  },
  {
    labelKey: "toolsGroupSocialWeb" as const,
    links: [
      { href: "/tools/graphic-maker", key: "graphicMaker" as const },
      { href: "/tools/quote-card", key: "quoteCard" as const },
      { href: "/tools/meeting-background", key: "meetingBackground" as const },
      { href: "/tools/website-template", key: "websiteTemplate" as const },
      { href: "/tools/alt-text", key: "altText" as const },
    ],
  },
] as const;

const learnHrefs: Set<string> = new Set(
  learnGroups.flatMap((g) => g.links.map((l) => l.href)),
);

function linkActive(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`);
}

function getFocusable(container: HTMLElement): HTMLElement[] {
  const nodes = container.querySelectorAll<HTMLElement>(
    'a[href], button:not([disabled]), textarea, input, select, [tabindex]:not([tabindex="-1"])',
  );
  return Array.from(nodes).filter((el) => !el.hasAttribute("disabled"));
}

type NavMenuId = "learn" | "tools";

export function Header() {
  const t = useTranslations("nav");
  const th = useTranslations("hub");
  const pathname = usePathname();
  const [menu, setMenu] = useState<{ id: NavMenuId; path: string } | null>(null);
  const [drawer, setDrawer] = useState<{ path: string } | null>(null);
  const learnRef = useRef<HTMLDivElement>(null);
  const toolsRef = useRef<HTMLDivElement>(null);
  const drawerRef = useRef<HTMLDivElement>(null);
  const toggleRef = useRef<HTMLButtonElement>(null);
  const learnMenuId = useId();
  const toolsMenuId = useId();
  const drawerId = useId();

  // Hide when the route changes - do not unmount links in onClick (that aborts Next navigation)
  const openMenu = menu?.path === pathname ? menu.id : null;
  const drawerOpen = drawer?.path === pathname;

  const getStartedHref = "/guide/social-media-plan";
  const learnActive =
    learnHrefs.has(pathname) ||
    (pathname.startsWith("/guide/") && pathname !== getStartedHref);
  const toolsActive = pathname.startsWith("/tools/");

  useEffect(() => {
    if (!openMenu) return;

    const onPointerDown = (event: PointerEvent) => {
      const target = event.target as Node;
      const inLearn = learnRef.current?.contains(target);
      const inTools = toolsRef.current?.contains(target);
      if (!inLearn && !inTools) setMenu(null);
    };

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setMenu(null);
    };

    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [openMenu]);

  useEffect(() => {
    if (!drawerOpen) return;

    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const panel = drawerRef.current;
    const toggleButton = toggleRef.current;
    const focusable = panel ? getFocusable(panel) : [];
    focusable[0]?.focus();

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        setDrawer(null);
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
      document.body.style.overflow = prevOverflow;
      document.removeEventListener("keydown", onKeyDown);
      toggleButton?.focus();
    };
  }, [drawerOpen]);

  const toggleMenu = (id: NavMenuId) => {
    setMenu((prev) =>
      prev?.id === id && prev.path === pathname
        ? null
        : { id, path: pathname },
    );
  };

  const closeDrawer = () => setDrawer(null);
  const toggleDrawer = () =>
    setDrawer((prev) => (prev?.path === pathname ? null : { path: pathname }));

  const navLinkClass = (active: boolean) =>
    cn(
      "rounded-md px-2 py-1 hover:bg-opseu-blue/5",
      active && "bg-opseu-blue/10 font-semibold text-opseu-dark",
    );

  const drawerLinkClass = (active: boolean) =>
    cn(
      "flex min-h-11 items-center rounded-md px-3 py-2 hover:bg-opseu-blue/5",
      active && "bg-opseu-blue/10 font-semibold text-opseu-dark",
    );

  return (
    <header className="sticky top-0 z-50 border-b border-gray-200 bg-white/95 backdrop-blur">
      <div
        className={cn(
          PAGE_SHELL.chrome,
          "flex items-center justify-between gap-4 py-3",
        )}
      >
        <Link href="/" className="flex items-center gap-2 font-bold text-opseu-blue">
          <BrandLogo size="sm" />
          <span className="hidden sm:inline">{th("platformName")}</span>
        </Link>

        {/* Desktop nav — lg+ (smoke tests target aria-label="Main") */}
        <nav
          className="hidden flex-wrap items-center gap-1 text-base lg:flex"
          aria-label="Main"
        >
          <Link
            href={getStartedHref}
            className={navLinkClass(linkActive(pathname, getStartedHref))}
          >
            {t("getStarted")}
          </Link>

          <div className="relative" ref={learnRef}>
            <button
              type="button"
              className={cn(
                "rounded-md px-2 py-1 hover:bg-opseu-blue/5",
                openMenu === "learn"
                  ? "bg-opseu-blue/10 font-semibold text-opseu-dark"
                  : learnActive && "font-semibold text-opseu-blue",
              )}
              aria-expanded={openMenu === "learn"}
              aria-haspopup="menu"
              aria-controls={learnMenuId}
              onClick={() => toggleMenu("learn")}
            >
              {t("learn")} ▾
            </button>
            {openMenu === "learn" ? (
              <div
                id={learnMenuId}
                role="menu"
                className="absolute left-0 z-50 mt-1 min-w-[220px] rounded-lg border border-gray-200 bg-white py-1 shadow-lg"
              >
                {learnGroups.map((group, groupIndex) => (
                  <div
                    key={group.labelKey}
                    className={cn(groupIndex > 0 && "mt-1 border-t border-gray-100 pt-1")}
                  >
                    <p className="px-3 py-1 text-xs font-semibold uppercase tracking-wide text-gray-500">
                      {t(group.labelKey)}
                    </p>
                    {group.links.map(({ href, key }) => (
                      <Link
                        key={href}
                        href={href}
                        role="menuitem"
                        onClick={() => {
                          requestAnimationFrame(() => setMenu(null));
                        }}
                        className={cn(
                          "block px-3 py-2 hover:bg-opseu-blue/5",
                          pathname === href &&
                            "bg-opseu-blue/10 font-semibold text-opseu-dark",
                        )}
                      >
                        {t(key)}
                      </Link>
                    ))}
                  </div>
                ))}
              </div>
            ) : null}
          </div>

          <Link
            href="/brand-kit"
            className={navLinkClass(linkActive(pathname, "/brand-kit"))}
          >
            {t("brandKit")}
          </Link>

          <div className="relative" ref={toolsRef}>
            <button
              type="button"
              className={cn(
                "rounded-md px-2 py-1 hover:bg-opseu-blue/5",
                openMenu === "tools"
                  ? "bg-opseu-blue/10 font-semibold text-opseu-dark"
                  : toolsActive && "font-semibold text-opseu-blue",
              )}
              aria-expanded={openMenu === "tools"}
              aria-haspopup="menu"
              aria-controls={toolsMenuId}
              onClick={() => toggleMenu("tools")}
            >
              {t("tools")} ▾
            </button>
            {openMenu === "tools" ? (
              <div
                id={toolsMenuId}
                role="menu"
                className="absolute right-0 z-50 mt-1 max-h-[min(80vh,36rem)] min-w-[240px] overflow-y-auto rounded-lg border border-gray-200 bg-white py-1 shadow-lg"
              >
                {toolGroups.map((group, groupIndex) => (
                  <div
                    key={group.labelKey}
                    className={cn(
                      groupIndex > 0 && "mt-1 border-t border-gray-100 pt-1",
                    )}
                  >
                    <p className="px-3 py-1 text-xs font-semibold uppercase tracking-wide text-gray-500">
                      {t(group.labelKey)}
                    </p>
                    {group.links.map(({ href, key }) => (
                      <Link
                        key={href}
                        href={href}
                        role="menuitem"
                        onClick={() => {
                          requestAnimationFrame(() => setMenu(null));
                        }}
                        className={cn(
                          "block px-3 py-2 hover:bg-opseu-blue/5",
                          linkActive(pathname, href) &&
                            "bg-opseu-blue/10 font-semibold text-opseu-dark",
                        )}
                      >
                        {t(key)}
                      </Link>
                    ))}
                  </div>
                ))}
              </div>
            ) : null}
          </div>

          {isOfficerHubPublic() ? (
            <Link
              href="/app"
              className={cn(
                "ml-1 rounded-lg bg-opseu-blue px-3 py-1.5 font-semibold text-white hover:bg-opseu-dark",
                pathname.startsWith("/app") && "bg-opseu-dark",
              )}
            >
              {th("hubLink")}
            </Link>
          ) : null}
        </nav>

        <div className="hidden items-center gap-2 lg:flex">
          <DisplaySettingsMenu />
          <LanguageToggle />
        </div>

        <button
          ref={toggleRef}
          type="button"
          className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-md border border-gray-200 text-opseu-dark hover:bg-opseu-blue/5 lg:hidden"
          aria-expanded={drawerOpen}
          aria-controls={drawerId}
          aria-label={drawerOpen ? t("closeMenu") : t("openMenu")}
          data-testid="mobile-nav-toggle"
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
        <div className="lg:hidden" role="presentation">
          <button
            type="button"
            className="fixed inset-0 z-40 bg-black/40"
            aria-label={t("closeMenu")}
            onClick={closeDrawer}
          />
          <div
            ref={drawerRef}
            id={drawerId}
            role="dialog"
            aria-modal="true"
            aria-label={t("openMenu")}
            data-testid="mobile-nav-drawer"
            className="fixed inset-y-0 right-0 z-50 flex w-[min(100vw,20rem)] flex-col border-l border-gray-200 bg-white shadow-xl"
          >
            <div className="flex items-center justify-between border-b border-gray-200 px-4 py-3">
              <p className="font-semibold text-opseu-dark">{th("platformName")}</p>
              <button
                type="button"
                className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-md hover:bg-opseu-blue/5"
                aria-label={t("closeMenu")}
                onClick={closeDrawer}
              >
                <span aria-hidden="true" className="text-xl leading-none">
                  ×
                </span>
              </button>
            </div>

            <nav
              className="flex-1 overflow-y-auto px-3 py-4 text-base"
              aria-label={t("mobileNav")}
            >
              <Link
                href={getStartedHref}
                onClick={closeDrawer}
                className={drawerLinkClass(linkActive(pathname, getStartedHref))}
              >
                {t("getStarted")}
              </Link>

              <div className="mt-4">
                <p className="px-3 text-xs font-semibold uppercase tracking-wide text-gray-500">
                  {t("learn")}
                </p>
                {learnGroups.map((group) => (
                  <div key={group.labelKey} className="mt-2">
                    <p className="px-3 py-1 text-xs font-medium text-gray-500">
                      {t(group.labelKey)}
                    </p>
                    {group.links.map(({ href, key }) => (
                      <Link
                        key={href}
                        href={href}
                        onClick={closeDrawer}
                        className={drawerLinkClass(pathname === href)}
                      >
                        {t(key)}
                      </Link>
                    ))}
                  </div>
                ))}
              </div>

              <Link
                href="/brand-kit"
                onClick={closeDrawer}
                className={cn("mt-4", drawerLinkClass(linkActive(pathname, "/brand-kit")))}
              >
                {t("brandKit")}
              </Link>

              <div className="mt-4">
                <p className="px-3 text-xs font-semibold uppercase tracking-wide text-gray-500">
                  {t("tools")}
                </p>
                {toolGroups.map((group) => (
                  <div key={group.labelKey} className="mt-2">
                    <p className="px-3 py-1 text-xs font-medium text-gray-500">
                      {t(group.labelKey)}
                    </p>
                    {group.links.map(({ href, key }) => (
                      <Link
                        key={href}
                        href={href}
                        onClick={closeDrawer}
                        className={drawerLinkClass(linkActive(pathname, href))}
                      >
                        {t(key)}
                      </Link>
                    ))}
                  </div>
                ))}
              </div>

              {isOfficerHubPublic() ? (
                <Link
                  href="/app"
                  onClick={closeDrawer}
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
        </div>
      ) : null}
    </header>
  );
}
