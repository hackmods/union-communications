import { describe, expect, it } from "vitest";
import { isWorkforceTimeEnabled } from "./workforce-time";

describe("isWorkforceTimeEnabled", () => {
  it("defaults off when unset", () => {
    expect(isWorkforceTimeEnabled({})).toBe(false);
    expect(
      isWorkforceTimeEnabled({ NEXT_PUBLIC_WORKFORCE_TIME_ENABLED: undefined }),
    ).toBe(false);
  });

  it("accepts true/1/yes", () => {
    expect(
      isWorkforceTimeEnabled({ NEXT_PUBLIC_WORKFORCE_TIME_ENABLED: "true" }),
    ).toBe(true);
    expect(
      isWorkforceTimeEnabled({ NEXT_PUBLIC_WORKFORCE_TIME_ENABLED: "1" }),
    ).toBe(true);
    expect(
      isWorkforceTimeEnabled({ NEXT_PUBLIC_WORKFORCE_TIME_ENABLED: "YES" }),
    ).toBe(true);
  });

  it("rejects other values", () => {
    expect(
      isWorkforceTimeEnabled({ NEXT_PUBLIC_WORKFORCE_TIME_ENABLED: "false" }),
    ).toBe(false);
    expect(
      isWorkforceTimeEnabled({ NEXT_PUBLIC_WORKFORCE_TIME_ENABLED: "no" }),
    ).toBe(false);
  });
});
