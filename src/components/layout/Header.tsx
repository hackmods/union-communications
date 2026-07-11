"use client";

import { useEffect, useId, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { Link, usePathname } from "@/i18n/navigation";
import { LanguageToggle } from "./LanguageToggle";
import { DisplaySettingsMenu } from "./DisplaySettingsMenu";
import { BrandLogo } from "@/components/brand/BrandLogo";
import { cn } from "@/lib/utils";

const learnLinks = [
  { href: "/guide", key: "guide" },
  { href: "/guide/materials", key: "materials" },
  { href: "/examples", key: "socialExamples" },
  { href: "/captions", key: "captions" },
  { href: "/guide/crisis", key: "strikeGuide" },
] as const;

const toolLinks = [
  { href: "/tools/logo-builder", key: "logoBuilder" },
  { href: "/tools/board-notice", key: "boardNotice" },
  { href: "/tools/solidarity-poster", key: "solidarityPoster" },
  { href: "/tools/qr-card", key: "qrCard" },
  { href: "/tools/graphic-maker", key: "graphicMaker" },
  { href: "/tools/resizer", key: "resizer" },
  { href: "/tools/quote-card", key: "quoteCard" },
  { href: "/tools/flyer-maker", key: "flyerMaker" },
  { href: "/tools/website-template", key: "websiteTemplate" },
  { href: "/tools/alt-text", key: "altText" },
] as const;

const learnHrefs: Set<string> = new Set(learnLinks.map((l) => l.href));

function linkActive(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`);
}

type NavMenuId = "learn" | "tools";

export function Header() {
  const t = useTranslations("nav");
  const th = useTranslations("hub");
  const pathname = usePathname();
  const [menu, setMenu] = useState<{ id: NavMenuId; path: string } | null>(null);
  const learnRef = useRef<HTMLDivElement>(null);
  const toolsRef = useRef<HTMLDivElement>(null);
  const learnMenuId = useId();
  const toolsMenuId = useId();

  // Hide when the route changes - do not unmount links in onClick (that aborts Next navigation)
  const openMenu = menu?.path === pathname ? menu.id : null;

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

  const toggleMenu = (id: NavMenuId) => {
    setMenu((prev) =>
      prev?.id === id && prev.path === pathname
        ? null
        : { id, path: pathname },
    );
  };

  return (
    <header className="sticky top-0 z-50 border-b border-gray-200 bg-white/95 backdrop-blur">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4 px-4 py-3">
        <Link href="/" className="flex items-center gap-2 font-bold text-opseu-blue">
          <BrandLogo size="sm" />
          <span className="hidden sm:inline">{th("platformName")}</span>
        </Link>

        <nav className="flex flex-wrap items-center gap-1 text-base" aria-label="Main">
          <Link
            href={getStartedHref}
            className={cn(
              "rounded-md px-2 py-1 hover:bg-opseu-blue/5",
              linkActive(pathname, getStartedHref) &&
                "bg-opseu-blue/10 font-semibold text-opseu-blue",
            )}
          >
            {t("getStarted")}
          </Link>

          <div className="relative" ref={learnRef}>
            <button
              type="button"
              className={cn(
                "rounded-md px-2 py-1 hover:bg-opseu-blue/5",
                openMenu === "learn"
                  ? "bg-opseu-blue/10 font-semibold text-opseu-blue"
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
                {learnLinks.map(({ href, key }) => (
                  <Link
                    key={href}
                    href={href}
                    role="menuitem"
                    onClick={() => {
                      // Close after Link has handled the click - sync close unmounts and aborts navigation
                      requestAnimationFrame(() => setMenu(null));
                    }}
                    className={cn(
                      "block px-3 py-2 hover:bg-opseu-blue/5",
                      pathname === href &&
                        "bg-opseu-blue/10 font-semibold text-opseu-blue",
                    )}
                  >
                    {t(key)}
                  </Link>
                ))}
              </div>
            ) : null}
          </div>

          <Link
            href="/brand-kit"
            className={cn(
              "rounded-md px-2 py-1 hover:bg-opseu-blue/5",
              linkActive(pathname, "/brand-kit") &&
                "bg-opseu-blue/10 font-semibold text-opseu-blue",
            )}
          >
            {t("brandKit")}
          </Link>

          <div className="relative" ref={toolsRef}>
            <button
              type="button"
              className={cn(
                "rounded-md px-2 py-1 hover:bg-opseu-blue/5",
                openMenu === "tools"
                  ? "bg-opseu-blue/10 font-semibold text-opseu-blue"
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
                className="absolute right-0 z-50 mt-1 min-w-[220px] rounded-lg border border-gray-200 bg-white py-1 shadow-lg"
              >
                {toolLinks.map(({ href, key }) => (
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
                        "bg-opseu-blue/10 font-semibold text-opseu-blue",
                    )}
                  >
                    {t(key)}
                  </Link>
                ))}
              </div>
            ) : null}
          </div>

          <Link
            href="/app"
            className={cn(
              "ml-1 rounded-lg bg-opseu-blue px-3 py-1.5 font-semibold text-white hover:bg-opseu-dark",
              pathname.startsWith("/app") && "bg-opseu-dark",
            )}
          >
            {th("hubLink")}
          </Link>
        </nav>

        <DisplaySettingsMenu />
        <LanguageToggle />
      </div>
    </header>
  );
}
