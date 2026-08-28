"use client";

import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { isOfficerHubPublic } from "@/lib/features/officer-hub-public";
import { PAGE_SHELL } from "@/lib/constants/page-shell";
import { cn } from "@/lib/utils";

const footerLinkClass =
  "inline-flex min-h-11 items-center hover:text-opseu-blue sm:min-h-8";

export function Footer() {
  const t = useTranslations("footer");
  const nav = useTranslations("nav");

  return (
    <footer className="mt-auto min-w-0 border-t border-gray-200 bg-white py-4 sm:py-5">
      <div
        className={cn(
          PAGE_SHELL.chrome,
          "flex min-w-0 flex-col gap-3 text-sm text-gray-600 lg:flex-row lg:items-center lg:justify-between lg:gap-8",
        )}
      >
        <p className="min-w-0 leading-snug lg:max-w-sm lg:shrink-0">
          {t("madeBy")}{" "}
          <span className="text-opseu-blue">
            {t(isOfficerHubPublic() ? "privacy" : "privacyCommsOnly")}
          </span>
        </p>
        <nav
          className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-0 lg:flex-1 lg:justify-end"
          aria-label={nav("footerNav")}
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
          <Link href="/guide/email-broadcast" className={footerLinkClass}>
            {nav("emailBroadcastGuide")}
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
          <Link href="/updates" className={footerLinkClass}>
            {nav("whatsNew")}
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
          <Link href="/security" className={footerLinkClass}>
            {nav("security")}
          </Link>
          <Link href="/accessibility" className={footerLinkClass}>
            {nav("accessibility")}
          </Link>
          <Link href="/feedback" className={footerLinkClass}>
            {nav("feedback")}
          </Link>
          <Link href="/build" className={footerLinkClass}>
            {nav("buildInfo")}
          </Link>
        </nav>
      </div>
    </footer>
  );
}
