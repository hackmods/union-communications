export const START_PATH_PROGRESS_KEY = "unionops-public-start-path-progress-v1";

export const START_PATHS = {
  comms: [
    { id: "brand", href: "/create/brand-kit" },
    { id: "blueprint", href: "/learn/communications-blueprint" },
    { id: "firstWeek", href: "/learn/first-week" },
    { id: "asset", href: "/create/graphic-maker" },
  ],
  steward: [
    { id: "orientation", href: "/learn/steward" },
    { id: "grievance", href: "/learn/grievance-process" },
    { id: "safety", href: "/learn/right-to-refuse" },
    { id: "meetings", href: "/learn/running-meetings" },
  ],
  officer: [
    { id: "learning", href: "/learn/officer" },
    { id: "governance", href: "/learn/bylaws" },
    { id: "bylawDraft", href: "/create/bylaw-builder" },
    { id: "meeting", href: "/learn/running-meetings" },
  ],
} as const;

export type StartPathId = keyof typeof START_PATHS;
export type StartPathProgress = {
  selectedPath: StartPathId | null;
  completedStepIds: Record<StartPathId, string[]>;
};

export const EMPTY_START_PATH_PROGRESS: StartPathProgress = {
  selectedPath: null,
  completedStepIds: { comms: [], steward: [], officer: [] },
};

export function isStartPathId(value: string): value is StartPathId {
  return Object.hasOwn(START_PATHS, value);
}

export function parseStartPathProgress(raw: string | null): StartPathProgress {
  if (!raw) return EMPTY_START_PATH_PROGRESS;
  try {
    const value = JSON.parse(raw) as Partial<StartPathProgress>;
    const completedStepIds = { ...EMPTY_START_PATH_PROGRESS.completedStepIds };
    for (const pathId of Object.keys(START_PATHS) as StartPathId[]) {
      const validStepIds = new Set(START_PATHS[pathId].map((step) => step.id));
      const candidate = value.completedStepIds?.[pathId];
      completedStepIds[pathId] = Array.isArray(candidate)
        ? [...new Set(candidate.filter((id): id is string =>
            typeof id === "string" && validStepIds.has(id as never),
          ))]
        : [];
    }
    return {
      selectedPath: typeof value.selectedPath === "string" && isStartPathId(value.selectedPath)
        ? value.selectedPath
        : null,
      completedStepIds,
    };
  } catch {
    return EMPTY_START_PATH_PROGRESS;
  }
}

export function toggleStartPathStep(
  progress: StartPathProgress,
  pathId: StartPathId,
  stepId: string,
): StartPathProgress {
  if (!START_PATHS[pathId].some((step) => step.id === stepId)) return progress;
  const completed = new Set(progress.completedStepIds[pathId]);
  if (completed.has(stepId)) completed.delete(stepId);
  else completed.add(stepId);
  return {
    ...progress,
    completedStepIds: {
      ...progress.completedStepIds,
      [pathId]: [...completed],
    },
  };
}
