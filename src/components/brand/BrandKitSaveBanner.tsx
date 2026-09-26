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
  /** Timestamp we already dismissed; a newer lastSavedAt remounts the toast. */
  const [dismissedAt, setDismissedAt] = useState<number | null>(null);

  useEffect(() => {
    if (!lastSavedAt || storageBlocked) return;
    const hideTimer = window.setTimeout(() => {
      setDismissedAt(lastSavedAt);
    }, 2200);
    return () => window.clearTimeout(hideTimer);
  }, [lastSavedAt, storageBlocked]);

  if (
    !lastSavedAt ||
    storageBlocked ||
    dismissedAt === lastSavedAt
  ) {
    return null;
  }

  return (
    <div
      key={lastSavedAt}
      role="status"
      aria-live="polite"
      data-brand-kit-saved-at={lastSavedAt}
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
