"use client";

import { useEffect, useState, type ReactNode } from "react";
import { useLocale } from "next-intl";
import { useBrandStore } from "@/store/brand-store";
import { AuthorizedGuideView } from "@/components/customization/AuthorizedGuideView";
import type { AuthorizedGuideDto } from "@/lib/customization/types";

/**
 * When Brand Kit selects a union with a published `guide:learn-print` overlay,
 * replace the compiled Print guide body. System/TSX fallback stays until then.
 */
export function PrintGuideCustomization({
  fallback,
  subtitle,
  tocLabel,
  aside,
  relatedLabel,
  relatedLinks,
  footer,
  sourcesLabel,
}: {
  fallback: ReactNode;
  subtitle?: string;
  tocLabel?: string;
  aside?: ReactNode;
  relatedLabel?: string;
  relatedLinks?: Array<{ href: string; label: string }>;
  footer?: ReactNode;
  sourcesLabel?: string;
}) {
  const locale = useLocale();
  const unionPresetId = useBrandStore((state) => state.brandKit.unionPresetId);
  const hydrated = useBrandStore((state) => state.hydrated);
  const [content, setContent] = useState<AuthorizedGuideDto | null>(null);

  useEffect(() => {
    if (!hydrated) return;
    let cancelled = false;
    void (async () => {
      try {
        const params = new URLSearchParams({
          locale: locale === "fr" ? "fr" : "en",
        });
        if (unionPresetId) params.set("presetId", unionPresetId);
        const res = await fetch(`/api/customization/content/guide%3Alearn-print?${params}`, {
          headers: { Accept: "application/json" },
          cache: "no-store",
        });
        if (!res.ok || cancelled) {
          if (!cancelled) setContent(null);
          return;
        }
        const data = await res.json() as {
          status?: string;
          content?: AuthorizedGuideDto;
        };
        if (
          data.status === "resolved"
          && data.content
          && "blocks" in data.content
          && data.content.blocks.length > 0
          && !cancelled
        ) {
          setContent(data.content);
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
  }, [hydrated, locale, unionPresetId]);

  if (!content) return <>{fallback}</>;

  return (
    <AuthorizedGuideView
      content={content}
      subtitle={subtitle}
      tocLabel={tocLabel}
      aside={aside}
      relatedLabel={relatedLabel}
      relatedLinks={relatedLinks}
      footer={footer}
      sourcesLabel={sourcesLabel}
    />
  );
}
