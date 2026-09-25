import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { PUBLIC_PATHS } from "@/app/sitemap";
import { OFFICER_LEARNING_MODULES } from "@/lib/officer-learning/modules";
import { parseOfficerLearningModule } from "@/lib/officer-learning/parse-module";
import { humanizeInternalPath, tokenizeInline } from "@/lib/officer-learning/inline-markdown";

const ROOT = process.cwd();

function walk(dir: string, acc: string[] = []): string[] {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === "node_modules" || entry.name === ".next") continue;
      walk(full, acc);
    } else {
      acc.push(full);
    }
  }
  return acc;
}

describe("union audit source guards", () => {
  it("sitemap includes library hub, library shelves, and /app", () => {
    expect(PUBLIC_PATHS).toContain("/learn/library");
    expect(PUBLIC_PATHS).toContain("/learn/library/examples");
    expect(PUBLIC_PATHS).toContain("/learn/library/captions");
    expect(PUBLIC_PATHS).toContain("/learn/library/brand-assets");
    expect(PUBLIC_PATHS).toContain("/app");
  });

  it("tokenizeInline consumes backticks and bold without leaking markers", () => {
    const flat = (text: string) =>
      tokenizeInline(text)
        .map((token) => {
          if (token.kind === "text") return token.value;
          if (token.kind === "strong") return token.value;
          if (token.kind === "code" || token.kind === "path") {
            return humanizeInternalPath(token.kind === "code" ? token.value : token.value);
          }
          if (token.kind === "md-link") return token.label;
          if (token.kind === "em") return token.value;
          return "";
        })
        .join("");
    const out = flat("Pair with `/guide/strike` and **not** this.");
    expect(out).not.toContain("`");
    expect(out).not.toContain("**");
    expect(out).toContain("Strike");
    expect(out).toContain("not");
  });

  it("officer module how-to lead minutes match modules.ts SSOT", () => {
    for (const meta of OFFICER_LEARNING_MODULES) {
      const md = fs.readFileSync(
        path.join(ROOT, "src/content/officer-learning", `${meta.id}.md`),
        "utf8",
      );
      const lead = md
        .split(/\n/)
        .slice(0, 20)
        .find((line) => /^Allow \*\*/.test(line));
      expect(lead, meta.id).toBeTruthy();
      expect(lead).toContain(String(meta.readingMinutes));
    }
  });

  it("callouts strip Warning/Note labels from body text", () => {
    const parsed = parseOfficerLearningModule(
      "module-test",
      `# Module 99: Test

## Overarching Purpose
Purpose.

## Core Learning Objectives
*   **Know**: One
*   **Feel**: Two
*   **Be Able To**: Three

## Section
⚠️ Warning: Body without repeated title.

## Self-Test Quiz
### Question 1
Prompt?
*   A) One
*   B) Two
*   C) Three
*   D) Four
**Correct Answer: A**
*Explanation*: Because.
`,
    );
    const callout = parsed.sections
      .flatMap((s) => s.blocks)
      .find((b) => b.type === "callout");
    expect(callout?.type).toBe("callout");
    if (callout?.type === "callout") {
      expect(callout.text.toLowerCase().startsWith("warning")).toBe(false);
      expect(callout.text).toContain("Body without repeated title");
    }
  });

  it("rejects literal bullet character pseudo-lists in Learn guide pages", () => {
    const pages = walk(path.join(ROOT, "src/app")).filter((p) =>
      /guide|learn|officer-learning|examples|captions|assets|library/.test(p) &&
      p.endsWith("page.tsx"),
    );
    const offenders: string[] = [];
    for (const file of pages) {
      const text = fs.readFileSync(file, "utf8");
      if (text.includes("•")) offenders.push(path.relative(ROOT, file));
    }
    expect(offenders).toEqual([]);
  });

  it("rejects nested Button inside Link in examples/assets components", () => {
    const files = [
      "src/components/examples/ExampleCard.tsx",
      "src/components/comms/AssetPackPanel.tsx",
    ];
    for (const file of files) {
      const text = fs.readFileSync(path.join(ROOT, file), "utf8");
      expect(text).not.toMatch(/<Link[^>]*>\s*<Button/);
    }
  });
});
