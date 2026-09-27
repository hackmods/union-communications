import { describe, expect, it } from "vitest";
import { initialRegistryImportStatus, LAUNCH_DRAFT_SEEDS, policyDraftStatusCopy, toLaunchDraftPayload } from "./launch-drafts";

describe("enterprise launch draft seeds", () => {
  it("keeps imported policy statements in draft until reviewed", () => {
    expect(initialRegistryImportStatus("policy")).toBe("draft");
    expect(initialRegistryImportStatus("file")).toBe("published");
    expect(initialRegistryImportStatus("external")).toBe("published");
  });

  it("shows an accurate not-in-effect notice in English and French", () => {
    expect(policyDraftStatusCopy("en")).toMatchObject({ label: "[DRAFT / NOT YET IN EFFECT]", effectiveDate: "Not yet in effect" });
    expect(policyDraftStatusCopy("fr")).toMatchObject({ label: "[BROUILLON / PAS ENCORE EN VIGUEUR]", effectiveDate: "Pas encore en vigueur" });
    expect(policyDraftStatusCopy("fr").notice).not.toBe(policyDraftStatusCopy("en").notice);
  });

  it("includes each required internal operating procedure and a public DPA draft", () => {
    const bySlug = new Map(LAUNCH_DRAFT_SEEDS.map((seed) => [seed.slug, seed]));
    for (const slug of [
      "incident-response", "privacy-requests", "retention-deletion", "access-mfa",
      "security-operations", "vulnerability-management", "logging-alerts", "backup-restore",
      "casl-marketing", "subprocessor-review", "data-inventory", "privacy-impact-assessment",
      "accessibility-remediation",
    ]) {
      expect(bySlug.get(slug)?.visibility).toBe("internal");
    }
    expect(bySlug.get("terms")?.visibility).toBe("public");
    expect(bySlug.get("dpa")?.visibility).toBe("public");
  });

  it("creates metadata-only drafts that cannot be accepted or treated as approved", () => {
    for (const seed of LAUNCH_DRAFT_SEEDS) {
      const payload = toLaunchDraftPayload(seed);
      expect(payload.kind).toBe("policy");
      expect(payload.visibility).toBe(seed.visibility);
      expect(payload.title.en).toMatch(/DRAFT|BROUILLON/);
      expect(payload.title.fr).toMatch(/DRAFT|BROUILLON/);
      expect(payload.content).toBeUndefined();
      expect(payload.humanApproved).toBe(false);
      expect(payload.requiresAcceptance).toBe(false);
      expect(payload.required).toBe(false);
    }
  });
});
