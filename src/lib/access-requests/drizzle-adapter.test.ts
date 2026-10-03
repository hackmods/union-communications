import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

describe("DrizzleAccessRequestAdapter", () => {
  it("inserts public requests without RETURNING so RLS cannot void the row", () => {
    const src = readFileSync(
      join(process.cwd(), "src/lib/access-requests/drizzle-adapter.ts"),
      "utf8",
    );
    const createFn = src.slice(src.indexOf("async create"), src.indexOf("async list"));
    expect(createFn).toContain("insert(accessRequests)");
    expect(createFn).not.toContain(".returning(");
  });
});
