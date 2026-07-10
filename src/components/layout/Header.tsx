"use client";

import { useTranslations } from "next-intl";
import { Link, usePathname } from "@/i18n/navigation";
import { LanguageToggle } from "./LanguageToggle";
import { BrandLogo } from "@/components/brand/BrandLogo";
import { cn } from "@/lib/utils";

const navLinks = [
  { href: "/guide", key: "guide" },
  { href: "/guide/crisis", key: "crisis" },
  { href: "/examples", key: "examples" },
  { href: "/captions", key: "captions" },
  { href: "/assets", key: "assets" },
  { href: "/brand-kit", key: "brandKit" },
] as const;

const toolLinks = [
  { href: "/tools/logo-builder", key: "logoBuilder" },
  { href: "/tools/graphic-maker", key: "graphicMaker" },
  { href: "/tools/resizer", key: "resizer" },
  { href: "/tools/quote-card", key: "quoteCard" },
  { href: "/tools/flyer-maker", key: "flyerMaker" },
  { href: "/tools/alt-text", key: "altText" },
] as const;

export function Header() {
  const t = useTranslations("nav");
  const th = useTranslations("hub");
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-50 border-b border-gray-200 bg-white/95 backdrop-blur">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4 px-4 py-3">
        <Link href="/" className="flex items-center gap-2 font-bold text-opseu-blue">
          <BrandLogo size="sm" />
          <span className="hidden sm:inline">{th("platformName")}</span>
        </Link>

        <nav className="flex flex-wrap items-center gap-1 text-sm" aria-label="Main">
          <Link
            href="/app"
            className={cn(
              "rounded-md px-2 py-1 font-medium hover:bg-opseu-blue/5",
              pathname.startsWith("/app") && "bg-opseu-blue/10 text-opseu-blue",
            )}
          >
            {th("hubLink")}
          </Link>
          {navLinks.map(({ href, key }) => (
            <Link
              key={href}
              href={href}
              className={cn(
                "rounded-md px-2 py-1 hover:bg-opseu-blue/5",
                pathname === href && "bg-opseu-blue/10 font-semibold text-opseu-blue",
              )}
            >
              {t(key)}
            </Link>
          ))}
          <details className="relative">
            <summary className="cursor-pointer list-none rounded-md px-2 py-1 hover:bg-opseu-blue/5">
              {t("tools")} ▾
            </summary>
            <div className="absolute right-0 mt-1 min-w-[180px] rounded-lg border bg-white py-1 shadow-lg">
              {toolLinks.map(({ href, key }) => (
                <Link
                  key={href}
                  href={href}
                  className="block px-3 py-2 hover:bg-opseu-blue/5"
                >
                  {t(key)}
                </Link>
              ))}
            </div>
          </details>
        </nav>

        <LanguageToggle />
      </div>
    </header>
  );
}
