"use client";

import type { MentionableUser } from "@/types/hub-social";
import { segmentMentionText } from "@/lib/hub/mentions";

export function MentionText({
  body,
  roster,
}: {
  body: string;
  roster: MentionableUser[];
}) {
  const segments = segmentMentionText(body, roster);
  return (
    <p className="whitespace-pre-wrap text-sm text-gray-800">
      {segments.map((segment, index) =>
        segment.type === "mention" ? (
          <span
            key={`${index}-${segment.value}`}
            className="rounded bg-opseu-blue/10 px-1 font-medium text-opseu-dark"
          >
            {segment.value}
          </span>
        ) : (
          <span key={`${index}-text`}>{segment.value}</span>
        ),
      )}
    </p>
  );
}
