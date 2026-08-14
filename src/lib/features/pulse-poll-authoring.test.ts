import { describe, expect, it } from "vitest";
import { isPulsePollAuthoringEnabled } from "./pulse-poll-authoring";

describe("isPulsePollAuthoringEnabled", () => {
  it("follows Officer Hub public flag", () => {
    expect(isPulsePollAuthoringEnabled({})).toBe(false);
    expect(
      isPulsePollAuthoringEnabled({
        NEXT_PUBLIC_OFFICER_HUB_PUBLIC: "true",
      }),
    ).toBe(true);
    expect(
      isPulsePollAuthoringEnabled({
        NEXT_PUBLIC_OFFICER_HUB_PUBLIC: "false",
      }),
    ).toBe(false);
  });
});
