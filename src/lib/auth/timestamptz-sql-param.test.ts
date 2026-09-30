import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  isSafeTimestamptzSqlParam,
  toTimestamptzSqlParam,
} from "@/lib/auth/timestamptz-sql-param";

describe("toTimestamptzSqlParam", () => {
  it("binds ISO-8601 from Date and epoch ms", () => {
    const instant = new Date("2026-09-30T23:10:25.493Z");
    expect(toTimestamptzSqlParam(instant)).toBe("2026-09-30T23:10:25.493Z");
    expect(toTimestamptzSqlParam(instant.getTime())).toBe(
      "2026-09-30T23:10:25.493Z",
    );
    expect(isSafeTimestamptzSqlParam(toTimestamptzSqlParam(instant))).toBe(true);
  });

  it("rejects Date#toString()-shaped strings", () => {
    const bad = String(new Date("2026-09-30T23:10:25.493Z"));
    expect(bad).toMatch(/^Wed |GMT/);
    expect(() => toTimestamptzSqlParam(bad)).toThrow(/rejected Date#toString/);
  });
});

describe("MFA auth SQL Date-bind guard", () => {
  it("does not interpolate bare Date identifiers into sql templates", () => {
    const authDir = join(process.cwd(), "src/lib/auth");
    const files = readdirSync(authDir).filter((name) => name.endsWith(".ts"));
    const offenders: string[] = [];
    const risky =
      /sql`[^`]*\$\{(?:cutoff|windowStartedAt|expiresAt|issuedAt)(?!\.toISOString)(?![A-Za-z0-9_])/s;

    for (const file of files) {
      const source = readFileSync(join(authDir, file), "utf8");
      if (risky.test(source)) {
        offenders.push(file);
      }
    }
    expect(offenders).toEqual([]);
  });
});
