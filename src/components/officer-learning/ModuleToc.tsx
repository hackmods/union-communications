"use client";

import type { ModuleSection } from "@/lib/officer-learning/types";
import { GuideToc, type GuideTocItem } from "@/components/comms/GuideToc";

function flattenSections(sections: ModuleSection[]): GuideTocItem[] {
  const items: GuideTocItem[] = [];
  for (const section of sections) {
    items.push({ id: section.id, label: section.title, level: 2 });
    for (const subsection of section.subsections ?? []) {
      items.push({
        id: subsection.id,
        label: subsection.title,
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

  return (
    <GuideToc items={items} activeId={activeId} variant="dark" smoothScroll />
  );
}
