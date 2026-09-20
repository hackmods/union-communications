"use client";

import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { Card } from "@/components/ui/Card";
import {
  PLATFORM_OPERATOR_NAV,
  platformOperatorLinkActive,
} from "@/lib/platform/operator-nav";
import { PUBLIC_CARD_TITLE_CLASS } from "@/lib/constants/public-type";
import { cn } from "@/lib/utils";

type PlatformOperatorCardProps = {
  pathname: string;
  /** Profile page uses a section heading; dashboard uses card title. */
  variant?: "card" | "profile";
};

export function PlatformOperatorCard({
  pathname,
  variant = "card",
}: PlatformOperatorCardProps) {
  const t = useTranslations("hub.platformOperator");
  const isCard = variant === "card";

  return (
    <Card
      density="compact"
      variant={isCard ? "ghost" : "default"}
      className={cn(isCard && "border-opseu-blue/20")}
    >
      <div className={cn(isCard && "sm:flex sm:items-start sm:justify-between sm:gap-6")}>
        <div className="min-w-0 max-w-prose">
          <h2
            className={cn(
              isCard
                ? PUBLIC_CARD_TITLE_CLASS
                : "text-sm font-medium text-gray-700",
            )}
          >
            {isCard ? t("cardTitle") : t("profileHeading")}
          </h2>
          <p className="mt-1 text-sm leading-relaxed text-gray-600">
            {t("cardBody")}
          </p>
        </div>
      </div>

      <nav aria-label={t("menu")} className="mt-4">
        <ul
          className={cn(
            "grid gap-2",
            isCard
              ? "sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5"
              : "sm:grid-cols-2",
          )}
        >
          {PLATFORM_OPERATOR_NAV.map((item) => {
            const active = platformOperatorLinkActive(pathname, item.href);
            const primary = item.labelKey === "siteAdmin";
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "flex min-h-11 items-center justify-center rounded-lg px-3 text-center text-sm font-medium transition-colors",
                    primary
                      ? "bg-opseu-blue text-white hover:bg-opseu-blue/90"
                      : "border border-gray-300 bg-white text-opseu-dark hover:border-opseu-blue/40 hover:bg-opseu-blue/5",
                    active &&
                      (primary
                        ? "ring-2 ring-opseu-dark/30 ring-offset-1"
                        : "border-opseu-blue/50 bg-opseu-blue/10 font-semibold"),
                  )}
                >
                  {t(item.labelKey)}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </Card>
  );
}
