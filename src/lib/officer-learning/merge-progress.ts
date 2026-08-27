import type { LearningProgressStore, ModuleProgress } from "./types";

function newerTimestamp(a?: string, b?: string): string | undefined {
  if (!a) return b;
  if (!b) return a;
  return a >= b ? a : b;
}

function mergeModuleProgress(
  local: ModuleProgress | undefined,
  remote: ModuleProgress | undefined,
): ModuleProgress | undefined {
  if (!local) return remote ? { ...remote } : undefined;
  if (!remote) return { ...local };

  const quizPassed = local.quizPassed || remote.quizPassed;
  const status = quizPassed
    ? "completed"
    : local.status === "completed" || remote.status === "completed"
      ? "completed"
      : local.status === "in_progress" || remote.status === "in_progress"
        ? "in_progress"
        : "not_started";

  return {
    status,
    quizPassed,
    scrollDepth: Math.max(local.scrollDepth, remote.scrollDepth),
    lastVisitedAt: newerTimestamp(local.lastVisitedAt, remote.lastVisitedAt),
  };
}

/** Merge device + Hub progress. Completed/quizPassed wins; else max scroll depth. */
export function mergeProgress(
  local: LearningProgressStore,
  remote: LearningProgressStore,
): LearningProgressStore {
  const ids = new Set([...Object.keys(local), ...Object.keys(remote)]);
  const next: LearningProgressStore = {};
  for (const id of ids) {
    const merged = mergeModuleProgress(local[id], remote[id]);
    if (merged) next[id] = merged;
  }
  return next;
}
