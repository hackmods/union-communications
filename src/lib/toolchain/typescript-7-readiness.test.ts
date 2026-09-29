import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

/**
 * Enable this suite when TypeScript 7 + typescript-eslint lint runs without
 * scripts/run-lint.mjs bypass — see
 * docs/audit/session-knowledge-2026-09-29-typescript-7-upgrade.md
 */
describe.skip("TypeScript 7 toolchain readiness (enable after ESLint supports TS 7)", () => {
  it("runs ESLint without the run-lint.mjs TS7 bypass", () => {
    const runner = readFileSync("scripts/run-lint.mjs", "utf8");
    expect(runner).not.toMatch(/does not support TS 7 yet/);
  });

  it.todo("npm run lint passes on CI with typescript@7");
});

describe("TypeScript 7 readiness guards", () => {
  it("documents the lint bypass in run-lint.mjs until typescript-eslint supports TS 7", () => {
    const runner = readFileSync("scripts/run-lint.mjs", "utf8");
    expect(runner).toContain("session-knowledge-2026-09-29-typescript-7-upgrade");
  });
});
