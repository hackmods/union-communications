import { describe, expect, it } from "vitest";
import {
  hubIdentityHeading,
  hubIdentityLocalLine,
} from "./hub-home-identity";

describe("hub home identity", () => {
  it("uses the live union name and omits an empty local number", () => {
    expect(
      hubIdentityHeading({
        unionName: "Behind 7 Proxies",
        pendingFallback: "Your Officer Hub",
      }),
    ).toBe("Behind 7 Proxies");
    expect(
      hubIdentityLocalLine({
        localNumber: "  ",
        localLabel: (number) => `Local ${number}`,
      }),
    ).toBeNull();
  });

  it("does not invent Local 777 when the session has no local number", () => {
    expect(
      hubIdentityHeading({
        unionName: "  ",
        pendingFallback: "Your Officer Hub",
      }),
    ).toBe("Your Officer Hub");
    expect(
      hubIdentityLocalLine({
        localNumber: null,
        localLabel: () => "Local 777",
      }),
    ).toBeNull();
  });

  it("labels a real local number without a preview fallback", () => {
    expect(
      hubIdentityLocalLine({
        localNumber: "243",
        localLabel: (number) => `Local ${number}`,
      }),
    ).toBe("Local 243");
  });
});
