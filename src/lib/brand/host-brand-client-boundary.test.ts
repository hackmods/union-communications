import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

async function agentLog(
  hypothesisId: string,
  message: string,
  data: Record<string, unknown>,
) {
  // #region agent log
  await fetch(
    "http://127.0.0.1:7911/ingest/3d68b2c0-ac88-4c57-b4e8-72926e068c79",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Debug-Session-Id": "3d2c18",
      },
      body: JSON.stringify({
        sessionId: "3d2c18",
        runId: "pre-fix-verify",
        hypothesisId,
        location: "host-brand-client-boundary.test.ts",
        message,
        data,
        timestamp: Date.now(),
      }),
    },
  ).catch(() => {});
  // #endregion
}

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

  it("tenant overlay resolves host brand via client-safe module only", async () => {
    const src = readFileSync(join(root, "lib/tenant/overlay.ts"), "utf8");
    const imports = importLines(src);
    const importsStore = imports.some((line) =>
      line.includes("@/lib/brand/host-brand-store"),
    );
    const importsOverlay = imports.some((line) =>
      line.includes("@/lib/brand/host-brand-overlay"),
    );
    const importsNodeCrypto = imports.some((line) =>
      /from\s+["']crypto["']/.test(line),
    );
    const importsDb = imports.some((line) => line.includes("@/lib/db/"));
    await agentLog("H1", "overlay import graph", {
      importsStore,
      importsOverlay,
      importsNodeCrypto,
      importsDb,
    });
    expect(importsOverlay).toBe(true);
    expect(importsStore).toBe(false);
    expect(importsNodeCrypto).toBe(false);
    expect(importsDb).toBe(false);
  });

  it("host-brand-overlay has no DB or postgres imports", async () => {
    const src = readFileSync(
      join(root, "lib/brand/host-brand-overlay.ts"),
      "utf8",
    );
    const imports = importLines(src);
    const hasDb = imports.some((line) => line.includes("@/lib/db/"));
    const hasPostgres = imports.some((line) => line.includes("postgres"));
    const hasDrizzle = imports.some((line) => line.includes("drizzle-orm"));
    await agentLog("H2", "host-brand-overlay purity", {
      hasDb,
      hasPostgres,
      hasDrizzle,
    });
    expect(hasDb).toBe(false);
    expect(hasPostgres).toBe(false);
    expect(hasDrizzle).toBe(false);
  });

  it("host-brand-store mutates the shared overlay module", async () => {
    const src = readFileSync(
      join(root, "lib/brand/host-brand-store.ts"),
      "utf8",
    );
    const hasLocalOverlayState =
      /let hostBrandOverlay:\s*Partial<HostBrandDefaults>\s*\|\s*null/.test(
        src,
      );
    await agentLog("H3", "host-brand-store shared state", {
      usesSetHostBrandOverlay: src.includes("setHostBrandOverlay"),
      hasLocalOverlayState,
    });
    expect(src).toContain("setHostBrandOverlay");
    expect(src).toContain('from "@/lib/brand/host-brand-overlay"');
    expect(hasLocalOverlayState).toBe(false);
  });
});
