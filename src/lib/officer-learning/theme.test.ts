import { describe, expect, it } from "vitest";
import { olTheme } from "./theme";

describe("officer learning theme", () => {
  it("uses platform light chrome, not the retired navy shell", () => {
    expect(olTheme.shell).toContain("bg-background");
    expect(olTheme.shell).toContain("text-opseu-dark");
    expect(olTheme.shell).not.toContain("#0B132B");
    expect(olTheme.progressBar).toContain("bg-opseu-blue");
    expect(olTheme.eyebrow).toContain("text-opseu-blue");
  });

  it("keeps sources in the shared shell, not a nested max-w-prose island", () => {
    expect(olTheme.sourcesSection).toContain("mt-12");
    expect(olTheme.sourcesSection).not.toContain("max-w-prose");
    expect(olTheme.sourcesIntro).toContain("max-w-3xl");
  });
});