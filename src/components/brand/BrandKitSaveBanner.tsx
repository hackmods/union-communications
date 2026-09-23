"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { useBrandStore } from "@/store/brand-store";
import { cn } from "@/lib/utils";

/** Floating status when Brand Kit finishes a successful local save. */
export function BrandKitSaveBanner() {
  const t = useTranslations("brandKit");
  const lastSavedAt = useBrandStore((s) => s.lastSavedAt);
  const storageBlocked = useBrandStore((s) => s.storageBlocked);
  const [bannerKey, setBannerKey] = useState<number | null>(null);

  useEffect(() => {
    if (!lastSavedAt || storageBlocked) return;
    const showTimer = window.setTimeout(() => {
      setBannerKey(lastSavedAt);
    }, 0);
    const hideTimer = window.setTimeout(() => {
      setBannerKey(null);
    }, 2800);
    return () => {
      window.clearTimeout(showTimer);
      window.clearTimeout(hideTimer);
    };
  }, [lastSavedAt, storageBlocked]);

  if (bannerKey == null || bannerKey !== lastSavedAt || storageBlocked) {
    return null;
  }

  return (
    <div
      role="status"
      aria-live="polite"
      className={cn(
        "pointer-events-none fixed bottom-4 left-1/2 z-50 -translate-x-1/2",
        "rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-2.5 shadow-md",
        "text-sm font-medium text-emerald-950",
      )}
    >
      {t("changesSaved")}
    </div>
  );
}
