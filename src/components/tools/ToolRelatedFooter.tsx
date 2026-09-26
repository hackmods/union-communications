"use client";

import { useTranslations } from "next-intl";
import {
  RELATED_BY_TOOL,
  RelatedToolsStrip,
} from "@/components/tools/RelatedToolsStrip";
import { useDisabledPublicTools } from "@/hooks/use-disabled-public-tools";
import { slugFromToolHref } from "@/lib/public-tools/visibility";
import { canonicalizePublicHref } from "@/lib/seo/public-routes";

/**
 * Resolve RELATED_BY_TOOL entries to localized RelatedToolsStrip for a tool slug.
 * Filters Site Admin–disabled public tools, including `/create` and `/utilities` hrefs.
 */
export function ToolRelatedFooter({
  toolSlug,
  className,
}: {
  toolSlug: string;
  className?: string;
}) {
  const nav = useTranslations("nav");
  const disabled = useDisabledPublicTools();
  const disabledSet = new Set(disabled);
  const entries = (RELATED_BY_TOOL[toolSlug] ?? [])
    .map((e) => ({ ...e, href: canonicalizePublicHref(e.href) }))
    .filter((e) => {
      const slug = slugFromToolHref(e.href);
      if (slug && disabledSet.has(slug)) return false;
      return true;
    });
  if (!entries.length) return null;

  return (
    <RelatedToolsStrip
      className={className}
      links={entries.map((e) => ({
        href: e.href,
        label: nav(e.navKey as Parameters<typeof nav>[0]),
      }))}
    />
  );
}
