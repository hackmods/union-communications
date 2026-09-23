import { describe, expect, it } from "vitest";
import { isDemoPurgeEnabled } from "./demo-purge";

describe("isDemoPurgeEnabled", () => {
  it("defaults to off when unset", () => {
    expect(isDemoPurgeEnabled({})).toBe(false);
  });

  it("is on for true/1/yes", () => {
    expect(isDemoPurgeEnabled({ SITE_ADMIN_DEMO_PURGE_ENABLED: "true" })).toBe(
      true,
    );
    expect(isDemoPurgeEnabled({ SITE_ADMIN_DEMO_PURGE_ENABLED: "1" })).toBe(
      true,
    );
    expect(isDemoPurgeEnabled({ SITE_ADMIN_DEMO_PURGE_ENABLED: "yes" })).toBe(
      true,
    );
    expect(
      isDemoPurgeEnabled({ SITE_ADMIN_DEMO_PURGE_ENABLED: " TRUE " }),
    ).toBe(true);
  });

  it("is off for false/other values", () => {
    expect(isDemoPurgeEnabled({ SITE_ADMIN_DEMO_PURGE_ENABLED: "false" })).toBe(
      false,
    );
    expect(isDemoPurgeEnabled({ SITE_ADMIN_DEMO_PURGE_ENABLED: "0" })).toBe(
      false,
    );
    expect(isDemoPurgeEnabled({ SITE_ADMIN_DEMO_PURGE_ENABLED: "no" })).toBe(
      false,
    );
  });
});
