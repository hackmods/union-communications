"use client";

import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { isOfficerHubPublic } from "@/lib/features/officer-hub-public";
import { PAGE_SHELL } from "@/lib/constants/page-shell";
import { cn } from "@/lib/utils";

const footerLinkClass =
  "inline-flex min-h-11 items-center hover:text-opseu-blue";

export function Footer() {
  const t = useTranslations("footer");
  const nav = useTranslations("nav");

  return (
    <footer className="mt-auto border-t border-gray-200 bg-white py-8">
      <div
        className={cn(
          PAGE_SHELL.chrome,
          "flex min-w-0 flex-col gap-4 text-base text-gray-600 sm:flex-row sm:items-start sm:justify-between sm:gap-6",
        )}
      >
        <div className="min-w-0 shrink-0">
          <p>{t("madeBy")}</p>
          <p className="text-opseu-blue">
            {t(isOfficerHubPublic() ? "privacy" : "privacyCommsOnly")}
          </p>
        </div>
        <nav
          className="flex min-w-0 flex-wrap gap-x-4 gap-y-1 sm:max-w-xl sm:justify-end md:max-w-2xl"
          aria-label="Footer"
        >
          <Link href="/guide" className={footerLinkClass}>
            {nav("guide")}
          </Link>
          <Link href="/tools" className={footerLinkClass}>
            {nav("tools")}
          </Link>
          <Link href="/guide/print" className={footerLinkClass}>
            {nav("printGuide")}
          </Link>
          <Link href="/examples" className={footerLinkClass}>
            {nav("socialExamples")}
          </Link>
          <Link href="/captions" className={footerLinkClass}>
            {nav("captions")}
          </Link>
          <Link href="/guide/resources" className={footerLinkClass}>
            {nav("resources")}
          </Link>
          <Link href="/assets" className={footerLinkClass}>
            {nav("assets")}
          </Link>
          <Link href="/manifesto" className={footerLinkClass}>
            {nav("manifesto")}
          </Link>
          <Link href="/install" className={footerLinkClass}>
            {nav("install")}
          </Link>
          <Link href="/privacy" className={footerLinkClass}>
            {nav("privacy")}
          </Link>
          <Link href="/accessibility" className={footerLinkClass}>
            {nav("accessibility")}
          </Link>
          <Link href="/support" className={footerLinkClass}>
            {nav("support")}
          </Link>
        </nav>
      </div>
    </footer>
  );
}
