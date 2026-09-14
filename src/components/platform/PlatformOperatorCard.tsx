"use client";

import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { Card } from "@/components/ui/Card";
import {
  PLATFORM_OPERATOR_NAV,
  platformOperatorLinkActive,
} from "@/lib/platform/operator-nav";
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

  return (
    <Card density="compact" className="border-opseu-blue/30 bg-white">
      <h2
        className={cn(
          "font-semibold text-opseu-dark",
          variant === "card" ? "text-lg" : "text-sm font-medium text-gray-700",
        )}
      >
        {variant === "card" ? t("cardTitle") : t("profileHeading")}
      </h2>
      <p className="mt-1 text-sm text-gray-600">{t("cardBody")}</p>
      <ul className="mt-3 space-y-1">
        {PLATFORM_OPERATOR_NAV.map((item) => {
          const active = platformOperatorLinkActive(pathname, item.href);
          return (
            <li key={item.href}>
              <Link
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "inline-flex min-h-11 items-center text-sm text-opseu-blue underline",
                  active && "font-semibold text-opseu-dark",
                )}
              >
                {t(item.labelKey)}
              </Link>
            </li>
          );
        })}
      </ul>
    </Card>
  );
}
