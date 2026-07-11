"use client";

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

export function Header() {
  const t = useTranslations("nav");
  const th = useTranslations("hub");
  const pathname = usePathname();
  const getStartedHref = "/guide/social-media-plan";
  const learnActive =
    learnHrefs.has(pathname) ||
    (pathname.startsWith("/guide/") && pathname !== getStartedHref);
  const toolsActive = pathname.startsWith("/tools/");

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

          <details className="relative">
            <summary
              className={cn(
                "cursor-pointer list-none rounded-md px-2 py-1 hover:bg-opseu-blue/5 [&::-webkit-details-marker]:hidden",
                learnActive && "bg-opseu-blue/10 font-semibold text-opseu-blue",
              )}
            >
              {t("learn")} ▾
            </summary>
            <div className="absolute left-0 z-20 mt-1 min-w-[200px] rounded-lg border bg-white py-1 shadow-lg">
              {learnLinks.map(({ href, key }) => (
                <Link
                  key={href}
                  href={href}
                  className={cn(
                    "block px-3 py-2 hover:bg-opseu-blue/5",
                    pathname === href && "bg-opseu-blue/10 font-semibold text-opseu-blue",
                  )}
                >
                  {t(key)}
                </Link>
              ))}
            </div>
          </details>

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

          <details className="relative">
            <summary
              className={cn(
                "cursor-pointer list-none rounded-md px-2 py-1 hover:bg-opseu-blue/5 [&::-webkit-details-marker]:hidden",
                toolsActive && "bg-opseu-blue/10 font-semibold text-opseu-blue",
              )}
            >
              {t("tools")} ▾
            </summary>
            <div className="absolute right-0 z-20 mt-1 min-w-[200px] rounded-lg border bg-white py-1 shadow-lg">
              {toolLinks.map(({ href, key }) => (
                <Link
                  key={href}
                  href={href}
                  className={cn(
                    "block px-3 py-2 hover:bg-opseu-blue/5",
                    pathname === href && "bg-opseu-blue/10 font-semibold text-opseu-blue",
                  )}
                >
                  {t(key)}
                </Link>
              ))}
            </div>
          </details>

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
