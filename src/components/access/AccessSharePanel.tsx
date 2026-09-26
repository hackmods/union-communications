"use client";

import { useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { BrandLogo } from "@/components/brand/BrandLogo";
import { Button } from "@/components/ui/Button";
import { ButtonLink } from "@/components/ui/ButtonLink";
import { Link } from "@/i18n/navigation";
import { useBrandStore } from "@/store/brand-store";

type Props = {
  variant: "local_interest" | "member_access";
  unionName?: string | null;
  localNumber?: string | null;
};

/**
 * Shown on /join and /request-access when the visitor already has a Hub session.
 * Encourages sharing the public apply links rather than re-submitting.
 */
export function AccessSharePanel({
  variant,
  unionName,
  localNumber,
}: Props) {
  const t = useTranslations("accessShare");
  const locale = useLocale();
  const brandLocal = useBrandStore((s) => s.brandKit.local.localNumber);
  const displayLocal = localNumber?.trim() || brandLocal?.trim() || "";
  const tenantLine = [
    unionName,
    displayLocal ? t("localLabel", { number: displayLocal }) : null,
  ]
    .filter(Boolean)
    .join(" · ");
  const [copied, setCopied] = useState<"join" | "member" | null>(null);

  async function copyPath(which: "join" | "member", path: string) {
    const origin =
      typeof window !== "undefined" ? window.location.origin : "";
    const url = `${origin}/${locale}${path}`;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(which);
      window.setTimeout(() => setCopied(null), 2000);
    } catch {
      setCopied(null);
    }
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-4">
        <BrandLogo size="md" />
        {tenantLine ? (
          <p className="text-sm font-medium text-slate-700">{tenantLine}</p>
        ) : null}
      </div>
      <div>
        <h2 className="text-xl font-semibold text-opseu-dark">
          {t(variant === "member_access" ? "memberTitle" : "title")}
        </h2>
        <p className="mt-2 text-slate-700">
          {t(variant === "member_access" ? "memberBody" : "body")}
        </p>
      </div>
      <p className="text-sm text-slate-700">{t("sharePrompt")}</p>
      <ul className="space-y-3 text-sm">
        <li className="flex flex-wrap items-center gap-2">
          <Link href="/join" className="font-semibold text-opseu-blue underline">
            {t("shareJoin")}
          </Link>
          <span className="text-slate-600">— {t("shareJoinHint")}</span>
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => void copyPath("join", "/join")}
          >
            {copied === "join" ? t("copied") : t("copyLink")}
          </Button>
        </li>
        <li className="flex flex-wrap items-center gap-2">
          <Link
            href="/request-access"
            className="font-semibold text-opseu-blue underline"
          >
            {t("shareMember")}
          </Link>
          <span className="text-slate-600">— {t("shareMemberHint")}</span>
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => void copyPath("member", "/request-access")}
          >
            {copied === "member" ? t("copied") : t("copyLink")}
          </Button>
        </li>
      </ul>
      <ButtonLink href="/app" trailingArrow>
        {t("hubCta")}
      </ButtonLink>
    </div>
  );
}
