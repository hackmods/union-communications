import type { ModuleMeta } from "./types";

/** Client-safe module catalog (no Node fs). Load markdown via `load-module.ts` on the server. */
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
  {
    id: "module-7",
    slug: "mobilizer-bargaining-partner",
    number: 7,
    coverSrc: "/assets/officer-learning/module-7.webp",
    readingMinutes: 32,
  },
  {
    id: "module-8",
    slug: "advanced-grievance-settlement",
    number: 8,
    coverSrc: "/assets/officer-learning/module-8.webp",
    readingMinutes: 32,
  },
  {
    id: "module-9",
    slug: "benefits-disability-claims",
    number: 9,
    coverSrc: "/assets/officer-learning/module-9.webp",
    readingMinutes: 30,
  },
  {
    id: "module-10",
    slug: "joint-workplace-committees",
    number: 10,
    coverSrc: "/assets/officer-learning/module-10.webp",
    readingMinutes: 28,
  },
  {
    id: "module-11",
    slug: "membership-lists-privacy",
    number: 11,
    coverSrc: "/assets/officer-learning/module-11.webp",
    readingMinutes: 30,
  },
  {
    id: "module-12",
    slug: "advanced-local-finance",
    number: 12,
    coverSrc: "/assets/officer-learning/module-12.webp",
    readingMinutes: 32,
  },
  {
    id: "module-13",
    slug: "digital-security-transitions",
    number: 13,
    coverSrc: "/assets/officer-learning/module-13.webp",
    readingMinutes: 30,
  },
  {
    id: "module-14",
    slug: "everyday-union-value",
    number: 14,
    coverSrc: "/assets/officer-learning/module-14.webp",
    readingMinutes: 28,
  },
];

export function getModuleBySlug(slug: string): ModuleMeta | undefined {
  return OFFICER_LEARNING_MODULES.find((m) => m.slug === slug);
}

export function getModuleById(id: string): ModuleMeta | undefined {
  return OFFICER_LEARNING_MODULES.find((m) => m.id === id);
}

export function getNextModuleSlug(currentSlug: string): string | null {
  const index = OFFICER_LEARNING_MODULES.findIndex((m) => m.slug === currentSlug);
  if (index === -1 || index >= OFFICER_LEARNING_MODULES.length - 1) return null;
  return OFFICER_LEARNING_MODULES[index + 1].slug;
}
