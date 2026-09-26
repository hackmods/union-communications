import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

/**
 * Regression guard: separate history + index atoms reintroduced the punch-error
 * wall when Brand Kit / OPSEU theme seeded logo in the same tick as hydrate.
 */
describe("useUndoRedo source guard", () => {
  it("keeps history entries and index in one state atom", () => {
    const source = readFileSync(
      join(process.cwd(), "src/hooks/use-undo-redo.ts"),
      "utf8",
    );
    expect(source).toMatch(/type HistoryState</);
    expect(source).toMatch(/useState<HistoryState/);
    expect(source).not.toMatch(/const \[index,\s*setIndex\]\s*=\s*useState/);
    expect(source).not.toMatch(
      /const \[history,\s*setHistory\]\s*=\s*useState<T\[\]>/,
    );
  });
});