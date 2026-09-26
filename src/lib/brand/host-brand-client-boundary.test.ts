import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

function importLines(src: string): string[] {
  return src
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.startsWith("import "));
}

/**
 * Regression guard for CapRover/Turbopack: client + Edge graphs must not
 * import host-brand-store (which pulls `postgres` / Node `fs`/`net`/`tls`).
 */
describe("host-brand client/Edge boundary", () => {
  const root = join(process.cwd(), "src");

  it("tenant overlay resolves host brand via client-safe module only", () => {
    const src = readFileSync(join(root, "lib/tenant/overlay.ts"), "utf8");
    const imports = importLines(src);
    expect(
      imports.some((line) => line.includes("@/lib/brand/host-brand-overlay")),
    ).toBe(true);
    expect(
      imports.some((line) => line.includes("@/lib/brand/host-brand-store")),
    ).toBe(false);
    expect(imports.some((line) => /from\s+["']crypto["']/.test(line))).toBe(
      false,
    );
    expect(imports.some((line) => line.includes("@/lib/db/"))).toBe(false);
  });

  it("host-brand-overlay has no DB or postgres imports", () => {
    const src = readFileSync(
      join(root, "lib/brand/host-brand-overlay.ts"),
      "utf8",
    );
    const imports = importLines(src);
    expect(imports.some((line) => line.includes("@/lib/db/"))).toBe(false);
    expect(imports.some((line) => line.includes("postgres"))).toBe(false);
    expect(imports.some((line) => line.includes("drizzle-orm"))).toBe(false);
  });

  it("host-brand-store mutates the shared overlay module", () => {
    const src = readFileSync(
      join(root, "lib/brand/host-brand-store.ts"),
      "utf8",
    );
    expect(src).toContain("setHostBrandOverlay");
    expect(src).toContain('from "@/lib/brand/host-brand-overlay"');
    expect(
      /let hostBrandOverlay:\s*Partial<HostBrandDefaults>\s*\|\s*null/.test(src),
    ).toBe(false);
  });
});
