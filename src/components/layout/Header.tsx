"use client";

import { useCallback, useId, useLayoutEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { Link, usePathname } from "@/i18n/navigation";
import { LanguageToggle } from "./LanguageToggle";
import { DisplaySettingsMenu } from "./DisplaySettingsMenu";
import { BrandLogo } from "@/components/brand/BrandLogo";
import { PAGE_SHELL } from "@/lib/constants/page-shell";
import { cn } from "@/lib/utils";
import { useBrandStore } from "@/store/brand-store";
import { resolveSiteChromeLogoVariant } from "@/lib/brand/identity-packs";
import { AuthAccountControls } from "./AuthAccountControls";
import { OfficerHubNavLink } from "./OfficerHubNavLink";
import { PlatformOperatorNavDropdown } from "@/components/platform/PlatformOperatorNavDropdown";
import { MobileNavDrawer } from "./nav/MobileNavDrawer";
import { isPublicPrimaryNavActive, PUBLIC_PRIMARY_NAV } from "./nav/nav-config";

export function Header() {
  const t = useTranslations("nav");
  const th = useTranslations("hub");
  const pathname = usePathname();
  const [drawer, setDrawer] = useState<{ path: string } | null>(null);
  const headerRef = useRef<HTMLElement>(null);
  const toggleRef = useRef<HTMLButtonElement>(null);
  const drawerId = useId();
  const [headerHeight, setHeaderHeight] = useState(0);
  const drawerOpen = drawer?.path === pathname;
  const brandKit = useBrandStore((state) => state.brandKit);
  const siteChromeLogoVariant = resolveSiteChromeLogoVariant(brandKit);

  const isActive = (base: string) => pathname === base || pathname.startsWith(`${base}/`);
  const linkClass = (active: boolean) =>
    cn(
      "inline-flex min-h-10 items-center rounded-md px-2.5 py-1.5 text-sm font-medium text-slate-700 transition-colors hover:bg-opseu-blue/5 hover:text-opseu-dark focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-opseu-blue/40",
      active && "bg-opseu-blue/10 font-semibold text-opseu-dark",
    );

  useLayoutEffect(() => {
    const element = headerRef.current;
    if (!element) return;
    const updateHeight = () => {
      const height = Math.ceil(element.getBoundingClientRect().height);
      setHeaderHeight(height);
      document.documentElement.style.setProperty("--site-header-height", `${height}px`);
    };
    updateHeight();
    if (typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(updateHeight);
    observer.observe(element);
    return () => {
      observer.disconnect();
      document.documentElement.style.removeProperty("--site-header-height");
    };
  }, [drawerOpen]);

  const closeDrawer = useCallback(() => {
    setDrawer(null);
    requestAnimationFrame(() => toggleRef.current?.focus());
  }, []);
  const closeDrawerAfterNav = useCallback(() => {
    requestAnimationFrame(() => setDrawer(null));
  }, []);
  const toggleDrawer = () =>
    setDrawer((current) => current?.path === pathname ? null : { path: pathname });

  return (
    <header
      ref={headerRef}
      className={cn(
        "sticky top-0 min-w-0 border-b border-slate-200 bg-white/95 backdrop-blur",
        drawerOpen ? "z-[80]" : "z-50",
      )}
    >
      <div className={cn(PAGE_SHELL.chrome, "flex items-center justify-between gap-3 py-2.5 sm:gap-4 sm:py-3")}>
        <Link
          href="/"
          className="flex min-w-0 items-center gap-2 font-bold text-opseu-blue"
          onClick={drawerOpen ? closeDrawerAfterNav : undefined}
        >
          <BrandLogo
            size="sm"
            variantOverride={siteChromeLogoVariant}
            className="h-9 w-auto max-w-[10rem] shrink-0 object-contain sm:h-10"
          />
          <span className="truncate">{th("platformName")}</span>
        </Link>

        <nav className="hidden flex-wrap items-center gap-1 xl:flex" aria-label={t("mainNav")}>
          {PUBLIC_PRIMARY_NAV.map((item) => {
            const active = isPublicPrimaryNavActive(pathname, item.href);
            return (
              <Link key={item.href} href={item.href} aria-current={active ? "page" : undefined} className={linkClass(active)}>
                {t(item.key)}
              </Link>
            );
          })}
          <OfficerHubNavLink />
        </nav>

        <div className="hidden flex-wrap items-center justify-end gap-2 xl:flex">
          <Link href="/search" aria-current={isActive("/search") ? "page" : undefined} className={linkClass(isActive("/search"))}>
            <span aria-hidden="true" className="mr-1.5">⌕</span>{t("search")}
          </Link>
          <PlatformOperatorNavDropdown />
          <AuthAccountControls layout="inline" showHubLink={false} />
          <DisplaySettingsMenu />
          <LanguageToggle />
        </div>

        <button
          ref={toggleRef}
          type="button"
          className="relative z-[80] inline-flex min-h-11 items-center justify-center gap-2 rounded-md border border-slate-300 px-3 font-semibold text-opseu-dark hover:bg-opseu-blue/5 xl:hidden"
          aria-expanded={drawerOpen}
          aria-controls={drawerId}
          aria-label={drawerOpen ? t("closeMenu") : t("openMenu")}
          data-testid="mobile-nav-toggle"
          onClick={toggleDrawer}
        >
          {drawerOpen ? (
            <span aria-hidden="true" className="text-xl leading-none">×</span>
          ) : (
            <span aria-hidden="true" className="flex flex-col gap-1.5">
              <span className="block h-0.5 w-5 bg-current" />
              <span className="block h-0.5 w-5 bg-current" />
              <span className="block h-0.5 w-5 bg-current" />
            </span>
          )}
          <span>{drawerOpen ? t("closeMenu") : t("menu")}</span>
        </button>
      </div>

      {drawerOpen ? (
        <MobileNavDrawer
          headerHeight={headerHeight}
          pathname={pathname}
          onClose={closeDrawer}
          onCloseAfterNav={closeDrawerAfterNav}
          drawerId={drawerId}
        />
      ) : null}
    </header>
  );
}
