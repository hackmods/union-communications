import type { LearningProgressStore, ModuleProgress, ModuleStatus } from "./types";

export const OFFICER_LEARNING_PROGRESS_KEY = "unionops-officer-learning-progress";

const DEFAULT_PROGRESS: ModuleProgress = {
  status: "not_started",
  scrollDepth: 0,
  quizPassed: false,
};

function readStore(): LearningProgressStore {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(OFFICER_LEARNING_PROGRESS_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as LearningProgressStore;
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

function writeStore(store: LearningProgressStore): boolean {
  if (typeof window === "undefined") return false;
  try {
    window.localStorage.setItem(OFFICER_LEARNING_PROGRESS_KEY, JSON.stringify(store));
    return true;
  } catch {
    return false;
  }
}

export function getModuleProgress(moduleId: string): ModuleProgress {
  return readStore()[moduleId] ?? { ...DEFAULT_PROGRESS };
}

export function getAllProgress(): LearningProgressStore {
  return readStore();
}

export function markModuleOpened(moduleId: string): ModuleProgress {
  const store = readStore();
  const existing = store[moduleId] ?? { ...DEFAULT_PROGRESS };
  const next: ModuleProgress = {
    ...existing,
    status: existing.quizPassed ? "completed" : "in_progress",
    lastVisitedAt: new Date().toISOString(),
  };
  store[moduleId] = next;
  writeStore(store);
  return next;
}

export function updateScrollDepth(moduleId: string, depth: number): ModuleProgress {
  const store = readStore();
  const existing = store[moduleId] ?? { ...DEFAULT_PROGRESS };
  const clamped = Math.max(0, Math.min(100, Math.round(depth)));
  const next: ModuleProgress = {
    ...existing,
    scrollDepth: Math.max(existing.scrollDepth, clamped),
    status: existing.quizPassed
      ? "completed"
      : clamped > 0 || existing.status === "in_progress"
        ? "in_progress"
        : existing.status,
    lastVisitedAt: new Date().toISOString(),
  };
  store[moduleId] = next;
  writeStore(store);
  return next;
}

export function markQuizPassed(moduleId: string): ModuleProgress {
  const store = readStore();
  const existing = store[moduleId] ?? { ...DEFAULT_PROGRESS };
  const next: ModuleProgress = {
    ...existing,
    status: "completed",
    quizPassed: true,
    scrollDepth: 100,
    lastVisitedAt: new Date().toISOString(),
  };
  store[moduleId] = next;
  writeStore(store);
  return next;
}

export function resetAllProgress(): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(OFFICER_LEARNING_PROGRESS_KEY);
  } catch {
    /* quota / private mode */
  }
}

export function statusLabelKey(status: ModuleStatus): string {
  switch (status) {
    case "completed":
      return "progress.completed";
    case "in_progress":
      return "progress.inProgress";
    default:
      return "progress.notStarted";
  }
}
