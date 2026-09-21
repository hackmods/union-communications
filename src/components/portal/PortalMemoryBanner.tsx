"use client";

import { useSession } from "next-auth/react";
import { useTranslations } from "next-intl";
import { PAGE_SHELL } from "@/lib/constants/page-shell";
import { cn } from "@/lib/utils";

export function PortalMemoryBanner({ active }: { active: boolean }) {
  const { status } = useSession();
  const t = useTranslations("portal");

  if (status !== "authenticated" || !active) return null;

  return (
    <div
      className="border-b border-amber-300 bg-amber-50 text-amber-950"
      role="status"
      aria-live="polite"
    >
      <div className={cn(PAGE_SHELL.chrome, "flex items-start gap-3 py-2.5 text-sm")}>
        <span className="shrink-0 rounded bg-amber-800 px-1.5 py-0.5 text-xs font-bold uppercase tracking-wide text-amber-50">
          {t("memoryBannerLabel")}
        </span>
        <p className="leading-snug">{t("memoryBannerBody")}</p>
      </div>
    </div>
  );
}
