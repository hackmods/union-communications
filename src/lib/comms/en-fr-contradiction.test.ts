import { describe, expect, it } from "vitest";
import en from "../../../messages/en.json";
import fr from "../../../messages/fr.json";

/**
 * Lightweight EN↔FR contradiction guards for known hot keys.
 * Not full translation QA — only antonym / inverted-claim pairs.
 */

type LeafWalk = { path: string; value: string };

function walkLeaves(
  value: unknown,
  prefix = "",
  out: LeafWalk[] = [],
): LeafWalk[] {
  if (typeof value === "string") {
    out.push({ path: prefix, value });
    return out;
  }
  if (value && typeof value === "object" && !Array.isArray(value)) {
    for (const [key, child] of Object.entries(value)) {
      walkLeaves(child, prefix ? `${prefix}.${key}` : key, out);
    }
  }
  return out;
}

function getByPath(root: unknown, path: string): string | undefined {
  const parts = path.split(".");
  let cur: unknown = root;
  for (const part of parts) {
    if (!cur || typeof cur !== "object") return undefined;
    cur = (cur as Record<string, unknown>)[part];
  }
  return typeof cur === "string" ? cur : undefined;
}

describe("EN/FR contradiction heuristics", () => {
  it("photo consent FR does not invert the group-photo consent claim", () => {
    const enLeaves = walkLeaves(en.photoConsentGuide, "photoConsentGuide");
    for (const leaf of enLeaves) {
      if (!/prefer group photos|group photos over/i.test(leaf.value)) continue;
      const frValue = getByPath(fr, leaf.path);
      expect(frValue, leaf.path).toBeTruthy();
      expect(frValue!).not.toMatch(/sans consentement individuel/i);
      expect(frValue!.toLowerCase()).toMatch(/consentement|groupe|photo/);
    }
  });
});
