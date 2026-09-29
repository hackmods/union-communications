import { describe, expect, it } from "vitest";
import { isCollectiveEmpty } from "@/lib/site-admin/collective-lifecycle";

describe("isCollectiveEmpty", () => {
  it("is empty only when no locals or users remain attached", () => {
    expect(
      isCollectiveEmpty({ locals: 0, activeLocals: 0, users: 0 }),
    ).toBe(true);
    expect(
      isCollectiveEmpty({ locals: 1, activeLocals: 0, users: 0 }),
    ).toBe(false);
    expect(
      isCollectiveEmpty({ locals: 0, activeLocals: 0, users: 1 }),
    ).toBe(false);
  });
});
