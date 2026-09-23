"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { BrandBaselineApplyButton } from "@/components/customization/BrandBaselineApplyButton";
import type { AuthorizedBrandDto } from "@/lib/customization/types";

/**
 * Loads a published brand baseline and offers explicit apply/undo.
 * Never auto-applies into the volunteer's saved Brand Kit.
 */
export function BrandBaselineOffer() {
  const t = useTranslations("hub.platformOperator.customization");
  const [content, setContent] = useState<AuthorizedBrandDto | null>(null);
  const [releaseId, setReleaseId] = useState<string | undefined>();

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const res = await fetch("/api/customization/content/brand%3Abaseline?locale=en", {
          headers: { Accept: "application/json" },
          cache: "no-store",
        });
        if (!res.ok || cancelled) return;
        const data = await res.json() as {
          status?: string;
          content?: AuthorizedBrandDto;
          releaseId?: string;
        };
        if (data.status === "resolved" && data.content && !cancelled) {
          setContent(data.content);
          setReleaseId(data.releaseId);
        }
      } catch {
        // Compiled defaults / unavailable hosts leave Brand Kit unchanged.
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  if (!content) return null;

  return (
    <div className="rounded border border-opseu-gray/30 bg-white p-3">
      <p className="mb-2 text-sm text-opseu-gray-dark">{t("applyBaseline")}</p>
      <BrandBaselineApplyButton content={content} releaseId={releaseId} />
    </div>
  );
}
