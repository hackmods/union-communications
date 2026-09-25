"use client";

import type { ModuleSection } from "@/lib/officer-learning/types";
import { GuideToc, type GuideTocItem } from "@/components/comms/GuideToc";
import {
  humanizeInternalPath,
  tokenizeInline,
} from "@/lib/officer-learning/inline-markdown";

/** TOC labels stay plain text; strip markdown markers without HTML. */
function plainInline(text: string): string {
  return tokenizeInline(text)
    .map((token) => {
      switch (token.kind) {
        case "text":
          return token.value;
        case "strong":
        case "em":
          return plainInline(token.value);
        case "code":
          return /^\/(?:guide|tools|app|brand-kit|portal|learn|create|utilities|start)(?:\/[\w-]+)*/.test(
            token.value,
          )
            ? humanizeInternalPath(token.value)
            : token.value;
        case "path":
          return humanizeInternalPath(token.value);
        case "md-link":
          return token.label;
        default:
          return "";
      }
    })
    .join("");
}

function flattenSections(sections: ModuleSection[]): GuideTocItem[] {
  const items: GuideTocItem[] = [];
  for (const section of sections) {
    items.push({ id: section.id, label: plainInline(section.title), level: 2 });
    for (const subsection of section.subsections ?? []) {
      items.push({
        id: subsection.id,
        label: plainInline(subsection.title),
        level: 3,
      });
    }
  }
  return items;
}

export function ModuleToc({
  sections,
  quizLabel,
  activeId,
}: {
  sections: ModuleSection[];
  quizLabel: string;
  activeId?: string;
}) {
  const items: GuideTocItem[] = [
    ...flattenSections(sections),
    { id: "module-quiz", label: quizLabel, level: 2 },
  ];

  return <GuideToc items={items} activeId={activeId} smoothScroll />;
}
