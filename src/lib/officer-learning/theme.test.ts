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

  it("keeps learning cards steady and gives the full card a visible keyboard focus", () => {
    expect(olTheme.card).toContain("focus-visible:ring-2");
    expect(olTheme.card).toContain("motion-reduce:transition-none");
    expect(olTheme.card).not.toContain("hover:-translate-y");
  });
});
