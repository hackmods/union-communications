"use client";

import { useEffect, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { BrandBaselineApplyButton } from "@/components/customization/BrandBaselineApplyButton";
import type { AuthorizedBrandDto } from "@/lib/customization/types";
import { useBrandStore } from "@/store/brand-store";

/**
 * Loads a published brand baseline for the Brand Kit preset's union scope
 * (system fallback) and offers explicit apply/undo. Never auto-applies.
 */
export function BrandBaselineOffer() {
  const t = useTranslations("brandKit.baseline");
  const locale = useLocale();
  const unionPresetId = useBrandStore((state) => state.brandKit.unionPresetId);
  const [content, setContent] = useState<AuthorizedBrandDto | null>(null);
  const [releaseId, setReleaseId] = useState<string | undefined>();

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const params = new URLSearchParams({
          locale: locale === "fr" ? "fr" : "en",
        });
        if (unionPresetId) params.set("presetId", unionPresetId);
        const res = await fetch(`/api/customization/content/brand%3Abaseline?${params}`, {
          headers: { Accept: "application/json" },
          cache: "no-store",
        });
        if (!res.ok || cancelled) {
          if (!cancelled) setContent(null);
          return;
        }
        const data = await res.json() as {
          status?: string;
          content?: AuthorizedBrandDto;
          releaseId?: string;
        };
        if (data.status === "resolved" && data.content && !cancelled) {
          setContent(data.content);
          setReleaseId(data.releaseId);
        } else if (!cancelled) {
          setContent(null);
        }
      } catch {
        if (!cancelled) setContent(null);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [locale, unionPresetId]);

  if (!content) return null;

  return (
    <div className="rounded border border-opseu-gray/30 bg-white p-3">
      <p className="mb-1 text-sm font-medium text-opseu-dark">{t("title")}</p>
      <p className="mb-2 text-sm text-opseu-gray-dark">{t("body")}</p>
      <BrandBaselineApplyButton content={content} releaseId={releaseId} />
    </div>
  );
}
