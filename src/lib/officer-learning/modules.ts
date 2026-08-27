import fs from "node:fs";
import path from "node:path";
import type { ModuleMeta, ParsedModule } from "./types";
import { estimateReadingMinutes, parseOfficerLearningModule } from "./parse-module";

export const OFFICER_LEARNING_MODULES: ModuleMeta[] = [
  {
    id: "module-1",
    slug: "contract-enforcement",
    number: 1,
    coverSrc: "/assets/officer-learning/module-1.webp",
    readingMinutes: 28,
  },
  {
    id: "module-2",
    slug: "progressive-discipline",
    number: 2,
    coverSrc: "/assets/officer-learning/module-2.webp",
    readingMinutes: 26,
  },
  {
    id: "module-3",
    slug: "human-rights-accommodation",
    number: 3,
    coverSrc: "/assets/officer-learning/module-3.webp",
    readingMinutes: 30,
  },
  {
    id: "module-4",
    slug: "democratic-governance",
    number: 4,
    coverSrc: "/assets/officer-learning/module-4.webp",
    readingMinutes: 25,
  },
  {
    id: "module-5",
    slug: "financial-health",
    number: 5,
    coverSrc: "/assets/officer-learning/module-5.webp",
    readingMinutes: 28,
  },
  {
    id: "module-6",
    slug: "building-collective-power",
    number: 6,
    coverSrc: "/assets/officer-learning/module-6.webp",
    readingMinutes: 28,
  },
];

const CONTENT_DIR = path.join(process.cwd(), "src/content/officer-learning");

export function getModuleBySlug(slug: string): ModuleMeta | undefined {
  return OFFICER_LEARNING_MODULES.find((m) => m.slug === slug);
}

export function getModuleById(id: string): ModuleMeta | undefined {
  return OFFICER_LEARNING_MODULES.find((m) => m.id === id);
}

export function loadParsedModule(id: string): ParsedModule {
  const filePath = path.join(CONTENT_DIR, `${id}.md`);
  const markdown = fs.readFileSync(filePath, "utf-8");
  const parsed = parseOfficerLearningModule(id, markdown);
  const meta = getModuleById(id);
  if (meta) {
    meta.readingMinutes = estimateReadingMinutes(parsed);
  }
  return parsed;
}

export function getNextModuleSlug(currentSlug: string): string | null {
  const index = OFFICER_LEARNING_MODULES.findIndex((m) => m.slug === currentSlug);
  if (index === -1 || index >= OFFICER_LEARNING_MODULES.length - 1) return null;
  return OFFICER_LEARNING_MODULES[index + 1].slug;
}
