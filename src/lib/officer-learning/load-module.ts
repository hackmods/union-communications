import fs from "node:fs";
import path from "node:path";
import type { ParsedModule } from "./types";
import { getModuleById } from "./modules";
import { estimateReadingMinutes, parseOfficerLearningModule } from "./parse-module";

const CONTENT_DIR = path.join(process.cwd(), "src/content/officer-learning");

function moduleMarkdownPath(id: string, locale?: string): string {
  if (locale === "fr") {
    return path.join(CONTENT_DIR, "fr", `${id}.md`);
  }
  return path.join(CONTENT_DIR, `${id}.md`);
}

/** Server-only: reads module markdown from disk. Do not import from client components. */
export function loadParsedModule(id: string, locale?: string): ParsedModule {
  const filePath = moduleMarkdownPath(id, locale);
  const markdown = fs.readFileSync(filePath, "utf-8");
  const parsed = parseOfficerLearningModule(id, markdown);
  const meta = getModuleById(id);
  if (meta) {
    meta.readingMinutes = estimateReadingMinutes(parsed);
  }
  return parsed;
}
