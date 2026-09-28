import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { resultsDir, parseSummaryJson } from "./report";
import type { LoadLabSummary } from "./types";

/**
 * After a CapRover/process restart, in-memory state is gone — recover the
 * newest on-disk summary.json if present.
 */
export async function loadLatestSummaryFromDisk(
  env: NodeJS.ProcessEnv = process.env,
): Promise<LoadLabSummary | null> {
  const root = resultsDir(env);
  let entries: string[];
  try {
    entries = await readdir(root);
  } catch {
    return null;
  }
  const dirs = entries.sort().reverse();
  for (const name of dirs.slice(0, 20)) {
    try {
      const raw = await readFile(
        path.join(root, name, "summary.json"),
        "utf8",
      );
      const parsed = parseSummaryJson(JSON.parse(raw) as unknown);
      if (parsed) return parsed;
    } catch {
      /* try next */
    }
  }
  return null;
}
