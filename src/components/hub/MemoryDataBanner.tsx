"use client";

import { useSession } from "next-auth/react";
import { useTranslations } from "next-intl";
import { isMemoryCaseDataActive } from "@/lib/db/backend";
import { PAGE_SHELL } from "@/lib/constants/page-shell";
import { cn } from "@/lib/utils";

/**
 * Persistent warning while confidential case data still uses in-memory adapters
 * (SEC-003). Hidden only when all backends are postgres.
 */
export function MemoryDataBanner() {
  const { status } = useSession();
  const t = useTranslations("hub");

  if (!isMemoryCaseDataActive() || status !== "authenticated") return null;

  return (
    <div
      className="border-b border-red-300 bg-red-50 text-red-950"
      role="status"
      aria-live="polite"
    >
      <div className={cn(PAGE_SHELL.chrome, "flex items-start gap-3 py-2.5 text-sm")}>
        <span className="shrink-0 rounded bg-red-800 px-1.5 py-0.5 text-xs font-bold uppercase tracking-wide text-red-50">
          {t("memoryBannerLabel")}
        </span>
        <p className="leading-snug">{t("memoryBannerBody")}</p>
      </div>
    </div>
  );
}
