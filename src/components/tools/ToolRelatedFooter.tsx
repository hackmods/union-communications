"use client";

import { useTranslations } from "next-intl";
import {
  RELATED_BY_TOOL,
  RelatedToolsStrip,
} from "@/components/tools/RelatedToolsStrip";

/**
 * Resolve RELATED_BY_TOOL entries to localized RelatedToolsStrip for a tool slug.
 */
export function ToolRelatedFooter({
  toolSlug,
  className,
}: {
  toolSlug: string;
  className?: string;
}) {
  const nav = useTranslations("nav");
  const entries = RELATED_BY_TOOL[toolSlug] ?? [];
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
