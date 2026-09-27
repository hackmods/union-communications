import { describe, expect, it } from "vitest";
import { subprocessorFieldsSchema } from "@/lib/site-admin/subprocessor-validation";

const validProvider = {
  serviceName: "Verified provider",
  purpose: { en: "Transactional email delivery", fr: "Envoi de courriels transactionnels" },
  dataCategories: { en: ["account email"], fr: ["courriel du compte"] },
  dataSubjects: { en: ["account holders"], fr: ["titulaires de compte"] },
  processingRegion: "Canada",
  transferStatus: "within_canada",
  effectiveFrom: "2026-01-01",
  effectiveTo: null,
  publicNotes: { en: "", fr: "" },
  internalNotes: "Provider configuration checked on host",
  verificationEvidence: "Deployment setting and provider console reviewed",
};

describe("subprocessor record validation", () => {
  it("accepts bounded records with a valid open-ended effective period", () => {
    expect(subprocessorFieldsSchema.safeParse(validProvider).success).toBe(true);
  });

  it("rejects empty data inventories and reversed effective periods", () => {
    expect(subprocessorFieldsSchema.safeParse({ ...validProvider, dataCategories: { en: [], fr: [] } }).success).toBe(false);
    expect(subprocessorFieldsSchema.safeParse({ ...validProvider, purpose: { en: "English only", fr: " " } }).success).toBe(false);
    expect(subprocessorFieldsSchema.safeParse({ ...validProvider, verificationEvidence: "" }).success).toBe(false);
    expect(subprocessorFieldsSchema.safeParse({
      ...validProvider,
      effectiveTo: "2025-12-31",
    }).success).toBe(false);
  });

  it("rejects unknown fields so internal or review state cannot be set through the record API", () => {
    expect(subprocessorFieldsSchema.safeParse({
      ...validProvider,
      reviewStatus: "approved",
      publicDisclosureApproved: true,
    }).success).toBe(false);
  });
});
