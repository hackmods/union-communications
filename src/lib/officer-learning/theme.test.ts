import { describe, expect, it } from "vitest";
import { getOlTheme, olThemeLight, olThemeNavy } from "./theme";

describe("officer learning theme", () => {
  it("navy shell uses the training navy and light does not", () => {
    expect(olThemeNavy.shell).toContain("#0B132B");
    expect(olThemeLight.shell).not.toContain("#0B132B");
  });

  it("navy and light expose the same keys", () => {
    expect(Object.keys(olThemeLight).sort()).toEqual(
      Object.keys(olThemeNavy).sort(),
    );
  });

  it("getOlTheme selects by colour", () => {
    expect(getOlTheme("navy")).toBe(olThemeNavy);
    expect(getOlTheme("light")).toBe(olThemeLight);
  });
});
