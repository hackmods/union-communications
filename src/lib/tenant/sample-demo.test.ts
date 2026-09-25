import { describe, expect, it } from "vitest";
import {
  isSampleDemoLocal,
  isSampleDemoUnion,
} from "./sample-demo";

describe("sample-demo", () => {
  it("flags the Behind 7 Proxies seed union", () => {
    expect(isSampleDemoUnion({ id: "union-b7p" })).toBe(true);
    expect(isSampleDemoUnion({ slug: "b7p" })).toBe(true);
    expect(isSampleDemoUnion({ id: "union-opseu" })).toBe(false);
  });

  it("flags locals under the sample union or Postgres isDemo", () => {
    expect(isSampleDemoLocal({ unionId: "union-b7p" })).toBe(true);
    expect(isSampleDemoLocal({ isDemo: true })).toBe(true);
    expect(isSampleDemoLocal({ unionId: "union-real", isDemo: false })).toBe(
      false,
    );
  });
});
