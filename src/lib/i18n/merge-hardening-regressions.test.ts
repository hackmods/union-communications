/**
 * Guards against the merge failures that shipped blank Site Admin MFA copy
 * and Hub→Portal API calls that 403 under hosted MFA.
 */
import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";
import en from "../../../messages/en.json";
import fr from "../../../messages/fr.json";

const REQUIRED_PLATFORM_OPERATOR_KEYS = [
  "incidentsCardTitle",
  "incidents.title",
  "subprocessorsCardTitle",
  "subprocessors.title",
  "operatorAuditMfaRequired",
  "operatorAuditMfaSubmit",
  "assignLocalStepUpRequired",
  "assignLocalMfaCode",
  "editRolesStepUpRequired",
  "editRolesMfaCode",
  "accessRequestsMfaRequired",
  "accessRequestsReload",
] as const;

function hasPath(obj: unknown, dotted: string): boolean {
  const parts = dotted.split(".");
  let cur: unknown = obj;
  for (const part of parts) {
    if (cur == null || typeof cur !== "object" || !(part in cur)) return false;
    cur = (cur as Record<string, unknown>)[part];
  }
  return true;
}

function walk(dir: string, out: string[] = []): string[] {
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, ent.name);
    if (ent.isDirectory()) {
      if (["node_modules", ".git", ".next", "dist", "coverage"].includes(ent.name)) {
        continue;
      }
      walk(full, out);
    } else if (/\.(tsx|ts)$/.test(ent.name)) {
      out.push(full);
    }
  }
  return out;
}

describe("merge-hardening regressions", () => {
  it("keeps Site Admin MFA / register copy present in EN and FR", () => {
    const missingEn = REQUIRED_PLATFORM_OPERATOR_KEYS.filter(
      (key) => !hasPath(en.hub.platformOperator, key),
    );
    const missingFr = REQUIRED_PLATFORM_OPERATOR_KEYS.filter(
      (key) => !hasPath(fr.hub.platformOperator, key),
    );
    expect(missingEn, `EN missing: ${missingEn.join(", ")}`).toEqual([]);
    expect(missingFr, `FR missing: ${missingFr.join(", ")}`).toEqual([]);
  });

  it("does not let Hub/onboarding/site-admin clients call Portal APIs", () => {
    const root = path.join(process.cwd(), "src");
    const files = walk(root).filter((file) => {
      const norm = file.replaceAll("\\", "/");
      return (
        !norm.includes("/components/portal/") &&
        !norm.includes("/app/[locale]/portal/") &&
        !norm.includes("/app/api/portal/") &&
        !norm.endsWith(".test.ts")
      );
    });
    const offenders: string[] = [];
    const fetchRe = /fetch\(\s*[`'"](\/api\/portal\/[^`'"]*)[`'"]/g;
    for (const file of files) {
      const text = fs.readFileSync(file, "utf8");
      if (!fetchRe.test(text)) continue;
      fetchRe.lastIndex = 0;
      let match: RegExpExecArray | null;
      while ((match = fetchRe.exec(text))) {
        offenders.push(`${file.replaceAll("\\", "/")}: ${match[1]}`);
      }
    }
    expect(offenders, offenders.join("\n")).toEqual([]);
  });

  it("resolves every useTranslations / getTranslations namespace in EN+FR", () => {
    const root = path.join(process.cwd(), "src");
    const files = walk(root).filter((file) => !file.endsWith(".test.ts"));
    const nsRe =
      /(?:useTranslations|getTranslations)\(\s*(?:\{[^}]*namespace:\s*)?["']([^"']+)["']/g;
    const namespaces = new Set<string>();
    for (const file of files) {
      const text = fs.readFileSync(file, "utf8");
      let match: RegExpExecArray | null;
      while ((match = nsRe.exec(text))) namespaces.add(match[1]);
    }
    const missing = [...namespaces]
      .sort()
      .filter((ns) => !hasPath(en, ns) || !hasPath(fr, ns));
    expect(missing, missing.join("\n")).toEqual([]);
  });
});
