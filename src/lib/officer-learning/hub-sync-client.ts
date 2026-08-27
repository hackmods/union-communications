import { getAllProgress, replaceAllProgress } from "./progress";
import type { LearningProgressStore } from "./types";
import { mergeProgress } from "./merge-progress";

type MeRecord = {
  displayName: string;
  hubSyncEnabled: boolean;
  shareWithLocal: boolean;
  modules: LearningProgressStore;
};

export async function fetchHubLearningRecord(): Promise<MeRecord | null> {
  try {
    const res = await fetch("/api/officer-learning/me");
    if (!res.ok) return null;
    const data = (await res.json()) as { record: MeRecord };
    return data.record;
  } catch {
    return null;
  }
}

export async function pushHubProgress(input: {
  displayName: string;
  hubSyncEnabled: boolean;
  shareWithLocal: boolean;
  modules?: LearningProgressStore;
}): Promise<boolean> {
  try {
    const res = await fetch("/api/officer-learning/me", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        displayName: input.displayName,
        hubSyncEnabled: input.hubSyncEnabled,
        shareWithLocal: input.shareWithLocal,
        modules: input.modules ?? getAllProgress(),
      }),
    });
    return res.ok;
  } catch {
    return false;
  }
}

/** Hydrate localStorage from Hub and return merged store. */
export async function hydrateProgressFromHub(): Promise<{
  progress: LearningProgressStore;
  record: MeRecord | null;
}> {
  const record = await fetchHubLearningRecord();
  if (!record) {
    return { progress: getAllProgress(), record: null };
  }
  const merged = mergeProgress(getAllProgress(), record.modules ?? {});
  replaceAllProgress(merged);
  return { progress: merged, record };
}

/** After quiz pass: push if the account already opted into Hub sync. */
export async function maybePushHubProgressAfterPass(): Promise<void> {
  const record = await fetchHubLearningRecord();
  if (!record?.hubSyncEnabled) return;
  await pushHubProgress({
    displayName: record.displayName || "Steward",
    hubSyncEnabled: true,
    shareWithLocal: record.shareWithLocal,
    modules: getAllProgress(),
  });
}
