"use client";

import { useSession } from "next-auth/react";
import { useTranslations } from "next-intl";
import { isDemoSite } from "@/lib/features/demo-site";
import { PAGE_SHELL } from "@/lib/constants/page-shell";
import { cn } from "@/lib/utils";

/**
 * Persistent notice on authenticated hub pages when this host is a demo site.
 * Hidden on the login screen and whenever `NEXT_PUBLIC_DEMO_SITE` is off.
 */
export function DemoSiteBanner() {
  const { status } = useSession();
  const t = useTranslations("hub");

  if (!isDemoSite() || status !== "authenticated") return null;

  return (
    <div
      className="border-b border-amber-300 bg-amber-100 text-amber-950"
      role="status"
      aria-live="polite"
    >
      <div className={cn(PAGE_SHELL.chrome, "flex items-start gap-3 py-2.5 text-sm")}>
        <span className="shrink-0 rounded bg-amber-800 px-1.5 py-0.5 text-xs font-bold uppercase tracking-wide text-amber-50">
          {t("demoBannerLabel")}
        </span>
        <p className="leading-snug">{t("demoBannerBody")}</p>
      </div>
    </div>
  );
}
