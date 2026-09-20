"use client";

import { Card, CardTitle } from "@/components/ui/Card";
import {
  getSourcesForPage,
  type CommsSource,
} from "@/lib/constants/comms-sources";
import { useBrandStore } from "@/store/brand-store";
import { cn } from "@/lib/utils";

interface SourcesBlockProps {
  pageId: string;
  title: string;
  intro?: string;
  className?: string;
}

function SourceItem({ source }: { source: CommsSource }) {
  return (
    <li className="min-w-0">
      <a
        href={source.url}
        target="_blank"
        rel="noopener noreferrer"
        className="font-medium text-opseu-blue underline underline-offset-2"
      >
        {source.label}
      </a>
      <p className="mt-1 text-sm leading-relaxed text-gray-600">{source.note}</p>
    </li>
  );
}

/**
 * Per-page bibliography footer. Fills the parent shell width; source notes stay
 * readable via auto-fit columns (1 → N as the viewport / shell widens).
 */
export function SourcesBlock({
  pageId,
  title,
  intro,
  className,
}: SourcesBlockProps) {
  const unionPresetId = useBrandStore((s) => s.brandKit.unionPresetId);
  const hydrated = useBrandStore((s) => s.hydrated);
  const sources = getSourcesForPage(
    pageId,
    hydrated ? unionPresetId : undefined,
  );
  if (sources.length === 0) return null;

  return (
    <Card
      className={cn(
        "mt-10 w-full min-w-0 border-gray-200 bg-gray-50",
        className,
      )}
    >
      <CardTitle className="text-base sm:text-lg">{title}</CardTitle>
      {intro ? (
        <p className="mt-2 max-w-prose text-sm leading-relaxed text-gray-600">
          {intro}
        </p>
      ) : null}
      <ul
        className={cn(
          "mt-4 grid gap-x-6 gap-y-4",
          "grid-cols-[repeat(auto-fit,minmax(min(100%,17.5rem),1fr))]",
        )}
      >
        {sources.map((source) => (
          <SourceItem key={source.id} source={source} />
        ))}
      </ul>
    </Card>
  );
}
