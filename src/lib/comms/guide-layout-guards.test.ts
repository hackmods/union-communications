import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";

const GUIDE_APP_ROOT = path.join(
  process.cwd(),
  "src",
  "app",
  "[locale]",
  "guide",
);

function walkTsx(dir: string): string[] {
  const out: string[] = [];
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, ent.name);
    if (ent.isDirectory()) out.push(...walkTsx(p));
    else if (ent.name.endsWith(".tsx")) out.push(p);
  }
  return out;
}

/**
 * GB-008 — stop page-local GuideSection / TipItem copies and dual GuideLayout imports.
 */
describe("guide layout regression guards", () => {
  const files = walkTsx(GUIDE_APP_ROOT);

  it("finds guide page files", () => {
    expect(files.length).toBeGreaterThan(10);
  });

  it("forbids local GuideSection / TipItem helper definitions", () => {
    const offenders: string[] = [];
    for (const file of files) {
      const src = fs.readFileSync(file, "utf8");
      if (
        /\bfunction\s+GuideSection\b/.test(src) ||
        /\bfunction\s+TipItem\b/.test(src) ||
        /\bconst\s+TipItem\s*=/.test(src) ||
        /\bfunction\s+ItemList\b/.test(src)
      ) {
        offenders.push(path.relative(process.cwd(), file));
      }
    }
    expect(offenders).toEqual([]);
  });

  it("imports GuideLayout only via guide-ui barrel", () => {
    const offenders: string[] = [];
    for (const file of files) {
      const src = fs.readFileSync(file, "utf8");
      if (
        /from\s*["']@\/components\/comms\/GuideLayout["']/.test(src) ||
        /from\s*["']@\/components\/ui\/Callout["']/.test(src)
      ) {
        offenders.push(path.relative(process.cwd(), file));
      }
    }
    expect(offenders).toEqual([]);
  });
});
