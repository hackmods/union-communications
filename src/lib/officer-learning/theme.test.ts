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
});
