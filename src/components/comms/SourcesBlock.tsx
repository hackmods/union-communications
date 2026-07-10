"use client";

import { Card, CardTitle } from "@/components/ui/Card";
import {
  getSourcesForPage,
  type CommsSource,
} from "@/lib/constants/comms-sources";

interface SourcesBlockProps {
  pageId: string;
  title: string;
  intro?: string;
}

function SourceItem({ source }: { source: CommsSource }) {
  return (
    <li className="border-b border-gray-100 pb-3 last:border-0 last:pb-0">
      <a
        href={source.url}
        target="_blank"
        rel="noopener noreferrer"
        className="font-medium text-opseu-blue underline"
      >
        {source.label}
      </a>
      <p className="mt-1 text-sm text-gray-600">{source.note}</p>
    </li>
  );
}

export function SourcesBlock({ pageId, title, intro }: SourcesBlockProps) {
  const sources = getSourcesForPage(pageId);
  if (sources.length === 0) return null;

  return (
    <Card className="mt-10 border-gray-200 bg-gray-50">
      <CardTitle className="text-base">{title}</CardTitle>
      {intro && <p className="mt-2 text-sm text-gray-600">{intro}</p>}
      <ul className="mt-4 space-y-3">
        {sources.map((source) => (
          <SourceItem key={source.id} source={source} />
        ))}
      </ul>
    </Card>
  );
}
