import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import type { LoadLabSummary } from "./types";
import { formatSummaryMarkdown } from "./summary-format";

export { formatSummaryMarkdown, parseSummaryJson } from "./summary-format";

export function resultsDir(
  env: NodeJS.ProcessEnv = process.env,
): string {
  return (
    env.LOAD_LAB_RESULTS_DIR?.trim() ||
    path.join(process.cwd(), "load-results")
  );
}

export async function writeSummary(
  summary: LoadLabSummary,
  env: NodeJS.ProcessEnv = process.env,
): Promise<{ jsonPath: string; mdPath: string }> {
  const dir = path.join(resultsDir(env), summary.runId);
  await mkdir(dir, { recursive: true });
  const jsonPath = path.join(dir, "summary.json");
  const mdPath = path.join(dir, "summary.md");
  await writeFile(jsonPath, `${JSON.stringify(summary, null, 2)}\n`, "utf8");
  await writeFile(mdPath, formatSummaryMarkdown(summary), "utf8");
  return { jsonPath, mdPath };
}
