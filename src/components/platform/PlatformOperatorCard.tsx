"use client";

import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import {
  PLATFORM_OPERATOR_NAV,
  platformOperatorLinkActive,
  type PlatformOperatorNavKey,
} from "@/lib/platform/operator-nav";
import { PUBLIC_CARD_TITLE_CLASS } from "@/lib/constants/public-type";
import { cn } from "@/lib/utils";

type PlatformOperatorCardProps = {
  pathname: string;
  /** Profile page uses a section heading; dashboard uses card title. */
  variant?: "card" | "profile";
};

const BLURB_KEY: Record<PlatformOperatorNavKey, string> = {
  siteAdmin: "siteAdminBody",
  invites: "invitesBody",
  onboarding: "onboardingBody",
  feedback: "feedbackBody",
  audit: "auditBody",
};

export function PlatformOperatorCard({
  pathname,
  variant = "card",
}: PlatformOperatorCardProps) {
  const t = useTranslations("hub.platformOperator");
  const isCard = variant === "card";
  const [primary, ...secondary] = PLATFORM_OPERATOR_NAV;

  if (!isCard) {
    return (
      <section
        aria-labelledby="platform-operator-heading"
        className="min-w-0 rounded-xl border border-slate-200 bg-white p-4 shadow-sm md:p-5"
      >
        <h2
          id="platform-operator-heading"
          className="text-sm font-medium text-gray-700"
        >
          {t("profileHeading")}
        </h2>
        <p className="mt-1 max-w-prose text-sm leading-relaxed text-gray-600">
          {t("cardBody")}
        </p>
        <nav aria-label={t("menu")} className="mt-4">
          <ul className="grid gap-2 sm:grid-cols-2">
            {PLATFORM_OPERATOR_NAV.map((item) => (
              <li key={item.href}>
                <OperatorTile
                  href={item.href}
                  title={t(item.labelKey)}
                  body={t(BLURB_KEY[item.labelKey])}
                  active={platformOperatorLinkActive(pathname, item.href)}
                  featured={item.labelKey === "siteAdmin"}
                  compact
                />
              </li>
            ))}
          </ul>
        </nav>
      </section>
    );
  }

  return (
    <section
      aria-labelledby="platform-operator-heading"
      className="min-w-0 overflow-hidden rounded-xl border border-opseu-blue/20 bg-gradient-to-br from-opseu-blue/[0.07] via-white to-opseu-orange/[0.05] shadow-sm"
    >
      <div className="border-b border-opseu-blue/10 px-4 py-4 sm:px-5 sm:py-5">
        <p className="text-xs font-semibold uppercase tracking-[0.08em] text-opseu-blue">
          {t("cardEyebrow")}
        </p>
        <h2
          id="platform-operator-heading"
          className={cn(PUBLIC_CARD_TITLE_CLASS, "mt-1")}
        >
          {t("cardTitle")}
        </h2>
        <p className="mt-1.5 max-w-prose text-sm leading-relaxed text-gray-600">
          {t("cardBody")}
        </p>
      </div>

      <nav aria-label={t("menu")} className="p-4 sm:p-5">
        <div className="grid gap-3 lg:grid-cols-3 lg:grid-rows-2">
          <OperatorTile
            href={primary.href}
            title={t(primary.labelKey)}
            body={t(BLURB_KEY[primary.labelKey])}
            active={platformOperatorLinkActive(pathname, primary.href)}
            featured
            tall
            cta={t("openSiteAdmin")}
            className="lg:row-span-2"
          />
          {secondary.map((item) => (
            <OperatorTile
              key={item.href}
              href={item.href}
              title={t(item.labelKey)}
              body={t(BLURB_KEY[item.labelKey])}
              active={platformOperatorLinkActive(pathname, item.href)}
            />
          ))}
        </div>
      </nav>
    </section>
  );
}

type OperatorTileProps = {
  href: string;
  title: string;
  body: string;
  active: boolean;
  featured?: boolean;
  tall?: boolean;
  compact?: boolean;
  cta?: string;
  className?: string;
};

function OperatorTile({
  href,
  title,
  body,
  active,
  featured = false,
  tall = false,
  compact = false,
  cta,
  className,
}: OperatorTileProps) {
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={cn(
        "group relative flex h-full min-h-11 flex-col rounded-xl border bg-white p-3.5 transition-all duration-200 ease-out",
        "hover:-translate-y-0.5 hover:border-opseu-blue/40 hover:shadow-md",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-opseu-blue/50 focus-visible:ring-offset-2",
        "motion-reduce:transition-none motion-reduce:hover:translate-y-0",
        featured
          ? "border-opseu-blue/25 shadow-sm"
          : "border-slate-200/90",
        active && "border-opseu-blue/50 bg-opseu-blue/[0.04] ring-1 ring-opseu-blue/20",
        tall && "sm:min-h-[11.5rem] lg:min-h-full lg:justify-between",
        compact && "p-3",
        className,
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <h3
          className={cn(
            "font-semibold text-opseu-dark",
            featured && !compact ? "text-base sm:text-lg" : "text-sm",
          )}
        >
          {title}
        </h3>
        <span
          className={cn(
            "mt-0.5 shrink-0 text-sm font-medium text-opseu-blue transition-transform duration-200",
            "group-hover:translate-x-0.5 motion-reduce:group-hover:translate-x-0",
          )}
          aria-hidden
        >
          →
        </span>
      </div>
      <p
        className={cn(
          "mt-1.5 text-sm leading-relaxed text-gray-600",
          tall && "sm:mt-3 sm:max-w-[22rem]",
        )}
      >
        {body}
      </p>
      {cta ? (
        <span className="mt-4 hidden text-sm font-medium text-opseu-blue sm:inline-flex">
          {cta}
          <span
            className="ml-1 transition-transform group-hover:translate-x-0.5 motion-reduce:group-hover:translate-x-0"
            aria-hidden
          >
            →
          </span>
        </span>
      ) : null}
    </Link>
  );
}
