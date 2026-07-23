import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { describe, expect, it } from "vitest";

const API_ROOT = join(process.cwd(), "src", "app", "api");

/** Public or framework routes that must not require Officer Hub auth. */
const PUBLIC_API_ROUTES = new Set([
  "auth/[...nextauth]/route.ts",
  "health/route.ts",
  // Invite accept uses the token as the capability secret (SEC-007).
  "invites/[token]/route.ts",
]);

function walkRouteFiles(dir: string): string[] {
  const out: string[] = [];
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) {
      out.push(...walkRouteFiles(full));
    } else if (name === "route.ts") {
      out.push(full);
    }
  }
  return out;
}

const AUTH_MARKERS = [
  "auth()",
  "requireGrievanceSession",
  "requireBumpingSession",
  "requireTimeSession",
  "requireTaskSession",
  "requireDiscussionsSession",
];

describe("API route auth coverage", () => {
  it("every confidential API route enforces auth()/require*Session", () => {
    const routes = walkRouteFiles(API_ROOT);
    expect(routes.length).toBeGreaterThan(10);

    const gaps: string[] = [];
    for (const file of routes) {
      const rel = relative(API_ROOT, file).replace(/\\/g, "/");
      if (PUBLIC_API_ROUTES.has(rel)) continue;
      const src = readFileSync(file, "utf8");
      const protectedRoute = AUTH_MARKERS.some((m) => src.includes(m));
      if (!protectedRoute) gaps.push(rel);
    }

    expect(gaps).toEqual([]);
  });
});
