"use client";

import { useCallback, useId, useLayoutEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { Link, usePathname } from "@/i18n/navigation";
import { LanguageToggle } from "./LanguageToggle";
import { DisplaySettingsMenu } from "./DisplaySettingsMenu";
import { BrandLogo } from "@/components/brand/BrandLogo";
import { PAGE_SHELL } from "@/lib/constants/page-shell";
import { cn } from "@/lib/utils";
import { isOfficerHubPublic } from "@/lib/features/officer-hub-public";
import { useBrandStore } from "@/store/brand-store";
import { isBrandThemeEstablished } from "@/lib/utils/brand-theme";
import {
  getStartedHref as resolveGetStartedHref,
  isLearnPath,
  isToolsPath,
  linkActive,
} from "./nav/nav-config";
import { NavDropdown } from "./nav/NavDropdown";
import { LearnMenuContent, ToolsMegaMenuContent } from "./nav/MenuContents";
import { MobileNavDrawer } from "./nav/MobileNavDrawer";

type NavMenuId = "learn" | "tools";

export function Header() {
  const t = useTranslations("nav");
  const th = useTranslations("hub");
  const pathname = usePathname();
  const [menu, setMenu] = useState<{ id: NavMenuId; path: string } | null>(
    null,
  );
  const [drawer, setDrawer] = useState<{ path: string } | null>(null);
  const headerRef = useRef<HTMLElement>(null);
  const toggleRef = useRef<HTMLButtonElement>(null);
  const drawerId = useId();
  const [headerHeight, setHeaderHeight] = useState(0);

  const openMenu = menu?.path === pathname ? menu.id : null;
  const drawerOpen = drawer?.path === pathname;

  const brandKit = useBrandStore((s) => s.brandKit);
  const onboardingComplete = useBrandStore((s) => s.onboardingComplete);
  const themeEstablished = isBrandThemeEstablished(
    brandKit,
    onboardingComplete,
  );
  const startedHref = resolveGetStartedHref(themeEstablished);
  const learnActive = isLearnPath(pathname);
  const toolsActive = isToolsPath(pathname);

  useLayoutEffect(() => {
    const el = headerRef.current;
    if (!el) return;

    const update = () => {
      setHeaderHeight(Math.ceil(el.getBoundingClientRect().height));
    };
    update();
    if (typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(update);
    observer.observe(el);
    return () => observer.disconnect();
  }, [drawerOpen]);

  const closeMenu = useCallback(() => setMenu(null), []);
  const toggleMenu = (id: NavMenuId) => {
    setMenu((prev) =>
      prev?.id === id && prev.path === pathname
        ? null
        : { id, path: pathname },
    );
  };

  const closeDrawer = useCallback(() => {
    setDrawer(null);
    requestAnimationFrame(() => toggleRef.current?.focus());
  }, []);
  const closeDrawerAfterNav = useCallback(() => {
    requestAnimationFrame(() => setDrawer(null));
  }, []);
  const toggleDrawer = () =>
    setDrawer((prev) => (prev?.path === pathname ? null : { path: pathname }));

  const navLinkClass = (active: boolean) =>
    cn(
      "rounded-md px-2 py-1 transition-colors duration-150 hover:bg-opseu-blue/5",
      active && "bg-opseu-blue/10 font-semibold text-opseu-dark",
    );

  const getStartedActive = linkActive(pathname, startedHref);

  return (
    <header
      ref={headerRef}
      className={cn(
        "sticky top-0 border-b border-gray-200 bg-white/95 backdrop-blur",
        drawerOpen ? "z-[80]" : "z-50",
      )}
    >
      <div
        className={cn(
          PAGE_SHELL.chrome,
          "flex items-center justify-between gap-4 py-3",
        )}
      >
        <Link
          href="/"
          className="flex min-w-0 items-center gap-2 font-bold text-opseu-blue"
          onClick={drawerOpen ? closeDrawerAfterNav : undefined}
        >
          <BrandLogo size="sm" />
          <span className="truncate">{th("platformName")}</span>
        </Link>

        <nav
          className="hidden flex-wrap items-center gap-1 text-base lg:flex"
          aria-label="Main"
        >
          <Link
            href={startedHref}
            aria-current={getStartedActive ? "page" : undefined}
            className={cn(
              "rounded-md border border-opseu-blue/40 px-2.5 py-1 font-semibold text-opseu-blue transition-colors duration-150 hover:bg-opseu-blue/5",
              getStartedActive &&
                "border-opseu-blue bg-opseu-blue/10 text-opseu-dark",
            )}
          >
            {t("getStarted")}
          </Link>

          <NavDropdown
            label={t("guides")}
            open={openMenu === "learn"}
            active={learnActive}
            onToggle={() => toggleMenu("learn")}
            onClose={closeMenu}
          >
            <LearnMenuContent pathname={pathname} onNavigate={closeMenu} />
          </NavDropdown>

          <Link
            href="/brand-kit"
            aria-current={
              linkActive(pathname, "/brand-kit") ? "page" : undefined
            }
            className={navLinkClass(linkActive(pathname, "/brand-kit"))}
          >
            {t("brandKit")}
          </Link>

          <NavDropdown
            label={t("tools")}
            open={openMenu === "tools"}
            active={toolsActive}
            onToggle={() => toggleMenu("tools")}
            onClose={closeMenu}
            align="right"
            panelClassName="max-h-[min(80vh,40rem)] overflow-y-auto"
          >
            <ToolsMegaMenuContent pathname={pathname} onNavigate={closeMenu} />
          </NavDropdown>

          {isOfficerHubPublic() ? (
            <Link
              href="/app"
              aria-current={
                pathname.startsWith("/app") ? "page" : undefined
              }
              className={cn(
                "ml-2 rounded-lg bg-opseu-blue px-3 py-1.5 font-semibold text-white transition-colors duration-150 hover:bg-opseu-dark",
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
          className="relative z-[80] inline-flex min-h-11 min-w-11 items-center justify-center rounded-md border border-gray-200 text-opseu-dark hover:bg-opseu-blue/5 lg:hidden"
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
        <MobileNavDrawer
          headerHeight={headerHeight}
          pathname={pathname}
          getStartedHref={startedHref}
          learnActive={learnActive}
          toolsActive={toolsActive}
          onClose={closeDrawer}
          onCloseAfterNav={closeDrawerAfterNav}
          drawerId={drawerId}
        />
      ) : null}
    </header>
  );
}
