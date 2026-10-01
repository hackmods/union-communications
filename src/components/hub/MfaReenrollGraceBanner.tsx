"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { hubMfaSetupHref, safeMfaReturnPath } from "@/lib/auth/mfa-return-path";
import { useHubAuthenticated } from "@/components/hub/useHubAuthenticated";

/**
 * Shown while durable re-enroll grace is active after MFA reset.
 */
export function MfaReenrollGraceBanner() {
  const pathname = usePathname();
  const t = useTranslations("hub");
  const { authenticated } = useHubAuthenticated();
  const [graceUntil, setGraceUntil] = useState<string | null>(null);

  useEffect(() => {
    if (!authenticated) return;
    let cancelled = false;
    void fetch("/api/mfa/status")
      .then((res) => (res.ok ? res.json() : null))
      .then(
        (data: { reenrollGrace?: boolean; reenrollGraceUntil?: string | null } | null) => {
          if (cancelled) return;
          setGraceUntil(
            data?.reenrollGrace && data.reenrollGraceUntil
              ? data.reenrollGraceUntil
              : null,
          );
        },
      )
      .catch(() => {
        if (!cancelled) setGraceUntil(null);
      });
    return () => {
      cancelled = true;
    };
  }, [authenticated]);

  if (!authenticated || !graceUntil) return null;
  const nextPath = safeMfaReturnPath(
    (pathname ?? "/app").replace(/^\/[a-z]{2}(?=\/)/, ""),
  );

  return (
    <div
      className="border-b border-amber-300 bg-amber-50 text-opseu-dark"
      role="status"
    >
      <div className="mx-auto flex max-w-[100rem] flex-col gap-1 px-4 py-2.5 text-sm sm:flex-row sm:items-center sm:justify-between sm:px-6 xl:px-8">
        <p>{t("mfaReenrollGraceBanner")}</p>
        <Link
          href={hubMfaSetupHref(nextPath)}
          className="font-semibold text-opseu-blue underline underline-offset-2"
        >
          {t("mfaReenrollGraceCta")}
        </Link>
      </div>
    </div>
  );
}
