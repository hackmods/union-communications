"use client";

import clsx from "clsx";
import type { ModuleSection } from "@/lib/officer-learning/types";

type TocItem = {
  id: string;
  title: string;
  level: 2 | 3;
};

function flattenSections(sections: ModuleSection[]): TocItem[] {
  const items: TocItem[] = [];
  for (const section of sections) {
    items.push({ id: section.id, title: section.title, level: 2 });
    for (const subsection of section.subsections ?? []) {
      items.push({ id: subsection.id, title: subsection.title, level: 3 });
    }
  }
  items.push({ id: "module-quiz", title: "Quiz", level: 2 });
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
  const items = flattenSections(sections).map((item) =>
    item.id === "module-quiz" ? { ...item, title: quizLabel } : item,
  );

  return (
    <nav aria-label="Table of contents" className="space-y-1">
      {items.map((item) => (
        <a
          key={item.id}
          href={`#${item.id}`}
          className={clsx(
            "block rounded-lg px-3 py-2 text-sm transition-colors",
            item.level === 3 && "pl-5",
            activeId === item.id
              ? "bg-teal-500/20 font-semibold text-teal-100"
              : "text-slate-300 hover:bg-white/5 hover:text-white",
          )}
        >
          {item.title}
        </a>
      ))}
    </nav>
  );
}
